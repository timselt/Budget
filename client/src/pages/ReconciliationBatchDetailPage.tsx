import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { PageIntro } from '../components/shared/PageIntro'
import { EmptyState } from '../components/shared/EmptyState'
import { showToast } from '../components/shared/toast-bus'
import {
  getBatchById,
  deleteDraftBatch,
  listUnmatchedCustomers,
  linkUnmatchedCustomer,
  listCases,
  type UnmatchedCustomerRef,
} from '../components/reconciliation/api'

type Tab = 'cases' | 'unmatched' | 'errors'

/**
 * Sprint 2 Task 9 — Batch Detay sayfası (S3).
 * Üst özet + 3 tab (Case'ler / Eşlenmemiş / Parse Hataları) + Draft sil butonu.
 */
export function ReconciliationBatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const batchId = id ? Number(id) : 0
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('cases')

  const batchQuery = useQuery({
    queryKey: ['reconciliation-batch', batchId],
    queryFn: () => getBatchById(batchId),
    enabled: batchId > 0,
  })

  const casesQuery = useQuery({
    queryKey: ['reconciliation-batch-cases', batchId],
    queryFn: () => listCases({ batchId }),
    enabled: batchId > 0 && tab === 'cases',
  })

  const unmatchedQuery = useQuery({
    queryKey: ['reconciliation-batch-unmatched', batchId],
    queryFn: () => listUnmatchedCustomers(batchId),
    enabled: batchId > 0 && tab === 'unmatched',
  })

  async function handleDeleteDraft() {
    if (!batchQuery.data) return
    if (!confirm(t('reconciliation.batchDetail.confirmDelete'))) return
    try {
      await deleteDraftBatch(batchId)
      showToast(t('reconciliation.batchDetail.deleteSuccess'), 'success')
      queryClient.invalidateQueries({ queryKey: ['reconciliation-batches'] })
      navigate('/mutabakat/batches')
    } catch (e) {
      showToast(t('errors.unexpected'), 'error')
    }
  }

  if (!batchId) {
    return <EmptyState icon="error" title={t('reconciliation.batchDetail.notFound')} />
  }

  const b = batchQuery.data
  return (
    <section>
      <PageIntro
        title={b ? `${t('reconciliation.batchDetail.title')} #${b.id}` : t('reconciliation.batchDetail.title')}
        purpose={t('reconciliation.batchDetail.subtitle')}
        actions={
          <div className="flex gap-2">
            <Link to="/mutabakat/batches" className="btn-secondary">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
              {t('app.back')}
            </Link>
            {b?.status === 'Draft' && (
              <button type="button" className="btn-danger" onClick={handleDeleteDraft}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                {t('reconciliation.batchDetail.deleteDraft')}
              </button>
            )}
          </div>
        }
      />

      {batchQuery.isLoading && <p className="text-sm text-on-surface-variant">{t('app.loading')}</p>}
      {batchQuery.isError && <p className="text-sm text-error">{t('errors.unexpected')}</p>}

      {b && (
        <div className="card grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
          <InfoBox label={t('reconciliation.batchList.columns.flow')} value={b.flow} />
          <InfoBox label={t('reconciliation.batchList.columns.periodCode')} value={b.periodCode} />
          <InfoBox label={t('reconciliation.batchList.columns.sourceType')} value={b.sourceType} />
          <InfoBox label={t('reconciliation.batchList.columns.rowCount')} value={String(b.rowCount)} />
          <InfoBox label={t('reconciliation.batchList.columns.status')} value={b.status} />
          <InfoBox
            label={t('reconciliation.batchList.columns.importedAt')}
            value={new Date(b.importedAt).toLocaleString(i18n.language)}
          />
          <InfoBox label="Ok" value={String(b.okCount)} />
          <InfoBox label="Warning" value={String(b.warningCount)} />
          <InfoBox label="Error" value={String(b.errorCount)} />
          <InfoBox label={t('reconciliation.batchList.columns.sourceFileName')} value={b.sourceFileName} mono />
        </div>
      )}

      <div className="flex gap-1 mb-4 bg-surface-container-low rounded-lg p-1 w-fit">
        <button type="button" className={`tab ${tab === 'cases' ? 'active' : ''}`} onClick={() => setTab('cases')}>
          {t('reconciliation.batchDetail.tabs.cases')}
        </button>
        <button type="button" className={`tab ${tab === 'unmatched' ? 'active' : ''}`} onClick={() => setTab('unmatched')}>
          {t('reconciliation.batchDetail.tabs.unmatched')}
        </button>
        <button type="button" className={`tab ${tab === 'errors' ? 'active' : ''}`} onClick={() => setTab('errors')}>
          {t('reconciliation.batchDetail.tabs.errors')}
        </button>
      </div>

      {tab === 'cases' && (
        <div className="card p-0 overflow-hidden">
          {casesQuery.isLoading ? (
            <p className="p-6 text-sm text-on-surface-variant">{t('app.loading')}</p>
          ) : casesQuery.data && casesQuery.data.length > 0 ? (
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('reconciliation.cases.columns.customer')}</th>
                  <th>{t('reconciliation.cases.columns.status')}</th>
                  <th className="text-right">{t('reconciliation.cases.columns.lineCount')}</th>
                  <th className="text-right">{t('reconciliation.cases.columns.totalAmount')}</th>
                </tr>
              </thead>
              <tbody>
                {casesQuery.data.map((c) => (
                  <tr key={c.id} className="cursor-pointer hover:bg-surface-container-low"
                      onClick={() => navigate(`/mutabakat/cases/${c.id}`)}>
                    <td className="font-mono">{c.id}</td>
                    <td>{c.customerCode} — {c.customerName}</td>
                    <td><span className="chip chip-info">{c.status}</span></td>
                    <td className="text-right num">{c.lineCount}</td>
                    <td className="text-right num">{c.totalAmount.toLocaleString(i18n.language)} {c.currencyCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState icon="folder_off" title={t('reconciliation.batchDetail.emptyCases')} />
          )}
        </div>
      )}

      {tab === 'unmatched' && (
        <UnmatchedTab
          batchId={batchId}
          data={unmatchedQuery.data}
          isLoading={unmatchedQuery.isLoading}
          onLinked={() => {
            queryClient.invalidateQueries({ queryKey: ['reconciliation-batch-unmatched', batchId] })
            queryClient.invalidateQueries({ queryKey: ['reconciliation-batch-cases', batchId] })
          }}
        />
      )}

      {tab === 'errors' && <ErrorsTab batchId={batchId} />}
    </section>
  )
}

function UnmatchedTab({
  batchId,
  data,
  isLoading,
  onLinked,
}: {
  batchId: number
  data: UnmatchedCustomerRef[] | undefined
  isLoading: boolean
  onLinked: () => void
}) {
  const { t } = useTranslation()

  if (isLoading) return <p className="p-6 text-sm text-on-surface-variant">{t('app.loading')}</p>
  if (!data || data.length === 0) {
    return (
      <div className="card p-0">
        <EmptyState icon="check_circle" title={t('reconciliation.batchDetail.allMatched')} />
      </div>
    )
  }

  return (
    <div className="card p-0 overflow-hidden">
      <table className="tbl">
        <thead>
          <tr>
            <th>{t('reconciliation.unmatched.columns.externalRef')}</th>
            <th className="text-right">{t('reconciliation.unmatched.columns.rowCount')}</th>
            <th>{t('reconciliation.unmatched.columns.samples')}</th>
            <th>{t('reconciliation.unmatched.columns.action')}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((u) => (
            <tr key={u.externalCustomerRef}>
              <td className="font-mono">{u.externalCustomerRef}</td>
              <td className="text-right num">{u.rowCount}</td>
              <td className="text-xs text-on-surface-variant truncate max-w-[320px]">
                {u.sampleDocumentRefs.join(', ') || '—'}
              </td>
              <td>
                <LinkCustomerButton
                  batchId={batchId}
                  externalRef={u.externalCustomerRef}
                  onLinked={onLinked}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LinkCustomerButton({
  batchId,
  externalRef,
  onLinked,
}: {
  batchId: number
  externalRef: string
  onLinked: () => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [linking, setLinking] = useState(false)

  async function submit() {
    if (!customerId) return
    setLinking(true)
    try {
      const result = await linkUnmatchedCustomer(batchId, externalRef, Number(customerId))
      showToast(
        t('reconciliation.unmatched.linkSuccess', {
          cases: result.newCasesCreated,
          lines: result.newLinesCreated,
        }),
        'success',
      )
      setOpen(false)
      setCustomerId('')
      onLinked()
    } catch (e) {
      showToast(t('errors.unexpected'), 'error')
    } finally {
      setLinking(false)
    }
  }

  return (
    <>
      <button type="button" className="btn-secondary btn-sm" onClick={() => setOpen(true)}>
        {t('reconciliation.unmatched.link')}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4"
             onClick={() => setOpen(false)}>
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">
              {t('reconciliation.unmatched.modalTitle', { externalRef })}
            </h3>
            <label className="label-sm block mb-1.5">
              {t('reconciliation.unmatched.customerIdLabel')}
            </label>
            <input
              type="number"
              className="input w-full mb-4"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="123"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
                {t('app.cancel')}
              </button>
              <button type="button" className="btn-primary" disabled={linking || !customerId} onClick={submit}>
                {linking ? t('app.loading') : t('reconciliation.unmatched.link')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ErrorsTab({ batchId: _batchId }: { batchId: number }) {
  const { t } = useTranslation()
  // Parse error satırları için ayrı endpoint yok — source rows'dan filtrelemek gerekir.
  // Sprint 2 MVP: placeholder — Task 13 full E2E'de genişletilebilir.
  return (
    <div className="card p-8">
      <EmptyState
        icon="warning"
        title={t('reconciliation.batchDetail.errorsPlaceholderTitle')}
        description={t('reconciliation.batchDetail.errorsPlaceholderDescription')}
      />
    </div>
  )
}

function InfoBox({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="label-sm">{label}</p>
      <p className={`text-sm font-medium mt-1 ${mono ? 'font-mono text-xs truncate' : ''}`} title={value}>
        {value}
      </p>
    </div>
  )
}
