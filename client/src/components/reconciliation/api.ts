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
