import { useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef } from 'ag-grid-community'
import { PageIntro } from '../components/shared/PageIntro'
import { showToast } from '../components/shared/toast-bus'
import {
  getCaseById,
  assignCaseOwner,
  updateLine,
  markLineReady,
  type CaseLine,
  type ReconciliationLineStatus,
} from '../components/reconciliation/api'

/**
 * Sprint 2 Task 11 — Case Detay + Lines Grid (S6).
 * AG-Grid inline edit (quantity/unitPrice). Row action: "Ready" (PricingMismatch → Ready).
 * State geçişi butonları: Sahibi Üstlen, Müşteriye Gönder (Sprint 3'te aktif).
 */
export function ReconciliationCaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const caseId = id ? Number(id) : 0
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const caseQuery = useQuery({
    queryKey: ['reconciliation-case', caseId],
    queryFn: () => getCaseById(caseId),
    enabled: caseId > 0,
  })

  const assignMutation = useMutation({
    mutationFn: (userId: number) => assignCaseOwner(caseId, userId),
    onSuccess: (data) => {
      queryClient.setQueryData(['reconciliation-case', caseId], data)
      showToast('Sahiplendi', 'success')
    },
  })

  async function handleAssignMe() {
    const me = window.localStorage.getItem('userId')
    const userId = me ? Number(me) : 1
    assignMutation.mutate(userId)
  }

  if (!caseId) {
    return (
      <section>
        <p className="text-sm text-error">Case bulunamadı</p>
        <Link to="/mutabakat/cases" className="btn-secondary mt-2">{t('app.back')}</Link>
      </section>
    )
  }

  const kase = caseQuery.data
  const allReady = kase ? kase.lines.every((l) => l.status === 'Ready') : false

  return (
    <section>
      <PageIntro
        title={kase ? `${t('reconciliation.caseDetail.title')} #${kase.id}` : t('reconciliation.caseDetail.title')}
        purpose={t('reconciliation.caseDetail.subtitle')}
        actions={
          <div className="flex gap-2">
            <Link to="/mutabakat/cases" className="btn-secondary">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
              {t('app.back')}
            </Link>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleAssignMe}
              disabled={assignMutation.isPending}
            >
              {t('reconciliation.caseDetail.assignOwner')}
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={!allReady}
              title={allReady ? '' : t('reconciliation.caseDetail.sendToCustomerDisabled')}
            >
              {t('reconciliation.caseDetail.sendToCustomer')}
            </button>
          </div>
        }
      />

      {caseQuery.isLoading && <p>{t('app.loading')}</p>}
      {caseQuery.isError && <p className="text-sm text-error">{t('errors.unexpected')}</p>}

      {kase && (
        <>
          <div className="card grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
            <InfoBox label={t('reconciliation.cases.columns.customer')}
                     value={`${kase.customerCode} — ${kase.customerName}`} />
            <InfoBox label={t('reconciliation.cases.columns.period')} value={kase.periodCode} />
            <InfoBox label={t('reconciliation.batchList.columns.flow')} value={kase.flow} />
            <InfoBox label={t('reconciliation.cases.columns.status')} value={kase.status} />
            <InfoBox label={t('reconciliation.cases.columns.owner')} value={`#${kase.ownerUserId}`} />
            <InfoBox
              label={t('reconciliation.cases.columns.totalAmount')}
              value={`${kase.totalAmount.toLocaleString(i18n.language, { minimumFractionDigits: 2 })} ${kase.currencyCode}`}
            />
          </div>

          <div className="card p-0 overflow-hidden" style={{ height: 480 }}>
            <LinesGrid
              caseId={caseId}
              lines={kase.lines}
              currencyCode={kase.currencyCode}
              onMutated={() => queryClient.invalidateQueries({ queryKey: ['reconciliation-case', caseId] })}
            />
          </div>
        </>
      )}
    </section>
  )
}

