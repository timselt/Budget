import { describe, it, expect } from 'vitest'
import {
  parseClipboardGrid,
  NON_CONTIGUOUS_WARNING,
} from './parseClipboardGrid'

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
})
