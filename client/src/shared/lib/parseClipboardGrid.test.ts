import { describe, it, expect } from 'vitest'
import {
  parseClipboardGrid,
  NON_CONTIGUOUS_WARNING,
  PAYLOAD_TOO_LARGE_WARNING,
  MAX_PASTE_ROWS,
  MAX_PASTE_COLS,
} from './parseClipboardGrid'
import tr from '../i18n/tr.json'

describe('parseClipboardGrid', () => {
  // ADR-0009 §2.4 — the 10 scenarios useClipboardRange must cover.
  // Each numbered comment maps to the scenario list in the PR description.

  it('1. empty input returns empty grid', () => {
    const result = parseClipboardGrid('')
    expect(result.values).toEqual([])
    expect(result.isNonContiguous).toBe(false)
    expect(result.warning).toBeNull()
  })

  it('2. single cell (TR number)', () => {
    const result = parseClipboardGrid('100')
    expect(result.values).toEqual([[100]])
    expect(result.isNonContiguous).toBe(false)
  })

  it('3. contiguous rectangular range — tabs and newlines', () => {
    const result = parseClipboardGrid('100\t200\n300\t400')
    expect(result.values).toEqual([
      [100, 200],
      [300, 400],
    ])
    expect(result.isNonContiguous).toBe(false)
  })

  it('4. single-column range (newlines only)', () => {
    const result = parseClipboardGrid('100\n200\n300')
    expect(result.values).toEqual([[100], [200], [300]])
  })

  it('5. external clipboard (Excel CRLF) normalised to LF', () => {
    const result = parseClipboardGrid('100\t200\r\n300\t400\r\n')
    expect(result.values).toEqual([
      [100, 200],
      [300, 400],
    ])
  })

  it('6. TR locale decimal (1.234,56 preserves thousand semantic)', () => {
    // Banking precision — ADR-0009 §2.5 / ince ayar #2.
    const result = parseClipboardGrid('1.234,56\t2.000,00\n3.000,50\t0,75')
    expect(result.values).toEqual([
      [1234.56, 2000],
      [3000.5, 0.75],
    ])
  })

  it('7. invalid cells become null, valid cells still parse', () => {
    const result = parseClipboardGrid('abc\t100\n200\txyz')
    expect(result.values).toEqual([
      [null, 100],
      [200, null],
    ])
  })

  it('8. non-contiguous (empty row between blocks) collapses + warns', () => {
    // INCE AYAR #1: Excel Ctrl+click multi-range → one contiguous block +
    // user-visible toast. No silent paste.
    const result = parseClipboardGrid('100\t200\n\n300\t400')
    expect(result.values).toEqual([
      [100, 200],
      [300, 400],
    ])
    expect(result.isNonContiguous).toBe(true)
    expect(result.warning).toBe(NON_CONTIGUOUS_WARNING)
  })

  it('9. non-contiguous with CRLF empty row detects correctly', () => {
    const result = parseClipboardGrid('100\r\n\r\n200\r\n')
    expect(result.values).toEqual([[100], [200]])
    expect(result.isNonContiguous).toBe(true)
  })

  it('10. trailing Excel newline is stripped, no false non-contiguous flag', () => {
    const result = parseClipboardGrid('100\t200\n')
    expect(result.values).toEqual([[100, 200]])
    expect(result.isNonContiguous).toBe(false)
  })

  it('negative numbers, zero, and mixed-sign TR formats survive the round-trip', () => {
    // parseTrNumber normalises -0 → 0 at the cell level (see unit tests).
    const result = parseClipboardGrid('-1.000,00\t0,00\n-0,50\t1.234,56')
    expect(result.values).toEqual([
      [-1000, 0],
      [-0.5, 1234.56],
    ])
  })

  it('rejects en-US locale numbers by returning null (no silent misparse)', () => {
    // "1,234.56" is the classic en-US form; banking precision requires that we
    // flag it rather than interpret the comma as a decimal.
    const result = parseClipboardGrid('1,234.56')
    expect(result.values).toEqual([[null]])
  })

  describe('DoS guard (F4 Part 1 security-reviewer MEDIUM)', () => {
    it('caps at MAX_PASTE_ROWS and flags the truncation', () => {
      const rows = Array.from({ length: MAX_PASTE_ROWS + 5 }, (_, i) =>
        String(i + 1),
      ).join('\n')

      const result = parseClipboardGrid(rows)

      expect(result.values.length).toBe(MAX_PASTE_ROWS)
      expect(result.warning).toBe(PAYLOAD_TOO_LARGE_WARNING)
    })

    it('caps at MAX_PASTE_COLS per row and flags the truncation', () => {
      const row = Array.from({ length: MAX_PASTE_COLS + 3 }, (_, i) =>
        String(i + 1),
      ).join('\t')

      const result = parseClipboardGrid(row)

      expect(result.values[0]?.length).toBe(MAX_PASTE_COLS)
      expect(result.warning).toBe(PAYLOAD_TOO_LARGE_WARNING)
    })

    it('a right-sized payload still runs without triggering the guard', () => {
      // Realistic budget-entry upper bound: 14 columns × 1000 rows. Neither
      // limit should trigger.
      const rows = Array.from({ length: 1_000 }, () =>
        Array.from({ length: 14 }, () => '100').join('\t'),
      ).join('\n')

      const result = parseClipboardGrid(rows)

      expect(result.values.length).toBe(1_000)
      expect(result.values[0]?.length).toBe(14)
      expect(result.warning).toBeNull()
    })
  })

  describe('i18n parity (F4 typescript-reviewer MEDIUM)', () => {
    // The toast literals in this file and the clipboard.* entries in tr.json
    // must stay in lockstep — the lint-time review flagged that two sources
    // of the same string can drift silently.
    it('NON_CONTIGUOUS_WARNING matches tr.json clipboard.nonContiguousWarning', () => {
      expect(NON_CONTIGUOUS_WARNING).toBe(tr.clipboard.nonContiguousWarning)
    })
  })
})