function LinesGrid({
  caseId,
  lines,
  currencyCode,
  onMutated,
}: {
  caseId: number
  lines: CaseLine[]
  currencyCode: string
  onMutated: () => void
}) {
  const { t } = useTranslation()

  const markReadyMutation = useMutation({
    mutationFn: (lineId: number) => markLineReady(lineId),
    onSuccess: () => {
      showToast('Line Ready', 'success')
      onMutated()
    },
    onError: () => showToast(t('errors.unexpected'), 'error'),
  })

  const onCellValueChanged = async (event: { data: CaseLine; colDef: { field?: string }; newValue: unknown; oldValue: unknown }) => {
    if (event.newValue === event.oldValue) return
    const field = event.colDef.field
    const payload: { quantity?: number; unitPrice?: number } = {}
    if (field === 'quantity') payload.quantity = Number(event.newValue)
    else if (field === 'unitPrice') payload.unitPrice = Number(event.newValue)
    else return
    try {
      await updateLine(event.data.id, payload)
      onMutated()
    } catch (e) {
      showToast(t('errors.unexpected'), 'error')
      onMutated() // revert
    }
  }

  const colDefs = useMemo<ColDef<CaseLine>[]>(() => [
    { field: 'productCode', headerName: t('reconciliation.caseDetail.columns.productCode'), width: 140 },
    { field: 'productName', headerName: t('reconciliation.caseDetail.columns.productName'), flex: 1, minWidth: 200 },
    {
      field: 'quantity',
      headerName: t('reconciliation.caseDetail.columns.quantity'),
      editable: (params) => params.data?.status === 'PendingReview' || params.data?.status === 'PricingMismatch',
      type: 'numericColumn',
      width: 100,
    },
    {
      field: 'unitPrice',
      headerName: t('reconciliation.caseDetail.columns.unitPrice'),
      editable: (params) => params.data?.status === 'PendingReview' || params.data?.status === 'PricingMismatch',
      type: 'numericColumn',
      width: 130,
      valueFormatter: (p) => `${Number(p.value).toFixed(2)}`,
    },
    {
      field: 'amount',
      headerName: t('reconciliation.caseDetail.columns.amount'),
      type: 'numericColumn',
      width: 130,
      valueFormatter: (p) => `${Number(p.value).toFixed(2)} ${currencyCode}`,
    },
    {
      field: 'status',
      headerName: t('reconciliation.caseDetail.columns.status'),
      width: 150,
      cellRenderer: (p: { value: ReconciliationLineStatus }) => (
        <span className={`chip ${lineStatusClass(p.value)}`}>{p.value}</span>
      ),
    },
    {
      headerName: t('reconciliation.caseDetail.columns.actions'),
      width: 120,
      cellRenderer: (p: { data: CaseLine }) => {
        if (p.data?.status !== 'PricingMismatch') return <span className="text-on-surface-variant text-xs">—</span>
        return (
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => markReadyMutation.mutate(p.data.id)}
            disabled={markReadyMutation.isPending}
          >
            {t('reconciliation.caseDetail.markLineReady')}
          </button>
        )
      },
    },
  ], [t, currencyCode, markReadyMutation])

  return (
    <div className="ag-theme-quartz" style={{ height: '100%', width: '100%' }}>
      <AgGridReact
        rowData={lines}
        columnDefs={colDefs}
        onCellValueChanged={onCellValueChanged}
        defaultColDef={{ resizable: true, sortable: true }}
        stopEditingWhenCellsLoseFocus={true}
        singleClickEdit={true}
      />
    </div>
  )
}

function lineStatusClass(status: ReconciliationLineStatus): string {
  switch (status) {
    case 'Ready':
      return 'chip-success'
    case 'PricingMismatch':
      return 'chip-warning'
    case 'PendingReview':
      return 'chip-info'
    case 'Disputed':
    case 'Rejected':
      return 'chip-error'
    default:
      return 'chip-neutral'
  }
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label-sm">{label}</p>
      <p className="text-sm font-medium mt-1 truncate" title={value}>{value}</p>
    </div>
  )
}
