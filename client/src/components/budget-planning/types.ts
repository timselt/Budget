export type EntryType = 'REVENUE' | 'CLAIM'

export interface BudgetYearRow {
  id: number
  year: number
  isLocked: boolean
}

export interface BudgetVersionRow {
  id: number
  budgetYearId: number
  name: string
  status: string
  isActive: boolean
}

export interface ScenarioRow {
  id: number
  code: string
  name: string
}

export interface CustomerRow {
  id: number
  code: string
  name: string
  segmentId: number
  segmentName: string | null
  defaultCurrencyCode: string | null
  isActive: boolean
}

export interface BudgetEntryRow {
  id: number
  versionId: number
  customerId: number
  customerName: string | null
  month: number
  entryType: EntryType
  amountOriginal: number
  currencyCode: string
  amountTryFixed: number
  amountTrySpot: number
  contractId: number | null
  productId: number | null
}

export interface BudgetEntryUpsert {
  id: number | null
  customerId: number
  month: number
  entryType: EntryType
  amountOriginal: number
  currencyCode: string
  contractId?: number | null
  productId?: number | null
}

export interface BudgetTreeCustomer {
  customerId: number
  customerCode: string
  customerName: string
  segmentId: number
  activeContractCount: number
  revenueTotalTry: number
  claimTotalTry: number
  lossRatioPercent: number
  revenueMonthlyTry: number[]
  claimMonthlyTry: number[]
}

export interface BudgetTreeSegment {
  segmentId: number
  segmentCode: string
  segmentName: string
  revenueTotalTry: number
  claimTotalTry: number
  customers: BudgetTreeCustomer[]
}

export interface BudgetTreeOpex {
  expenseCategoryId: number
  categoryCode: string
  categoryName: string
  classification: string
  totalTry: number
  monthlyTry: number[]
}

export interface BudgetTree {
  versionId: number
  versionName: string
  versionStatus: string
  budgetYear: number
  revenueTotalTry: number
  claimTotalTry: number
  expenseTotalTry: number
  segments: BudgetTreeSegment[]
  opexCategories: BudgetTreeOpex[]
}

export interface CustomerBudgetSummary {
  customerId: number
  customerCode: string
  customerName: string
  activeContractCount: number
  revenueTotalTry: number
  claimTotalTry: number
  lossRatioPercent: number
}

export type TreeSelection =
  | { kind: 'customer'; customerId: number; segmentId: number }
  | { kind: 'opex'; expenseCategoryId: number }

export type BudgetMode = 'tree' | 'customer'

export type CellValue = { id: number | null; amount: string }
export type RowValues = Record<number, CellValue>

export const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
export const CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP'] as const
export const EDITABLE_STATUSES = new Set(['Draft', 'Rejected'])
