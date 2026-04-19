import type { RowValues } from './types'
import {
  formatAmount as formatAmountValue,
  formatCompactAmount,
} from '../../lib/number-format'

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
  return formatAmountValue(value)
}

export function formatCompact(value: number): string {
  return formatCompactAmount(value)
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
