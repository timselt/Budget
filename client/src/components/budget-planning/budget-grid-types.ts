/**
 * Müşteri bazlı bütçe girişi — kontrat başına ayrı satır.
 * ADR-0014: her aktif kontrat (müşteri × ürün) için 12 aylık revenue + claim
 * input'u. Kontrat yoksa tek fallback "Müşteri Toplam" satırı.
 */

export type EntryKind = 'REVENUE' | 'CLAIM'

export interface CellId {
  contractId: number | null // null = fallback "Müşteri Toplam"
  kind: EntryKind
  month: number
}

export interface CellValue {
  id: number | null // BudgetEntry.Id (mevcut kayıt için)
  amount: string
}

export interface ContractRow {
  contractId: number
  productName: string
  productCode: string
  contractCode: string
}

export type GridValues = Record<string, CellValue> // key = `${contractId|fb}:${kind}:${month}`

export function cellKey(c: CellId): string {
  return `${c.contractId ?? 'fb'}:${c.kind}:${c.month}`
}
