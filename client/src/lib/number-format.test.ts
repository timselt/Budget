import { describe, expect, it } from 'vitest'
import {
  formatAmount,
  formatCompactAmount,
  formatPercent,
  formatPrice,
  formatSignedPercent,
  parseNumber,
  parseNumberOrNull,
} from './number-format'

/**
 * Backend `NumberFormatDetectorTests.cs` ile birebir senkron senaryolar.
 * Eklenen tüm yeni vakalar her iki tarafta da güncellenmelidir.
 */
describe('parseNumberOrNull — TR/EN tolerance', () => {
  it('parses EN decimal (1234.56)', () => {
    expect(parseNumberOrNull('1234.56')).toBe(1234.56)
  })

  it('parses TR decimal (1234,56)', () => {
    expect(parseNumberOrNull('1234,56')).toBe(1234.56)
  })

  it('parses TR thousands + decimal (1.234,56)', () => {
    expect(parseNumberOrNull('1.234,56')).toBe(1234.56)
  })

  it('parses EN thousands + decimal (1,234.56)', () => {
    expect(parseNumberOrNull('1,234.56')).toBe(1234.56)
  })

  it('parses pure integer (1234)', () => {
    expect(parseNumberOrNull('1234')).toBe(1234)
  })

  it('parses accounting negative parens — (123,45)', () => {
    expect(parseNumberOrNull('(123,45)')).toBe(-123.45)
  })

  it('parses TR negative with sign (-1.234,50)', () => {
    expect(parseNumberOrNull('-1.234,50')).toBe(-1234.5)
  })

  it('strips currency prefix (₺ 1.234,50) and suffix (1.234,50 TL)', () => {
    expect(parseNumberOrNull('₺ 1.234,50')).toBe(1234.5)
    expect(parseNumberOrNull('1.234,50 TL')).toBe(1234.5)
  })

  it('treats single-dot 3-digit group as thousands (1.234 → 1234)', () => {
    // Backend ambiguity convention — TR finansal raporlar 3 haneli grubu
    // binlik için kullanır; detector aynısını varsayar.
    expect(parseNumberOrNull('1.234')).toBe(1234)
  })

  it('returns null on null/undefined/empty/whitespace', () => {
    expect(parseNumberOrNull(null)).toBeNull()
    expect(parseNumberOrNull(undefined)).toBeNull()
    expect(parseNumberOrNull('')).toBeNull()
    expect(parseNumberOrNull('   ')).toBeNull()
  })

  it('returns null on non-numeric junk', () => {
    expect(parseNumberOrNull('abc')).toBeNull()
    expect(parseNumberOrNull('12abc34')).toBeNull()
  })
})

describe('parseNumber — throwing variant', () => {
  it('throws on unparseable input', () => {
    expect(() => parseNumber('not-a-number')).toThrow(/unable to parse/)
  })

  it('returns parsed value on success', () => {
    expect(parseNumber('1.234,56')).toBe(1234.56)
  })
})

describe('format helpers — TR locale', () => {
  it('formatAmount uses TR thousand separator (1234567 → "1.234.567")', () => {
    expect(formatAmount(1234567)).toBe('1.234.567')
  })

  it('formatCompactAmount switches K/M dynamically', () => {
    expect(formatCompactAmount(500)).toBe('500')
    expect(formatCompactAmount(2_500)).toBe('3K') // 2.5K → integer-rounded thousands
    expect(formatCompactAmount(2_500_000)).toBe('2,5M')
    expect(formatCompactAmount(15_000_000)).toBe('15M')
  })

  it('formatPercent prefixes %', () => {
    expect(formatPercent(42)).toBe('%42')
    expect(formatPercent(42.5, 1)).toBe('%42,5')
  })

  it('formatSignedPercent prefixes + for non-negative', () => {
    expect(formatSignedPercent(5)).toBe('+5%')
    expect(formatSignedPercent(-5)).toBe('-5%')
    expect(formatSignedPercent(0)).toBe('+0%')
  })

  it('formatPrice formats with 2 fraction min and optional currency', () => {
    expect(formatPrice(1234.5)).toBe('1.234,50')
    expect(formatPrice(1234.5, 'TRY')).toBe('1.234,50 TRY')
  })
})

describe('parse → format round-trip (TR locale)', () => {
  it('preserves value through parse → formatPrice', () => {
    const parsed = parseNumberOrNull('1.234,56')
    expect(parsed).not.toBeNull()
    expect(formatPrice(parsed!, 'TRY')).toBe('1.234,56 TRY')
  })
})
