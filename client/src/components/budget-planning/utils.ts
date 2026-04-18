import type { RowValues } from './types'

export function emptyRow(): RowValues {
  const r: RowValues = {}
  for (let m = 1; m <= 12; m += 1) r[m] = { id: null, amount: '' }
  return r
}

export function toNumber(input: string): number {
  if (!input.trim()) return 0
  const parsed = Number(input.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

export function formatAmount(value: number): string {
  return value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatCompact(value: number): string {
  const millions = value / 1_000_000
  if (Math.abs(millions) >= 1) {
    return `${millions.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`
  }
  const thousands = value / 1_000
  return `${thousands.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}K`
}

export function sum(values: readonly number[]): number {
  return values.reduce((acc, v) => acc + v, 0)
}

export function lossRatioPercent(revenue: number, claim: number): number {
  if (revenue === 0) return 0
  return (claim / revenue) * 100
}

export function marginPercent(revenue: number, claim: number): number {
  if (revenue === 0) return 0
  return ((revenue - claim) / revenue) * 100
}
