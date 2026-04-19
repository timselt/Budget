import '../lib/chart-config'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import {
  formatAmount,
  formatCompactAmount,
  formatPercent,
} from '../lib/number-format'
import { METRIC_LABELS } from '../lib/metric-labels'
import { useActiveVersion } from '../lib/useActiveVersion'
import {
  FinOpsTrendChart,
  SegmentDistributionDonut,
} from '../components/dashboard/FinOpsTrendChart'
import { TaskCenter } from '../components/dashboard/TaskCenter'
import { HelpHint } from '../components/shared/Tooltip'
import {
  EbitdaBridgeChart,
  LossRatioChart,
  OpexBreakdownChart,
} from '../components/dashboard/FinOpsSecondaryCharts'

interface KpiResult {
  totalRevenue: number
  totalClaims: number
  technicalMargin: number
  lossRatio: number
  generalExpenses: number
  technicalExpenses: number
  technicalProfit: number
  financialIncome: number
  financialExpenses: number
  tKatilim: number
  depreciation: number
  netProfit: number
  ebitda: number
  expenseRatio: number
  combinedRatio: number
  ebitdaMargin: number
  technicalProfitRatio: number
  profitRatio: number
  muallakRatio: number
}

interface ConcentrationRow {
  customerId: number
  customerName: string
  revenue: number
  share: number
}

interface ConcentrationResult {
  topCustomers: ConcentrationRow[]
  hhi: number
  topNShare: number
}

interface MonthlyVariance {
  month: number
  budgetRevenue: number
  actualRevenue: number
  budgetClaims: number
  actualClaims: number
}

interface VarianceSummaryResult {
  monthlyVariances: MonthlyVariance[]
}

interface OpexBreakdownItem {
  categoryId: number
  categoryCode: string
  categoryName: string
  totalAmount: number
}

interface SegmentDistributionItem {
  segmentId: number
  segmentName: string
  revenue: number
  share: number
}

interface TopCustomerDetail {
  customerId: number
  customerName: string
  segmentName: string
  revenue: number
  share: number
}

function toMillions(value: number): number {
  return value / 1_000_000
}

