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
  | { kind: 'segment'; segmentId: number }
  | { kind: 'customer'; customerId: number; segmentId: number }
  | { kind: 'opex'; expenseCategoryId: number }

export type BudgetMode = 'tree' | 'customer'

export type CellValue = { id: number | null; amount: string }
export type RowValues = Record<number, CellValue>

export const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
export const CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP'] as const

// ADR-0015: 6-değer onay state machine (Submit edit eski 8 → 6).
// Backend artık PascalCase string serialize ediyor: 'Draft', 'PendingFinance',
// 'PendingCfo', 'Active', 'Rejected', 'Archived'.
export type BudgetVersionStatus =
  | 'Draft'
  | 'PendingFinance'
  | 'PendingCfo'
  | 'Active'
  | 'Rejected'
  | 'Archived'

/** Türkçe etiket sözlüğü — UI'da chip / banner başlığı vb. */
export const STATUS_LABELS: Record<BudgetVersionStatus, string> = {
  Draft: 'Taslak',
  PendingFinance: 'Finans Onayında',
  PendingCfo: 'CFO Onayında',
  Active: 'Yürürlükte',
  Rejected: 'Reddedildi',
  Archived: 'Arşiv',
}

/** Chip CSS class (finopstur.css'teki chip-* sınıfları). */
export const STATUS_CHIP_CLASS: Record<BudgetVersionStatus, string> = {
  Draft: 'chip-neutral',
  PendingFinance: 'chip-warning',
  PendingCfo: 'chip-warning',
  Active: 'chip-success',
  Rejected: 'chip-error',
  Archived: 'chip-neutral',
}

/** Düzenlenebilir statüler — entry CRUD için izin verilen tek iki durum. */
export const EDITABLE_STATUSES: ReadonlySet<BudgetVersionStatus> = new Set([
  'Draft',
  'Rejected',
])

export function isEditableStatus(status: string | null | undefined): boolean {
  if (!status) return false
  return EDITABLE_STATUSES.has(status as BudgetVersionStatus)
}

/** Tek-aktif-versiyon ile yıl başına tek "çalışılan taslak" invariant'ları
 *  için kullanılan kümeler. */
export const IN_PROGRESS_STATUSES: ReadonlySet<BudgetVersionStatus> = new Set([
  'Draft',
  'PendingFinance',
  'PendingCfo',
  'Rejected',
])

export function getStatusLabel(status: string | null | undefined): string {
  if (!status) return '—'
  return STATUS_LABELS[status as BudgetVersionStatus] ?? status
}

export function getStatusChipClass(status: string | null | undefined): string {
  if (!status) return 'chip-neutral'
  return STATUS_CHIP_CLASS[status as BudgetVersionStatus] ?? 'chip-neutral'
}
