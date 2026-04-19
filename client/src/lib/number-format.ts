/**
 * Sayı format yardımcıları — SPA tarafında TR locale gösterim + backend
 * `BudgetTracker.Application.Reconciliation.Import.NumberFormatDetector`
 * ile birebir uyumlu parse semantiği.
 *
 * Format fonksiyonları (UI tarafı) `tr-TR` locale kullanır: binlik `.`
 * ondalık `,`. Parse fonksiyonları hem TR (`1.234,56`) hem EN (`1,234.56`)
 * girdilerini tolere eder ve ek olarak para birimi sembollerini + accounting
 * negatif parantezini temizler.
 *
 * **Domain anlaşması:** parse semantiği backend ile aynı olmak zorunda;
 * mutabakat (reconciliation) modülünde aynı dosyanın hem SPA'da preview hem
 * server'da persist tarafında parse edilmesi mümkün. Davranış sapması cell
 * değer farkına yol açar — `number-format.test.ts` içindeki vakalar
 * backend `NumberFormatDetectorTests.cs` ile eşleştirilmiştir.
 */

const CURRENCY_SYMBOLS = ['₺', 'TL', 'TRY', 'USD', 'EUR', '$', '€', '£']

export function formatAmount(value: number): string {
  return value.toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

export function formatCompactAmount(value: number): string {
  const millions = value / 1_000_000

  if (Math.abs(millions) >= 10) {
    return `${formatAmount(millions)}M`
  }

  if (Math.abs(millions) >= 1) {
    return `${millions.toLocaleString('tr-TR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}M`
  }

  const thousands = value / 1_000
  if (Math.abs(thousands) >= 1) {
    return `${formatAmount(thousands)}K`
  }

  return formatAmount(value)
}

export function formatPercent(value: number, digits = 0): string {
  return `%${value.toLocaleString('tr-TR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`
}

export function formatSignedPercent(value: number, digits = 0): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toLocaleString('tr-TR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`
}

export function formatPrice(value: number, currencyCode?: string): string {
  const formatted = value.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })
  return currencyCode ? `${formatted} ${currencyCode}` : formatted
}

/**
 * TR/EN tolerance ile sayı parse. Backend `NumberFormatDetector.Parse` mirror'ı.
 * Başarısız parse: `null` döner (exception fırlatmaz). Çağıranın null
 * kontrolü yapması gerekir.
 *
 * Desteklenen varyasyonlar:
 * - `1234.56`, `1234,56` (saf ondalık)
 * - `1.234,56`, `1,234.56` (binlik + ondalık)
 * - `(123,45)` accounting negatif → -123.45
 * - `-1.234,50`, `1.234,50 TL`, `₺1.234,50` (sembol/prefix temizliği)
 *
 * Bilinen ambiguity: tek ayraç + tam 3 hane (`1.234`) binlik kabul edilir
 * (= 1234). Backend ile aynı varsayım.
 */
export function parseNumberOrNull(input: string | null | undefined): number | null {
  if (input === null || input === undefined) return null
  const raw = String(input).trim()
  if (raw.length === 0) return null

  let working = raw
  let isNegative = false

  if (working.startsWith('(') && working.endsWith(')')) {
    isNegative = true
    working = working.slice(1, -1).trim()
  }
  if (working.startsWith('-')) {
    isNegative = true
    working = working.slice(1).trim()
  }

  for (const sym of CURRENCY_SYMBOLS) {
    while (working.toUpperCase().includes(sym.toUpperCase())) {
      const idx = working.toUpperCase().indexOf(sym.toUpperCase())
      working = working.slice(0, idx) + working.slice(idx + sym.length)
    }
  }
  working = working.replace(/\s+/g, '')

  if (working.length === 0) return null

  const canonical = normalizeToInvariant(working)
  if (!/^\d+(\.\d+)?$/.test(canonical)) return null

  const value = Number(canonical)
  if (!Number.isFinite(value)) return null

  return isNegative ? -value : value
}

/**
 * `parseNumberOrNull` ile aynı; başarısız parse'ta `FormatException` benzeri
 * hata fırlatır. Backend `NumberFormatDetector.Parse` davranışını çağıran
 * tarafa şeffaf yansıtmak isteyenler için.
 */
export function parseNumber(input: string | null | undefined): number {
  const result = parseNumberOrNull(input)
  if (result === null) {
    throw new Error(`unable to parse number: '${input ?? ''}'`)
  }
  return result
}

function normalizeToInvariant(trimmed: string): string {
  const hasDot = trimmed.includes('.')
  const hasComma = trimmed.includes(',')

  if (hasDot && hasComma) {
    const lastDot = trimmed.lastIndexOf('.')
    const lastComma = trimmed.lastIndexOf(',')
    if (lastComma > lastDot) {
      return trimmed.replaceAll('.', '').replace(',', '.')
    }
    return trimmed.replaceAll(',', '')
  }

  if (hasComma) {
    const lastComma = trimmed.lastIndexOf(',')
    const afterComma = trimmed.length - lastComma - 1
    const beforeIsDigitsOrComma = /^[\d,]+$/.test(trimmed.slice(0, lastComma))
    if (afterComma === 3 && beforeIsDigitsOrComma) {
      return trimmed.replaceAll(',', '')
    }
    return trimmed.replace(',', '.')
  }

  if (hasDot) {
    const lastDot = trimmed.lastIndexOf('.')
    const afterDot = trimmed.length - lastDot - 1
    const dotCount = (trimmed.match(/\./g) ?? []).length
    const beforeIsDigits = /^\d+$/.test(trimmed.slice(0, lastDot))
    if (afterDot === 3 && dotCount === 1 && beforeIsDigits) {
      return trimmed.replaceAll('.', '')
    }
    return trimmed
  }

  return trimmed
}