export function DashboardPage() {
  const { versionId, versionName, year, isLoading: versionLoading } = useActiveVersion()

  const kpisQuery = useQuery({
    queryKey: ['dashboard-kpis', versionId],
    queryFn: async () => (await api.get<KpiResult>(`/dashboard/${versionId}/kpis`)).data,
    enabled: versionId !== null,
  })

  const concentrationQuery = useQuery({
    queryKey: ['dashboard-concentration', versionId],
    queryFn: async () =>
      (await api.get<ConcentrationResult>(`/dashboard/${versionId}/top-customers?topN=5`)).data,
    enabled: versionId !== null,
  })

  const varianceSummaryQuery = useQuery({
    queryKey: ['variance-summary', versionId],
    queryFn: async () =>
      (await api.get<VarianceSummaryResult>(`/variance/${versionId}/summary`)).data,
    enabled: versionId !== null,
  })

  const opexBreakdownQuery = useQuery({
    queryKey: ['dashboard-opex-breakdown', versionId],
    queryFn: async () =>
      (await api.get<OpexBreakdownItem[]>(`/dashboard/${versionId}/opex-breakdown`)).data,
    enabled: versionId !== null,
  })

  const segmentDistributionQuery = useQuery({
    queryKey: ['dashboard-segment-distribution', versionId],
    queryFn: async () =>
      (await api.get<SegmentDistributionItem[]>(`/dashboard/${versionId}/segment-distribution`)).data,
    enabled: versionId !== null,
  })

  const topCustomersDetailedQuery = useQuery({
    queryKey: ['dashboard-top-customers-detailed', versionId],
    queryFn: async () =>
      (await api.get<TopCustomerDetail[]>(
        `/dashboard/${versionId}/top-customers-detailed?topN=10`,
      )).data,
    enabled: versionId !== null,
  })

  const kpis = kpisQuery.data ?? null
  const concentration = concentrationQuery.data ?? null
  const topCustomers = useMemo(() => concentration?.topCustomers ?? [], [concentration])
  const monthlyVariances = useMemo(
    () => varianceSummaryQuery.data?.monthlyVariances ?? [],
    [varianceSummaryQuery.data],
  )
  const opexBreakdown = useMemo(
    () => opexBreakdownQuery.data ?? [],
    [opexBreakdownQuery.data],
  )
  const segmentDistribution = useMemo(
    () => segmentDistributionQuery.data ?? [],
    [segmentDistributionQuery.data],
  )
  const topCustomersDetailed = useMemo(
    () => topCustomersDetailedQuery.data ?? [],
    [topCustomersDetailedQuery.data],
  )

  const marginPercent = kpis && kpis.totalRevenue > 0
    ? (kpis.technicalMargin / kpis.totalRevenue) * 100
    : 0

  const trendRevenueSeries = useMemo(
    () => monthlyVariances.map((m) => toMillions(m.budgetRevenue)),
    [monthlyVariances],
  )
  const trendClaimsSeries = useMemo(
    () => monthlyVariances.map((m) => toMillions(m.budgetClaims)),
    [monthlyVariances],
  )
  const trendTechnicalMarginSeries = useMemo(
    () => monthlyVariances.map((m) => toMillions(m.budgetRevenue - m.budgetClaims)),
    [monthlyVariances],
  )
  const actualLossRatioSeries = useMemo(
    () => monthlyVariances.map((m) => (m.actualRevenue > 0 ? (m.actualClaims / m.actualRevenue) * 100 : 0)),
    [monthlyVariances],
  )
  const budgetLossRatioSeries = useMemo(
    () => monthlyVariances.map((m) => (m.budgetRevenue > 0 ? (m.budgetClaims / m.budgetRevenue) * 100 : 0)),
    [monthlyVariances],
  )
  const opexLabels = useMemo(
    () => opexBreakdown.map((item) => item.categoryName),
    [opexBreakdown],
  )
  const opexValues = useMemo(
    () => opexBreakdown.map((item) => toMillions(item.totalAmount)),
    [opexBreakdown],
  )
  const segmentLabels = useMemo(
    () => segmentDistribution.map((item) => item.segmentName),
    [segmentDistribution],
  )
  const segmentValues = useMemo(
    () => segmentDistribution.map((item) => Number((item.share * 100).toFixed(2))),
    [segmentDistribution],
  )
  const ebitdaBridge = useMemo(() => {
    if (!kpis) return null
    return {
      labels: [
        'Gelir',
        'Hasar',
        'Genel Gid.',
        'Teknik Gid.',
        'Fin. Gelir',
        'Fin. Gider',
        'T Katılım',
        'Amortisman',
        'EBITDA',
      ],
      values: [
        toMillions(kpis.totalRevenue),
        toMillions(-kpis.totalClaims),
        toMillions(-kpis.generalExpenses),
        toMillions(-kpis.technicalExpenses),
        toMillions(kpis.financialIncome),
        toMillions(-kpis.financialExpenses),
        toMillions(kpis.tKatilim),
        toMillions(kpis.depreciation),
        toMillions(kpis.ebitda),
      ],
    }
  }, [kpis])

  if (versionLoading) {
    return (
      <section>
        <h2 className="text-3xl font-extrabold tracking-display text-[#002366] mb-6">
          Yönetici Paneli
        </h2>
        <div className="card p-6 text-sm text-on-surface-variant">Yükleniyor…</div>
      </section>
    )
  }

  if (versionId === null) {
    return (
      <section>
        <h2 className="text-3xl font-extrabold tracking-display text-[#002366] mb-6">
          Yönetici Paneli
        </h2>
        <div className="card p-8 text-center">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 48 }}>
            calendar_add_on
          </span>
          <p className="text-base font-semibold text-on-surface mt-3">
            Henüz aktif bütçe versiyonu yok
          </p>
          <p className="text-sm text-on-surface-variant mt-1 max-w-md mx-auto">
            Çalışmaya başlamak için bir bütçe yılı + versiyon oluşturun.
            Tüm dashboard, sapma ve raporlar bu versiyon üzerinden hesaplanır.
          </p>
          <Link to="/budget/planning?tab=versions" className="btn-primary mt-4 inline-flex">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              add
            </span>
            Yeni Versiyon Oluştur
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="card mb-6">
        <div className="grid grid-cols-12 gap-6 items-start">
          <div className="col-span-12 xl:col-span-4">
            <h2 className="text-3xl font-extrabold tracking-display text-[#002366]">
              Yönetici Paneli
            </h2>
            <p className="text-sm text-on-surface-variant mt-2">
              Bugün yapmanız gereken işlemler, aktif bütçe özeti ve yönetim metrikleri
            </p>
            {versionName && year ? (
              <p className="text-sm text-on-surface-variant mt-3">
                FY{year} · {versionName}
              </p>
            ) : null}
          </div>
          <div className="col-span-12 xl:col-span-8">
            <TaskCenter embedded />
          </div>
        </div>
      </div>

      {kpisQuery.isError ? (
        <div className="card mb-6 text-sm text-error">KPI hesaplanırken hata oluştu.</div>
      ) : null}

      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-12 lg:col-span-3 card-tonal">
          <span className="label-sm block mb-4">{METRIC_LABELS.revenue}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-[3.2rem] font-extrabold tracking-display leading-none text-[#002366] num">
              {kpis ? formatCompactAmount(kpis.totalRevenue) : '—'}
            </span>
            <span className="text-sm font-bold text-on-surface-variant">TL</span>
          </div>
          <div className="mt-6">
            <span className="text-[0.7rem] text-on-surface-variant font-semibold">
              12 aylık toplulaştırılmış bütçe
            </span>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-3 card-tonal">
          <span className="label-sm block mb-4">{METRIC_LABELS.claims}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-[3.2rem] font-extrabold tracking-display leading-none text-[#002366] num">
              {kpis ? formatCompactAmount(kpis.totalClaims) : '—'}
            </span>
            <span className="text-sm font-bold text-on-surface-variant">TL</span>
          </div>
          <div className="mt-6">
            <span className="chip chip-warning">
              LR {kpis ? formatPercent(kpis.lossRatio * 100) : '—'}
            </span>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-3 card-tonal">
          <span className="label-sm">
            {METRIC_LABELS.technicalMargin}
            <HelpHint text="Teknik Marj = Prim Geliri − Hasar Maliyeti. Reasürans öncesi sigortacılık karlılığı." />
          </span>
          <p className="text-[3.2rem] font-extrabold tracking-display num mt-4 text-[#002366]">
            {kpis ? formatCompactAmount(kpis.technicalMargin) : '—'}
          </p>
          <p className="text-sm text-success font-bold mt-4">
            {kpis ? `${formatPercent(marginPercent)} marj` : '—'}
          </p>
        </div>

        <div className="col-span-12 lg:col-span-3 card-tonal">
          <span className="label-sm">
            {METRIC_LABELS.ebitda}
            <HelpHint text="EBITDA = Faiz, Vergi, Amortisman ve İtfa öncesi kar. Operasyonel performans göstergesi." />
          </span>
          <p className="text-[3.2rem] font-extrabold tracking-display num mt-4 text-[#002366]">
            {kpis ? formatCompactAmount(kpis.ebitda) : '—'}
          </p>
          <p className="text-sm text-primary font-bold mt-4">
            {kpis ? `${formatPercent(kpis.ebitdaMargin * 100)} marj` : '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 mb-6">
        <MiniKpiCard title={METRIC_LABELS.netProfit} value={kpis ? formatCompactAmount(kpis.netProfit) : '—'} />
        <MiniKpiCard title={METRIC_LABELS.technicalProfit} value={kpis ? formatCompactAmount(kpis.technicalProfit) : '—'} />
        <MiniKpiCard title={METRIC_LABELS.expenseRatio} value={kpis ? formatPercent(kpis.expenseRatio * 100) : '—'} />
        <MiniKpiCard title={METRIC_LABELS.combinedRatio} value={kpis ? formatPercent(kpis.combinedRatio * 100) : '—'} />
        <MiniKpiCard title={METRIC_LABELS.muallakRatio} value={kpis ? formatPercent(kpis.muallakRatio * 100) : '—'} />
        <MiniKpiCard title={METRIC_LABELS.financialIncome} value={kpis ? formatCompactAmount(kpis.financialIncome) : '—'} />
      </div>

      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-12 lg:col-span-4 card">
          <h3 className="text-base font-bold tracking-tight text-[#002366] mb-3">EBITDA Köprüsü</h3>
          <div style={{ height: 220 }}>
            {ebitdaBridge ? (
              <EbitdaBridgeChart labels={ebitdaBridge.labels} values={ebitdaBridge.values} />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-on-surface-variant">
                Veri yok.
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 card">
          <h3 className="text-base font-bold tracking-tight text-[#002366] mb-3">Loss Ratio (Aylık)</h3>
          <div style={{ height: 220 }}>
            {varianceSummaryQuery.isLoading ? (
              <div className="h-full flex items-center justify-center text-sm text-on-surface-variant">
                Grafik yükleniyor…
              </div>
            ) : (
              <LossRatioChart
                actualSeries={actualLossRatioSeries}
                benchmarkSeries={budgetLossRatioSeries}
              />
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 card">
          <h3 className="text-base font-bold tracking-tight text-[#002366] mb-3">Konsantrasyon Özeti</h3>
          {topCustomers.length === 0 ? (
            <p className="text-xs text-on-surface-variant">Henüz veri yok.</p>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((c) => (
                <TopCustomerRow
                  key={c.customerId}
                  label={c.customerName}
                  share={c.share * 100}
                />
              ))}
            </div>
          )}
          {concentration ? (
            <p className="text-[0.65rem] text-on-surface-variant mt-4">
              HHI: {concentration.hhi.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
              {' · '}
              Top-{topCustomers.length} pay: {formatPercent(concentration.topNShare * 100)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-12 lg:col-span-8 card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold tracking-tight text-[#002366]">
              Aylık Trend
            </h3>
          </div>
          <div style={{ height: 320 }}>
            {varianceSummaryQuery.isLoading ? (
              <div className="h-full flex items-center justify-center text-sm text-on-surface-variant">
                Grafik yükleniyor…
              </div>
            ) : (
              <FinOpsTrendChart
                revenueSeries={trendRevenueSeries}
                claimsSeries={trendClaimsSeries}
                technicalMarginSeries={trendTechnicalMarginSeries}
              />
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 card">
          <h3 className="text-lg font-bold tracking-tight text-[#002366] mb-4">
            Segment Dağılımı
          </h3>
          {segmentDistribution.length === 0 ? (
            <p className="text-xs text-on-surface-variant">Henüz veri yok.</p>
          ) : (
            <div style={{ height: 320 }}>
              <SegmentDistributionDonut labels={segmentLabels} values={segmentValues} />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-12 lg:col-span-7 card overflow-hidden">
          <h3 className="text-lg font-bold tracking-tight text-[#002366] mb-4">
            Top 10 Müşteri (Yıllık Gelir)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-low text-on-surface-variant">
                <tr>
                  <th className="text-left px-4 py-3">#</th>
                  <th className="text-left px-4 py-3">Müşteri</th>
                  <th className="text-left px-4 py-3">Segment</th>
                  <th className="text-right px-4 py-3">Bütçe (M)</th>
                  <th className="text-right px-4 py-3">Pay</th>
                </tr>
              </thead>
              <tbody>
                {topCustomersDetailed.map((customer, index) => (
                  <tr key={customer.customerId} className="border-b border-outline-variant/40">
                    <td className="px-4 py-3">{index + 1}</td>
                    <td className="px-4 py-3 font-semibold text-on-surface">{customer.customerName}</td>
                    <td className="px-4 py-3">
                      <span className="chip chip-neutral">{customer.segmentName}</span>
                    </td>
                    <td className="px-4 py-3 text-right num">
                      {formatAmount(toMillions(customer.revenue))}
                    </td>
                    <td className="px-4 py-3 text-right num">{formatPercent(customer.share * 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 card">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-bold tracking-tight text-[#002366]">Gider Kırılımı (Yıllık)</h3>
          </div>
          <div style={{ height: 420 }}>
            {opexBreakdownQuery.isLoading ? (
              <div className="h-full flex items-center justify-center text-sm text-on-surface-variant">
                Grafik yükleniyor…
              </div>
            ) : (
              <OpexBreakdownChart labels={opexLabels} values={opexValues} />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6" />
    </section>
  )
}

function MiniKpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="col-span-12 sm:col-span-6 lg:col-span-2 card text-center">
      <p className="label-sm uppercase">{title}</p>
      <p className="text-2xl font-extrabold tracking-display num mt-4 text-[#002366]">
        {value}
      </p>
    </div>
  )
}

function TopCustomerRow({ label, share }: { label: string; share: number }) {
  const safeShare = share ?? 0
  const width = Math.min(100, Math.max(0, safeShare))
  return (
    <div>
      <div className="flex justify-between items-end mb-1.5">
        <span className="text-sm font-bold text-on-surface truncate max-w-[70%]">{label}</span>
        <span className="text-sm font-extrabold num">
          {formatPercent(safeShare)}
        </span>
      </div>
      <div className="progress-track">
        <div className="progress-fill bg-primary" style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}
