import api from '../../lib/api'
import type {
  BudgetEntryRow,
  BudgetEntryUpsert,
  BudgetTree,
  BudgetVersionRow,
  BudgetYearRow,
  CustomerBudgetSummary,
  CustomerRow,
  ScenarioRow,
} from './types'

export async function getYears(): Promise<BudgetYearRow[]> {
  const { data } = await api.get<BudgetYearRow[]>('/budget/years')
  return data
}

export async function getVersions(yearId: number): Promise<BudgetVersionRow[]> {
  const { data } = await api.get<BudgetVersionRow[]>(`/budget/years/${yearId}/versions`)
  return data
}

export async function getScenarios(): Promise<ScenarioRow[]> {
  const { data } = await api.get<ScenarioRow[]>('/scenarios')
  return data
}

export async function getCustomers(): Promise<CustomerRow[]> {
  const { data } = await api.get<CustomerRow[]>('/customers')
  return data
}

export async function getEntries(versionId: number): Promise<BudgetEntryRow[]> {
  const { data } = await api.get<BudgetEntryRow[]>(`/budget/versions/${versionId}/entries`)
  return data
}

/**
 * Müşterinin aktif sözleşmelerini (kontratlar) çeker. BudgetEntryPage grid
 * satırları için. ADR-0014: contract başına bir satır.
 */
export interface CustomerContractRow {
  id: number
  customerId: number
  productId: number
  productName: string
  productCode: string
  contractCode: string
  isActive: boolean
}

export async function getCustomerContracts(
  customerId: number,
): Promise<CustomerContractRow[]> {
  const { data } = await api.get<CustomerContractRow[]>(
    `/contracts?customerId=${customerId}`,
  )
  return data
}

export async function getTree(versionId: number): Promise<BudgetTree> {
  const { data } = await api.get<BudgetTree>(`/budget/versions/${versionId}/tree`)
  return data
}

export async function getCustomerSummary(
  versionId: number,
  customerId: number,
): Promise<CustomerBudgetSummary> {
  const { data } = await api.get<CustomerBudgetSummary>(
    `/budget/versions/${versionId}/customers/${customerId}/summary`,
  )
  return data
}

export async function bulkUpsertEntries(
  versionId: number,
  entries: BudgetEntryUpsert[],
): Promise<void> {
  if (entries.length === 0) return
  await api.put(`/budget/versions/${versionId}/entries/bulk`, { entries })
}

export async function deleteEntry(versionId: number, entryId: number): Promise<void> {
  await api.delete(`/budget/versions/${versionId}/entries/${entryId}`)
}

/**
 * OPEX gider satırlarını çeker — useSubmissionChecklist OPEX kuralı için.
 * Backend route `/api/v1/expenses/{yearId}/entries?versionId=X` ikisini de ister.
 */
export interface ExpenseEntryRow {
  id: number
  expenseCategoryId: number
  amountOriginal: number
  currencyCode: string
  month: number
}

export async function getExpenseEntries(
  yearId: number,
  versionId: number,
): Promise<ExpenseEntryRow[]> {
  const { data } = await api.get<ExpenseEntryRow[]>(
    `/expenses/${yearId}/entries?versionId=${versionId}`,
  )
  return data
}

/** Draft | Rejected → PendingFinance (RejectionReason backend'de temizlenir). */
export async function submitVersion(versionId: number): Promise<BudgetVersionRow> {
  const { data } = await api.post<BudgetVersionRow>(
    `/budget/versions/${versionId}/submit`,
  )
  return data
}

/** PendingFinance → PendingCfo. */
export async function approveFinance(versionId: number): Promise<BudgetVersionRow> {
  const { data } = await api.post<BudgetVersionRow>(
    `/budget/versions/${versionId}/approve-finance`,
  )
  return data
}

/** PendingCfo → Active (atomic — eski Active varsa Archived olur). */
export async function approveCfoAndActivate(
  versionId: number,
): Promise<BudgetVersionRow> {
  const { data } = await api.post<BudgetVersionRow>(
    `/budget/versions/${versionId}/approve-cfo-activate`,
  )
  return data
}

/** PendingFinance | PendingCfo → Rejected (sebep zorunlu). */
export async function rejectVersion(
  versionId: number,
  reason: string,
): Promise<BudgetVersionRow> {
  const { data } = await api.post<BudgetVersionRow>(
    `/budget/versions/${versionId}/reject`,
    { reason },
  )
  return data
}

/** Active → Archived. */
export async function archiveVersion(versionId: number): Promise<BudgetVersionRow> {
  const { data } = await api.post<BudgetVersionRow>(
    `/budget/versions/${versionId}/archive`,
  )
  return data
}

/** Active versiyondan revizyon taslağı açar (entry'ler kopyalanır). */
export async function createRevision(versionId: number): Promise<BudgetVersionRow> {
  const { data } = await api.post<BudgetVersionRow>(
    `/budget/versions/${versionId}/create-revision`,
  )
  return data
}

export interface CreateVersionPayload {
  name: string
}

/** Yıl içinde ilk taslak (yıl boş olduğunda kullanılır). */
export async function createVersion(
  yearId: number,
  payload: CreateVersionPayload,
): Promise<BudgetVersionRow> {
  const { data } = await api.post<BudgetVersionRow>(
    `/budget/years/${yearId}/versions`,
    payload,
  )
  return data
}

export interface CopyFromYearPayload {
  sourceBudgetYearId: number
  customerId?: number | null
  productId?: number | null
}

export interface CopyFromYearResult {
  copiedEntryCount: number
  overwrittenEntryCount: number
  revenueTotalTry: number
  claimTotalTry: number
}

export async function copyFromYear(
  versionId: number,
  payload: CopyFromYearPayload,
): Promise<CopyFromYearResult> {
  const { data } = await api.post<CopyFromYearResult>(
    `/budget/versions/${versionId}/copy-from-year`,
    payload,
  )
  return data
}

export interface GrowByPercentPayload {
  percent: number
  customerId?: number | null
  productId?: number | null
}

export interface GrowByPercentResult {
  updatedEntryCount: number
  newRevenueTotalTry: number
  newClaimTotalTry: number
}

export async function growByPercent(
  versionId: number,
  payload: GrowByPercentPayload,
): Promise<GrowByPercentResult> {
  const { data } = await api.post<GrowByPercentResult>(
    `/budget/versions/${versionId}/grow-by-percent`,
    payload,
  )
  return data
}
