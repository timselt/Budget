import { useState } from 'react'
import { useDashboardKpis } from '../hooks/useDashboardKpis'
import { KpiCard } from '../components/ui/KpiCard'
import { ChartErrorBoundary } from '../components/ui/ChartErrorBoundary'
import { RevenueClaimsChart } from '../components/dashboard/RevenueClaimsChart'
import { LossRatioChart } from '../components/dashboard/LossRatioChart'
import { EbitdaChart } from '../components/dashboard/EbitdaChart'
import { SegmentDonut } from '../components/dashboard/SegmentDonut'
import { ExpensePie } from '../components/dashboard/ExpensePie'
import { CumulativeAreaChart } from '../components/dashboard/CumulativeAreaChart'
import { CombinedRatioChart } from '../components/dashboard/CombinedRatioChart'
import { TopCustomersChart } from '../components/dashboard/TopCustomersChart'
import { MonthlySummaryTable } from '../components/dashboard/MonthlySummaryTable'

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function DashboardPage() {
  const [versionId] = useState<number>(1)
  const { data: kpis, isLoading, error } = useDashboardKpis(versionId)

  return (
    <div>
      <header className="mb-10">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-sl-on-surface">
          Dashboard
        </h1>
        <p className="font-body text-sm text-sl-on-surface-variant">
          Bütçe performans özeti
        </p>
      </header>

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <p className="font-body text-sl-on-surface-variant">Yükleniyor...</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-sl-error-container/30 p-4">
          <p className="font-body text-sm text-sl-error">
            KPI verileri yüklenemedi.
          </p>
        </div>
      )}

      {kpis && (
        <>
          <section className="mb-12">
            <h2 className="mb-4 font-display text-lg font-medium text-sl-on-surface">
              Gelir & Hasar
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard title="Toplam Gelir" value={formatCurrency(kpis.totalRevenue)} />
              <KpiCard title="Toplam Hasar" value={formatCurrency(kpis.totalClaims)} trend="down" />
              <KpiCard title="Teknik Marj" value={formatCurrency(kpis.technicalMargin)} trend="up" />
              <KpiCard
                title="Hasar Prim Oranı"
                value={formatPercent(kpis.lossRatio)}
                trend={kpis.lossRatio > 0.7 ? 'down' : 'up'}
              />
            </div>
          </section>

          <section className="mb-12">
            <h2 className="mb-4 font-display text-lg font-medium text-sl-on-surface">
              Kârlılık
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                title="Teknik Kâr"
                value={formatCurrency(kpis.technicalProfit)}
                trend={kpis.technicalProfit > 0 ? 'up' : 'down'}
              />
              <KpiCard
                title="Net Kâr"
                value={formatCurrency(kpis.netProfit)}
                trend={kpis.netProfit > 0 ? 'up' : 'down'}
              />
              <KpiCard
                title="EBITDA"
                value={formatCurrency(kpis.ebitda)}
                trend={kpis.ebitda > 0 ? 'up' : 'down'}
              />
              <KpiCard
                title="Kâr Marjı"
                value={formatPercent(kpis.profitRatio)}
                trend={kpis.profitRatio > 0.1 ? 'up' : 'down'}
              />
            </div>
          </section>

          <section className="mb-12">
            <h2 className="mb-4 font-display text-lg font-medium text-sl-on-surface">
              Oranlar
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard title="Gider Oranı" value={formatPercent(kpis.expenseRatio)} />
              <KpiCard
                title="Bileşik Oran"
                value={formatPercent(kpis.combinedRatio)}
                trend={kpis.combinedRatio < 1 ? 'up' : 'down'}
              />
              <KpiCard title="EBITDA Marjı" value={formatPercent(kpis.ebitdaMargin)} />
              <KpiCard title="Muallak Oranı" value={formatPercent(kpis.muallakRatio)} />
            </div>
          </section>

          <section className="mb-12">
            <h2 className="mb-4 font-display text-lg font-medium text-sl-on-surface">
              Grafikler
            </h2>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartErrorBoundary><RevenueClaimsChart versionId={versionId} /></ChartErrorBoundary>
              <ChartErrorBoundary><LossRatioChart versionId={versionId} /></ChartErrorBoundary>
              <ChartErrorBoundary><EbitdaChart versionId={versionId} /></ChartErrorBoundary>
              <ChartErrorBoundary><CombinedRatioChart versionId={versionId} /></ChartErrorBoundary>
              <ChartErrorBoundary><SegmentDonut versionId={versionId} /></ChartErrorBoundary>
              <ChartErrorBoundary><ExpensePie versionId={versionId} /></ChartErrorBoundary>
              <ChartErrorBoundary><CumulativeAreaChart versionId={versionId} /></ChartErrorBoundary>
              <ChartErrorBoundary><TopCustomersChart versionId={versionId} /></ChartErrorBoundary>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="mb-4 font-display text-lg font-medium text-sl-on-surface">
              Aylık Özet
            </h2>
            <ChartErrorBoundary><MonthlySummaryTable versionId={versionId} /></ChartErrorBoundary>
          </section>
        </>
      )}
    </div>
  )
}
