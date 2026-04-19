import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { PageIntro } from '../components/shared/PageIntro'
import { EmptyState } from '../components/shared/EmptyState'
import {
  listCases,
  type CaseSummary,
  type ReconciliationCaseStatus,
  type ReconciliationFlow,
} from '../components/reconciliation/api'

type FlowTab = 'Insurance' | 'Automotive'

/**
 * Sprint 2 Task 10 — Case Listesi (S4 Sigorta + S5 Otomotiv).
 * Tab (flow) + dönem + status + sahip filtresi. Satır tıklama → S6 Case Detayı.
 */
export function ReconciliationCasesPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [tab, setTab] = useState<FlowTab>('Insurance')
  const [periodCode, setPeriodCode] = useState('')
  const [status, setStatus] = useState<ReconciliationCaseStatus | ''>('')

  const filters = useMemo(
    () => ({
      flow: tab as ReconciliationFlow,
      periodCode: periodCode || undefined,
      status: status || undefined,
    }),
    [tab, periodCode, status],
  )

  const casesQuery = useQuery({
    queryKey: ['reconciliation-cases', filters],
    queryFn: () => listCases(filters),
  })

  const cases = casesQuery.data ?? []

  return (
    <section>
      <PageIntro
        title={t('reconciliation.cases.title')}
        purpose={t('reconciliation.cases.subtitle')}
      />

      <div className="flex gap-1 mb-4 bg-surface-container-low rounded-lg p-1 w-fit">
        {(['Insurance', 'Automotive'] as FlowTab[]).map((id) => (
          <button
            key={id}
            type="button"
            className={`tab ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >
            {t(`reconciliation.cases.tabs.${id.toLowerCase()}`)}
          </button>
        ))}
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
          onChange={(e) => setStatus(e.target.value as ReconciliationCaseStatus | '')}
        >
          <option value="">{t('reconciliation.batchList.filters.anyStatus')}</option>
          <option value="Draft">Draft</option>
          <option value="UnderControl">UnderControl</option>
          <option value="PricingMatched">PricingMatched</option>
          <option value="SentToCustomer">SentToCustomer</option>
          <option value="CustomerApproved">CustomerApproved</option>
          <option value="CustomerDisputed">CustomerDisputed</option>
          <option value="ReadyForAccounting">ReadyForAccounting</option>
          <option value="SentToAccounting">SentToAccounting</option>
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {casesQuery.isLoading ? (
          <p className="p-6 text-sm text-on-surface-variant">{t('app.loading')}</p>
        ) : casesQuery.isError ? (
          <p className="p-6 text-sm text-error">{t('errors.unexpected')}</p>
        ) : cases.length === 0 ? (
          <EmptyState
            icon="folder_off"
            title={t('reconciliation.cases.empty.title')}
            description={t('reconciliation.cases.empty.description')}
          />
        ) : (
          <CaseTable cases={cases} locale={i18n.language} t={t} onRowClick={(id) => navigate(`/mutabakat/cases/${id}`)} />
        )}
      </div>
    </section>
  )
}

function CaseTable({
  cases,
  locale,
  t,
  onRowClick,
}: {
  cases: CaseSummary[]
  locale: string
  t: (key: string) => string
  onRowClick: (id: number) => void
}) {
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>#</th>
          <th>{t('reconciliation.cases.columns.customer')}</th>
          <th>{t('reconciliation.cases.columns.period')}</th>
          <th>{t('reconciliation.cases.columns.status')}</th>
          <th className="text-right">{t('reconciliation.cases.columns.owner')}</th>
          <th className="text-right">{t('reconciliation.cases.columns.lineCount')}</th>
          <th className="text-right">{t('reconciliation.cases.columns.totalAmount')}</th>
          <th>{t('reconciliation.cases.columns.openedAt')}</th>
        </tr>
      </thead>
      <tbody>
        {cases.map((c) => (
          <tr
            key={c.id}
            className="cursor-pointer hover:bg-surface-container-low"
            onClick={() => onRowClick(c.id)}
          >
            <td className="font-mono text-xs">{c.id}</td>
            <td>
              <span className="font-mono text-xs">{c.customerCode}</span>
              <span className="text-on-surface-variant"> — {c.customerName}</span>
            </td>
            <td className="font-mono text-xs">{c.periodCode}</td>
            <td>
              <span className={`chip ${statusChipClass(c.status)}`}>{c.status}</span>
            </td>
            <td className="text-right text-xs text-on-surface-variant">#{c.ownerUserId}</td>
            <td className="text-right num">{c.lineCount}</td>
            <td className="text-right num">
              {c.totalAmount.toLocaleString(locale, { minimumFractionDigits: 2 })} {c.currencyCode}
            </td>
            <td className="text-xs text-on-surface-variant">
              {new Date(c.openedAt).toLocaleString(locale)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function statusChipClass(status: ReconciliationCaseStatus): string {
  switch (status) {
    case 'Draft':
      return 'chip-warning'
    case 'UnderControl':
      return 'chip-info'
    case 'PricingMatched':
    case 'CustomerApproved':
    case 'ReadyForAccounting':
      return 'chip-success'
    case 'CustomerDisputed':
      return 'chip-error'
    case 'SentToAccounting':
      return 'chip-neutral'
    default:
      return 'chip-neutral'
  }
}
