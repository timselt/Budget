import '../lib/chart-config'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { useActiveVersion } from '../lib/useActiveVersion'
import { WaterfallChart } from '../components/variance/WaterfallChart'

interface MonthlyVarianceDto {
  month: number
  budgetRevenue: number
  actualRevenue: number
  revenueVariance: number
  revenueVariancePercent: number
  budgetClaims: number
  actualClaims: number
  claimsVariance: number
  claimsVariancePercent: number
  revenueAlert: string | null
  claimsAlert: string | null
}

interface VarianceSummaryResult {
  monthlyVariances: MonthlyVarianceDto[]
  totalBudgetRevenue: number
  totalActualRevenue: number
  totalBudgetClaims: number
  totalActualClaims: number
}

interface CustomerVarianceDto {
  customerId: number
  customerName: string
  customerCode: string
  budgetRevenue: number
  actualRevenue: number
  revenueVariance: number
  revenueVariancePercent: number
  budgetClaims: number
  actualClaims: number
  claimsVariance: number
  claimsVariancePercent: number
}

function fmtM(value: number): string {
  const m = value / 1_000_000
  return m.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function fmtPct(value: number, digits = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toLocaleString('tr-TR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`
}

export function VariancePage() {
  const { versionId, year, versionName, isLoading: versionLoading } = useActiveVersion()

  const summaryQuery = useQuery({
    queryKey: ['variance-summary', versionId],
    queryFn: async () => {
      const { data } = await api.get<VarianceSummaryResult>(`/variance/${versionId}/summary`)
      return data
    },
    enabled: versionId !== null,
  })

  const customersQuery = useQuery({
    queryKey: ['variance-customers', versionId],
    queryFn: async () => {
      const { data } = await api.get<CustomerVarianceDto[]>(`/variance/${versionId}/customers`)
      return data
    },
    enabled: versionId !== null,
  })

  const summary = summaryQuery.data ?? null
  const customers = useMemo(() => customersQuery.data ?? [], [customersQuery.data])

  const revenueVar = summary ? summary.totalActualRevenue - summary.totalBudgetRevenue : 0
  const revenueVarPct = summary && summary.totalBudgetRevenue > 0
    ? (revenueVar / summary.totalBudgetRevenue) * 100
    : 0

  const claimsVar = summary ? summary.totalActualClaims - summary.totalBudgetClaims : 0
  const claimsVarPct = summary && summary.totalBudgetClaims > 0
    ? (claimsVar / summary.totalBudgetClaims) * 100
    : 0

  const budgetMargin = summary ? summary.totalBudgetRevenue - summary.totalBudgetClaims : 0
  const actualMargin = summary ? summary.totalActualRevenue - summary.totalActualClaims : 0
  const marginVar = actualMargin - budgetMargin
  const marginVarPct = budgetMargin !== 0 ? (marginVar / budgetMargin) * 100 : 0

  if (versionLoading) {
    return (
      <section>
        <h2 className="text-3xl font-extrabold tracking-display text-[#002366] mb-6">
          Sapma Analizi
        </h2>
        <div className="card p-6 text-sm text-on-surface-variant">Yükleniyor…</div>
      </section>
    )
  }

  if (versionId === null) {
    return (
      <section>
        <h2 className="text-3xl font-extrabold tracking-display text-[#002366] mb-6">
          Sapma Analizi
        </h2>
        <div className="card p-6 text-sm text-on-surface-variant">
          Aktif bütçe versiyonu bulunamadı.
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-[#002366]">
            Sapma Analizi
          </h2>
          {versionName && year ? (
            <p className="text-sm text-on-surface-variant mt-1">
              FY{year} · {versionName} · Plan vs Gerçekleşen
            </p>
          ) : null}
        </div>
      </div>

      {summaryQuery.isError || customersQuery.isError ? (
        <div className="card mb-6 text-sm text-error">Veri alınırken hata oluştu.</div>
      ) : null}

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card">
          <span className="label-sm">Gelir Sapması</span>
          <p className={`text-2xl font-black num mt-2 ${revenueVar >= 0 ? 'text-success' : 'text-error'}`}>
            {summary ? `${revenueVar >= 0 ? '+' : ''}${fmtM(revenueVar)}M` : '—'}
          </p>
          <p className="text-xs font-bold mt-1">
            {summary ? `${fmtPct(revenueVarPct)} vs Plan` : '—'}
          </p>
        </div>
        <div className="card">
          <span className="label-sm">Hasar Sapması</span>
          <p className={`text-2xl font-black num mt-2 ${claimsVar <= 0 ? 'text-success' : 'text-warning'}`}>
            {summary ? `${claimsVar >= 0 ? '+' : ''}${fmtM(claimsVar)}M` : '—'}
          </p>
          <p className="text-xs font-bold mt-1">
            {summary ? `${fmtPct(claimsVarPct)} vs Plan` : '—'}
          </p>
        </div>
        <div className="card">
          <span className="label-sm">Teknik Marj Sapması</span>
          <p className={`text-2xl font-black num mt-2 ${marginVar >= 0 ? 'text-success' : 'text-error'}`}>
            {summary ? `${marginVar >= 0 ? '+' : ''}${fmtM(marginVar)}M` : '—'}
          </p>
          <p className="text-xs font-bold mt-1">
            {summary ? `${fmtPct(marginVarPct)} vs Plan` : '—'}
          </p>
        </div>
        <div className="card">
          <span className="label-sm">Toplam Plan Gelir</span>
          <p className="text-2xl font-black num mt-2 text-[#002366]">
            {summary ? `${fmtM(summary.totalBudgetRevenue)}M` : '—'}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">
            Gerçekleşen: {summary ? `${fmtM(summary.totalActualRevenue)}M` : '—'}
          </p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden mb-6">
        <div className="p-6 pb-3 flex justify-between items-center">
          <h3 className="text-lg font-bold tracking-tight">Müşteri Bazlı Sapma</h3>
          <span className="chip chip-neutral">Top 10</span>
        </div>
        {customers.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-on-surface-variant">
            {customersQuery.isLoading ? 'Yükleniyor…' : 'Bu versiyonda henüz actual kayıt yok.'}
          </p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Müşteri</th>
                <th className="text-right">Plan Gelir (M)</th>
                <th className="text-right">Actual Gelir (M)</th>
                <th className="text-right">Sapma (M)</th>
                <th className="text-right">Sapma %</th>
                <th className="text-right">Hasar Sapma (M)</th>
              </tr>
            </thead>
            <tbody>
              {customers.slice(0, 10).map((c) => (
                <tr key={c.customerId}>
                  <td>
                    <div className="font-bold">{c.customerName}</div>
                    <div className="text-[0.65rem] text-on-surface-variant font-mono">
                      {c.customerCode}
                    </div>
                  </td>
                  <td className="text-right num">{fmtM(c.budgetRevenue)}</td>
                  <td className="text-right num">{fmtM(c.actualRevenue)}</td>
                  <td
                    className={`text-right num ${
                      c.revenueVariance >= 0 ? 'text-success' : 'text-error'
                    }`}
                  >
                    {c.revenueVariance >= 0 ? '+' : ''}
                    {fmtM(c.revenueVariance)}
                  </td>
                  <td
                    className={`text-right num ${
                      c.revenueVariance >= 0 ? 'text-success' : 'text-error'
                    }`}
                  >
                    {fmtPct(c.revenueVariancePercent)}
                  </td>
                  <td
                    className={`text-right num ${
                      c.claimsVariance <= 0 ? 'text-success' : 'text-warning'
                    }`}
                  >
                    {c.claimsVariance >= 0 ? '+' : ''}
                    {fmtM(c.claimsVariance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold tracking-tight">EBITDA Waterfall</h3>
          <span className="chip chip-neutral">Demo grafik</span>
        </div>
        <p className="text-xs text-on-surface-variant mb-4">
          Bu grafik henüz örnek veri gösteriyor; EBITDA köprüsü endpoint'i sprint devamında
          gelecek.
        </p>
        <div style={{ height: 260 }}>
          <WaterfallChart />
        </div>
      </div>
    </section>
  )
}
