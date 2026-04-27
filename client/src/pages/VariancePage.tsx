import '../lib/chart-config'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import {
  formatCompactAmount,
  formatSignedPercent,
} from '../lib/number-format'
import { useActiveVersion } from '../lib/useActiveVersion'
import { WaterfallChart } from '../components/variance/WaterfallChart'
import { PageIntro } from '../components/shared/PageIntro'

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

  // En kritik 3 sapma: gelir veya hasar sapmasının absolute değeri en yüksek
  // 3 müşteri. Tek tablo özetine kıyasla operasyon kullanıcısının "kim
  // aksiyon gerektiriyor?" sorusunu hızlı yanıtlar.
  const criticalCustomers = useMemo(() => {
    return [...customers]
      .map((c) => ({
        ...c,
        magnitude: Math.max(
          Math.abs(c.revenueVariancePercent),
          Math.abs(c.claimsVariancePercent),
        ),
        // En kritik metric: gelirden mi hasardan mı geliyor + nasıl?
        kind:
          Math.abs(c.revenueVariancePercent) >= Math.abs(c.claimsVariancePercent)
            ? c.revenueVariancePercent >= 0
              ? 'revenue-up'
              : 'revenue-down'
            : c.claimsVariancePercent >= 0
              ? 'claims-up'
              : 'claims-down',
      }))
      .filter((c) => c.magnitude >= 10) // %10 altı yorum gerektirmez
      .sort((a, b) => b.magnitude - a.magnitude)
      .slice(0, 3)
  }, [customers])

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
        <h2 className="text-3xl font-extrabold tracking-display text-secondary mb-6">
          Sapma Analizi
        </h2>
        <div className="card p-6 text-sm text-on-surface-variant">Yükleniyor…</div>
      </section>
    )
  }

  if (versionId === null) {
    return (
      <section>
        <h2 className="text-3xl font-extrabold tracking-display text-secondary mb-6">
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
      <PageIntro
        title="Sapma Analizi"
        purpose="Plan vs gerçekleşen karşılaştırma — hangi müşteri/kategori beklenen değerden saptı? Üstte kritik sapmalar, altta detay tablo + EBITDA waterfall."
        context={
          versionName && year ? (
            <p className="text-sm text-on-surface-variant">
              FY{year} · {versionName}
            </p>
          ) : undefined
        }
      />

      {summaryQuery.isError || customersQuery.isError ? (
        <div className="card mb-6 text-sm text-error">Veri alınırken hata oluştu.</div>
      ) : null}

      {criticalCustomers.length > 0 && (
        <div className="card mb-6 border-l-4 border-l-error">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="material-symbols-outlined text-error"
              style={{ fontSize: 20 }}
            >
              warning
            </span>
            <h3 className="text-base font-bold text-on-surface">
              En Kritik {criticalCustomers.length} Sapma
            </h3>
            <span className="text-xs text-on-surface-variant ml-1">
              %10+ sapması olan müşteriler
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {criticalCustomers.map((c) => {
              const kindMeta: Record<typeof c.kind, { icon: string; tone: string; action: string }> = {
                'revenue-up': {
                  icon: 'trending_up',
                  tone: 'text-success',
                  action: 'Gelir hedefin üstünde — fırsatları çoğalt',
                },
                'revenue-down': {
                  icon: 'trending_down',
                  tone: 'text-error',
                  action: 'Gelir hedefin altında — kontrat/tahsilat gözden geçir',
                },
                'claims-up': {
                  icon: 'arrow_outward',
                  tone: 'text-warning',
                  action: 'Hasar planın üstünde — risk profilini incele',
                },
                'claims-down': {
                  icon: 'south_west',
                  tone: 'text-success',
                  action: 'Hasar planın altında — pozitif sürpriz',
                },
              }
              const meta = kindMeta[c.kind]
              return (
                <div
                  key={c.customerId}
                  className="rounded-md bg-surface-container-low p-3"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`material-symbols-outlined ${meta.tone}`}
                      style={{ fontSize: 18 }}
                      aria-hidden
                    >
                      {meta.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">
                        {c.customerName}
                      </p>
                      <p className={`text-lg font-black num ${meta.tone}`}>
                        {formatSignedPercent(c.magnitude * (c.kind.includes('down') ? -1 : 1))}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {meta.action}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card">
          <span className="label-sm">Gelir Sapması</span>
          <p className={`text-2xl font-black num mt-2 ${revenueVar >= 0 ? 'text-success' : 'text-error'}`}>
            {summary ? `${revenueVar >= 0 ? '+' : ''}${formatCompactAmount(revenueVar)}` : '—'}
          </p>
          <p className="text-xs font-bold mt-1">
            {summary ? `${formatSignedPercent(revenueVarPct)} vs Plan` : '—'}
          </p>
        </div>
        <div className="card">
          <span className="label-sm">Hasar Sapması</span>
          <p className={`text-2xl font-black num mt-2 ${claimsVar <= 0 ? 'text-success' : 'text-warning'}`}>
            {summary ? `${claimsVar >= 0 ? '+' : ''}${formatCompactAmount(claimsVar)}` : '—'}
          </p>
          <p className="text-xs font-bold mt-1">
            {summary ? `${formatSignedPercent(claimsVarPct)} vs Plan` : '—'}
          </p>
        </div>
        <div className="card">
          <span className="label-sm">Teknik Marj Sapması</span>
          <p className={`text-2xl font-black num mt-2 ${marginVar >= 0 ? 'text-success' : 'text-error'}`}>
            {summary ? `${marginVar >= 0 ? '+' : ''}${formatCompactAmount(marginVar)}` : '—'}
          </p>
          <p className="text-xs font-bold mt-1">
            {summary ? `${formatSignedPercent(marginVarPct)} vs Plan` : '—'}
          </p>
        </div>
        <div className="card">
          <span className="label-sm">Toplam Plan Gelir</span>
          <p className="text-2xl font-black num mt-2 text-secondary">
            {summary ? formatCompactAmount(summary.totalBudgetRevenue) : '—'}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">
            Gerçekleşen: {summary ? formatCompactAmount(summary.totalActualRevenue) : '—'}
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
                  <td className="text-right num">{formatCompactAmount(c.budgetRevenue)}</td>
                  <td className="text-right num">{formatCompactAmount(c.actualRevenue)}</td>
                  <td
                    className={`text-right num ${
                      c.revenueVariance >= 0 ? 'text-success' : 'text-error'
                    }`}
                  >
                    {c.revenueVariance >= 0 ? '+' : ''}
                    {formatCompactAmount(c.revenueVariance)}
                  </td>
                  <td
                    className={`text-right num ${
                      c.revenueVariance >= 0 ? 'text-success' : 'text-error'
                    }`}
                  >
                    {formatSignedPercent(c.revenueVariancePercent)}
                  </td>
                  <td
                    className={`text-right num ${
                      c.claimsVariance <= 0 ? 'text-success' : 'text-warning'
                    }`}
                  >
                    {c.claimsVariance >= 0 ? '+' : ''}
                    {formatCompactAmount(c.claimsVariance)}
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
