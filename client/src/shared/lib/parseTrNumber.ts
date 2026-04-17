/**
 * TR locale decimal parser (ADR-0009 §2.5 / F4 ince ayar #2).
 *
 * Banking precision requires that the canonical Turkish number format
 * `1.234,56` — dot thousand separator, comma decimal separator — round-trips
 * to the JavaScript number `1234.56`. `parseFloat("1.234")` alone yields
 * `1.234`, which would silently corrupt a budget entry by three orders of
 * magnitude. This helper normalises the string before delegating to `Number`
 * and returns `null` (never `NaN`) when the input cannot be interpreted as a
 * valid TR-formatted decimal.
 *
 * Examples:
 *   parseTrNumber("1.234,56")   → 1234.56
 *   parseTrNumber("0,50")       → 0.50
 *   parseTrNumber("-1.000,00")  → -1000
 *   parseTrNumber("3,14")       → 3.14
 *   parseTrNumber("abc")        → null
 *   parseTrNumber("")           → null
 *   parseTrNumber("1,234.56")   → null  (en-US format rejected)
 */
export function parseTrNumber(input: string | null | undefined): number | null {
  if (input === null || input === undefined) return null

  const trimmed = input.trim()
  if (trimmed.length === 0) return null

  // TR format: optional leading minus, integer part in one of two shapes —
  //   (a) explicit thousand-separated groups: 1–3 digits, then 1+ ".ddd" groups
  //   (b) plain digits (user may omit thousand separators: "1000,5")
  // — followed by an optional ",ddd+" fractional part.
  //
  // Accept:
  //   "1"   "1,5"   "-1,5"   "1000,5"   "1.234,56"
  //   "1.234.567"   "1.234.567,89"
  // Reject:
  //   "1,234.56"  (en-US format — comma used as thousands sep)
  //   "1,234,567" (en-US thousands)
  //   "1.23,456"  (grouped pattern requires exactly 3 digits per group)
  //   "1..234,5"  (doubled separator)
  const trPattern = /^-?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?$/

  if (!trPattern.test(trimmed)) return null

  const normalised = trimmed
    .replace(/\./g, '') // strip thousand separators
    .replace(',', '.')   // promote decimal comma to a dot

  const parsed = Number(normalised)
  return Number.isFinite(parsed) ? parsed : null
}
