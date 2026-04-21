import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { PageIntro } from '../components/shared/PageIntro'
import { EmptyState } from '../components/shared/EmptyState'
import { showToast } from '../components/shared/toast-bus'
import { UploadBatchModal } from '../components/reconciliation/UploadBatchModal'
import {
  listBatches,
  type BatchSummary,
  type ReconciliationBatchStatus,
  type ReconciliationFlow,
  type BatchDetail,
} from '../components/reconciliation/api'

type FlowTab = 'all' | 'Insurance' | 'Automotive' | 'Filo' | 'Alternatif'

/**
 * Sprint 1 Madde 5 — Mutabakat Batch Listesi sayfası.
 * Tab (akış filtresi) + dönem filtresi + status filtresi; AG-Grid yerine
 * yerleşik tablo (Sprint 1 hafif tutuldu — AG-Grid Sprint 2 case detay
 * sayfalarında devreye girecek). Sayfa amacı + boş durum + upload modal.
 */
export function ReconciliationBatchesPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [tab, setTab] = useState<FlowTab>('all')
  const [periodCode, setPeriodCode] = useState<string>('')
  const [status, setStatus] = useState<ReconciliationBatchStatus | ''>('')
  const [showUpload, setShowUpload] = useState(false)

  const filters = useMemo(
    () => ({
      flow: tab === 'all' ? undefined : (tab as ReconciliationFlow),
      periodCode: periodCode || undefined,
      status: status || undefined,
    }),
    [tab, periodCode, status],
  )

  const batchesQuery = useQuery({
    queryKey: ['reconciliation-batches', filters],
    queryFn: () => listBatches(filters),
  })

  const batches = batchesQuery.data ?? []

  const handleUploadSuccess = (detail: BatchDetail) => {
    setShowUpload(false)
    showToast(
      t('reconciliation.upload.success', {
        rowCount: detail.rowCount,
        okCount: detail.okCount,
        warningCount: detail.warningCount,
        errorCount: detail.errorCount,
      }),
      'success',
    )
  }

  return (
    <section>
      <PageIntro
        title={t('reconciliation.batchList.title')}
        purpose={t('reconciliation.batchList.subtitle')}
        actions={
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowUpload(true)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              cloud_upload
            </span>
            {t('reconciliation.batchList.newBatchButton')}
          </button>
        }
      />

      <div className="flex gap-1 mb-4 bg-surface-container-low rounded-lg p-1 w-fit">
        {(['all', 'Insurance', 'Automotive', 'Filo', 'Alternatif'] as FlowTab[]).map((id) => {
          const labelKey = `reconciliation.batchList.tabs.${id.toLowerCase()}`
          return (
            <button
              key={id}
              type="button"
              className={`tab ${tab === id ? 'active' : ''}`}
              onClick={() => setTab(id)}
            >
              {t(labelKey)}
            </button>
          )
        })}
      </div>

      <div className="card mb-4 flex gap-3 flex-wrap items-center">
        <label className="label-sm">{t('reconciliation.batchList.filters.period')}</label>
        <input
          type="text"
          className="input"
          placeholder="2026-04"
          maxLength={7}
          value={periodCode}
          onChange={(e) => setPeriodCode(e.target.value)}
          style={{ width: 120 }}
        />
        <label className="label-sm">{t('reconciliation.batchList.filters.status')}</label>
        <select
          className="select"
          value={status}
          onChange={(e) => setStatus(e.target.value as ReconciliationBatchStatus | '')}
        >
          <option value="">{t('reconciliation.batchList.filters.anyStatus')}</option>
          <option value="Draft">{t('reconciliation.batchList.status.draft')}</option>
          <option value="Parsed">{t('reconciliation.batchList.status.parsed')}</option>
          <option value="Mapped">{t('reconciliation.batchList.status.mapped')}</option>
          <option value="Archived">{t('reconciliation.batchList.status.archived')}</option>
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {batchesQuery.isLoading ? (
          <p className="p-6 text-sm text-on-surface-variant">{t('app.loading')}</p>
        ) : batchesQuery.isError ? (
          <p className="p-6 text-sm text-error">
            {t('errors.unexpected')}
          </p>
        ) : batches.length === 0 ? (
          <EmptyState
            icon="inbox"
            title={t('reconciliation.batchList.empty.title')}
            description={t('reconciliation.batchList.empty.description')}
            cta={
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowUpload(true)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  cloud_upload
                </span>
                {t('reconciliation.batchList.empty.cta')}
              </button>
            }
          />
        ) : (
          <BatchTable
            batches={batches}
            t={t}
            locale={i18n.language}
            onRowClick={(id) => navigate(`/mutabakat/batches/${id}`)}
          />
        )}
      </div>

      {showUpload && (
        <UploadBatchModal
          defaultFlow={tab === 'all' ? 'Insurance' : (tab as ReconciliationFlow)}
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </section>
  )
}

function BatchTable({
  batches,
  t,
  locale,
  onRowClick,
}: {
  batches: BatchSummary[]
  t: (key: string) => string
  locale: string
  onRowClick: (id: number) => void
}) {
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>{t('reconciliation.batchList.columns.flow')}</th>
          <th>{t('reconciliation.batchList.columns.periodCode')}</th>
          <th>{t('reconciliation.batchList.columns.sourceType')}</th>
          <th>{t('reconciliation.batchList.columns.sourceFileName')}</th>
          <th className="text-right">{t('reconciliation.batchList.columns.rowCount')}</th>
          <th>{t('reconciliation.batchList.columns.status')}</th>
          <th>{t('reconciliation.batchList.columns.importedAt')}</th>
          <th>{t('reconciliation.batchList.columns.notes')}</th>
        </tr>
      </thead>
      <tbody>
        {batches.map((b) => (
          <tr key={b.id}
              className="cursor-pointer hover:bg-surface-container-low"
              onClick={() => onRowClick(b.id)}>
            <td>
              <span
                className={`chip ${flowChipClass(b.flow)}`}
              >
                {t(`reconciliation.batchList.flow.${b.flow.toLowerCase()}`)}
              </span>
            </td>
            <td className="font-mono text-xs">{b.periodCode}</td>
            <td className="text-xs">
              {t(`reconciliation.batchList.sourceType.${camel(b.sourceType)}`)}
            </td>
            <td className="font-mono text-xs max-w-[280px] truncate" title={b.sourceFileName}>
              {b.sourceFileName}
            </td>
            <td className="text-right num">{b.rowCount.toLocaleString(locale)}</td>
            <td>
              <span className={`chip ${statusChipClass(b.status)}`}>
                {t(`reconciliation.batchList.status.${b.status.toLowerCase()}`)}
              </span>
            </td>
            <td className="text-xs text-on-surface-variant">
              {new Date(b.importedAt).toLocaleString(locale)}
            </td>
            <td className="text-xs text-on-surface-variant max-w-[200px] truncate" title={b.notes ?? undefined}>
              {b.notes ?? '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function flowChipClass(flow: ReconciliationFlow): string {
  switch (flow) {
    case 'Insurance': return 'chip-info'
    case 'Automotive': return 'chip-warning'
    case 'Filo': return 'chip-success'
    case 'Alternatif': return 'chip-neutral'
  }
}

function statusChipClass(status: ReconciliationBatchStatus): string {
  switch (status) {
    case 'Draft': return 'chip-warning'
    case 'Parsed': return 'chip-success'
    case 'Mapped': return 'chip-info'
    case 'Archived': return 'chip-neutral'
    default: return 'chip-neutral'
  }
}

function camel(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1)
}
