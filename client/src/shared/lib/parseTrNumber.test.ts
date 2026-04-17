import { describe, it, expect } from 'vitest'
import { parseTrNumber } from './parseTrNumber'

describe('parseTrNumber', () => {
  describe('canonical TR format', () => {
    it.each([
      ['1.234,56', 1234.56],
      ['0,50', 0.5],
      ['-1.000,00', -1000],
      ['3,14', 3.14],
      ['1', 1],
      ['-1', -1],
      ['1000,5', 1000.5],
      ['1.234.567', 1_234_567],
      ['1.234.567,89', 1_234_567.89],
    ])('parses %s → %s', (input, expected) => {
      expect(parseTrNumber(input)).toBe(expected)
    })
  })

  describe('banking precision guard (the reason this helper exists)', () => {
    // parseFloat("1.234") alone yields 1.234, not 1234. ADR-0009 §2.5
    // specifically calls this out as the failure mode we must not regress on.
    it('preserves the thousand-separator semantic for "1.234,56"', () => {
      expect(parseTrNumber('1.234,56')).toBe(1234.56)
    })

    it('does not parse as plain floating-point', () => {
      expect(parseTrNumber('1.234,56')).not.toBe(1.234)
    })
  })

  describe('rejects non-TR and malformed inputs', () => {
    it.each([
      'abc',
      '',
      '1,234.56', // en-US format
      '1.234,56,78', // two commas
      '1..234,5',  // doubled dot
      '1,234,567', // commas as thousands (en-US semantic)
      '1.23,456',  // thousand group must be exactly 3 digits
      '1.2345,6',  // thousand group wrong width
      ' ',
      null,
      undefined,
    ])('rejects %s', (input) => {
      expect(parseTrNumber(input as string | null | undefined)).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('trims surrounding whitespace', () => {
      expect(parseTrNumber('  1.234,56  ')).toBe(1234.56)
    })

    it('handles leading zero in fractional part', () => {
      expect(parseTrNumber('0,05')).toBe(0.05)
    })

    it('handles negative zero-ish input', () => {
      expect(parseTrNumber('-0,00')).toBe(-0)
    })
  })
})
