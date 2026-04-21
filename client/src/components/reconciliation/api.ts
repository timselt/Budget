import api from '../../lib/api'

/**
 * Mutabakat batch API client (Sprint 1, spec §3).
 * Backend: src/BudgetTracker.Api/Controllers/ReconciliationBatchesController.cs
 */

export type ReconciliationFlow = 'Insurance' | 'Automotive' | 'Filo' | 'Alternatif'

export type ReconciliationBatchStatus = 'Draft' | 'Parsed' | 'Mapped' | 'Archived'

export type ReconciliationSourceType = 'InsurerList' | 'TarsPowerBi' | 'ManualCsv'

export interface BatchSummary {
  id: number
  flow: ReconciliationFlow
  periodCode: string
  sourceType: ReconciliationSourceType
  sourceFileName: string
  rowCount: number
  status: ReconciliationBatchStatus
  importedAt: string
  importedByUserId: number
  notes: string | null
}

export interface BatchDetail extends BatchSummary {
  sourceFileHash: string
  okCount: number
  warningCount: number
  errorCount: number
  truncated: boolean
}

export interface BatchListFilters {
  flow?: ReconciliationFlow
  periodCode?: string
  status?: ReconciliationBatchStatus
}

export async function listBatches(filters: BatchListFilters = {}): Promise<BatchSummary[]> {
  const params = new URLSearchParams()
  if (filters.flow) params.set('flow', filters.flow)
  if (filters.periodCode) params.set('period_code', filters.periodCode)
  if (filters.status) params.set('status', filters.status)
  const q = params.size > 0 ? `?${params}` : ''
  const { data } = await api.get<BatchSummary[]>(`/reconciliation/batches${q}`)
  return data
}

export async function getBatchById(id: number): Promise<BatchDetail> {
  const { data } = await api.get<BatchDetail>(`/reconciliation/batches/${id}`)
  return data
}

export interface UploadBatchPayload {
  file: File
  flow: ReconciliationFlow
  periodCode: string
  sourceType: ReconciliationSourceType
  notes?: string
}

export async function uploadBatch(payload: UploadBatchPayload): Promise<BatchDetail> {
  const form = new FormData()
  form.append('File', payload.file)
  form.append('Flow', payload.flow)
  form.append('PeriodCode', payload.periodCode)
  form.append('SourceType', payload.sourceType)
  if (payload.notes) form.append('Notes', payload.notes)

  const { data } = await api.post<BatchDetail>('/reconciliation/batches', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function deleteDraftBatch(id: number): Promise<void> {
  await api.delete(`/reconciliation/batches/${id}`)
}

// --- Sprint 2 Task 7 — Cases API ---

export type ReconciliationCaseStatus =
  | 'Draft'
  | 'UnderControl'
  | 'PricingMatched'
  | 'SentToCustomer'
  | 'CustomerApproved'
  | 'CustomerDisputed'
  | 'ReadyForAccounting'
  | 'SentToAccounting'

export type ReconciliationLineStatus =
  | 'PendingReview'
  | 'PricingMismatch'
  | 'Ready'
  | 'Disputed'
  | 'Rejected'

export type DisputeReasonCode =
  | 'PriceMismatch'
  | 'QtyMismatch'
  | 'PkgNotInContract'
  | 'ServiceNotRendered'
  | 'Duplicate'
  | 'PolicyCancelled'
  | 'PeriodMismatch'
  | 'Other'

export interface CaseSummary {
  id: number
  flow: ReconciliationFlow
  periodCode: string
  customerId: number
  customerCode: string
  customerName: string
  contractId: number | null
  status: ReconciliationCaseStatus
  ownerUserId: number
  openedAt: string
  lineCount: number
  totalAmount: number
  currencyCode: string
}

export interface CaseLine {
  id: number
  caseId: number
  sourceRowId: number
  productCode: string
  productName: string
  quantity: number
  unitPrice: number
  amount: number
  currencyCode: string
  priceSourceRef: string
  status: ReconciliationLineStatus
  disputeReasonCode: DisputeReasonCode | null
  disputeNote: string | null
}

export interface CaseDetail extends Omit<CaseSummary, 'lineCount'> {
  sentToCustomerAt: string | null
  customerResponseAt: string | null
  sentToAccountingAt: string | null
  notes: string | null
  lines: CaseLine[]
}

export interface CaseListFilters {
  flow?: ReconciliationFlow
  periodCode?: string
  status?: ReconciliationCaseStatus
  customerId?: number
  ownerUserId?: number
  batchId?: number
}

export async function listCases(filters: CaseListFilters = {}): Promise<CaseSummary[]> {
  const params = new URLSearchParams()
  if (filters.flow) params.set('flow', filters.flow)
  if (filters.periodCode) params.set('period_code', filters.periodCode)
  if (filters.status) params.set('status', filters.status)
  if (filters.customerId) params.set('customer_id', String(filters.customerId))
  if (filters.ownerUserId) params.set('owner_user_id', String(filters.ownerUserId))
  if (filters.batchId) params.set('batch_id', String(filters.batchId))
  const q = params.size > 0 ? `?${params}` : ''
  const { data } = await api.get<CaseSummary[]>(`/reconciliation/cases${q}`)
  return data
}

export async function getCaseById(id: number): Promise<CaseDetail> {
  const { data } = await api.get<CaseDetail>(`/reconciliation/cases/${id}`)
  return data
}

export async function assignCaseOwner(caseId: number, userId: number): Promise<CaseDetail> {
  const { data } = await api.post<CaseDetail>(
    `/reconciliation/cases/${caseId}/assign-owner`,
    { userId },
  )
  return data
}

export async function updateLine(
  lineId: number,
  payload: { quantity?: number; unitPrice?: number; note?: string },
): Promise<CaseLine> {
  const { data } = await api.patch<CaseLine>(`/reconciliation/lines/${lineId}`, payload)
  return data
}

export async function markLineReady(lineId: number): Promise<CaseLine> {
  const { data } = await api.post<CaseLine>(`/reconciliation/lines/${lineId}/ready`)
  return data
}

// --- Sprint 2 Task 8 — Unmatched customers ---

export interface UnmatchedCustomerRef {
  externalCustomerRef: string
  rowCount: number
  sampleDocumentRefs: string[]
}

export interface LinkUnmatchedCustomerResult {
  customerId: number
  externalCustomerRef: string
  newCasesCreated: number
  newLinesCreated: number
}

export async function listUnmatchedCustomers(batchId: number): Promise<UnmatchedCustomerRef[]> {
  const { data } = await api.get<UnmatchedCustomerRef[]>(
    `/reconciliation/batches/${batchId}/unmatched-customers`,
  )
  return data
}

export async function linkUnmatchedCustomer(
  batchId: number,
  externalRef: string,
  customerId: number,
): Promise<LinkUnmatchedCustomerResult> {
  const { data } = await api.post<LinkUnmatchedCustomerResult>(
    `/reconciliation/batches/${batchId}/unmatched-customers/${encodeURIComponent(externalRef)}/link`,
    { customerId },
  )
  return data
}
