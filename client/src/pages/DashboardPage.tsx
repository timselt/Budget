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
  return `${(value * 100).toFixed(1)}%`
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
    <div className="max-w-7xl">
      <header className="mb-12">
        <h1 className="font-headline text-4xl font-black tracking-tighter text-sl-on-surface">
          Executive Overview
        </h1>
        <p className="mt-2 max-w-2xl font-body text-lg text-sl-on-surface-variant">
          Bütçe performans özeti — gelir, hasar, kârlılık ve operasyonel oranlar
        </p>
      </header>

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <p className="font-body text-sl-on-surface-variant">Yükleniyor...</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-sl-error-container/30 p-6">
          <p className="font-body text-sm text-sl-error">
            KPI verileri yüklenemedi.
          </p>
        </div>
      )}

      {kpis && (
        <>
          {/* Hero KPIs — Bento Grid */}
          <section className="mb-12">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <KpiCard
                title="Toplam Gelir"
                value={formatCurrency(kpis.totalRevenue)}
                subtitle="Yıllık brüt prim"
                icon="payments"
                trend="up"
              />
              <KpiCard
                title="Toplam Hasar"
                value={formatCurrency(kpis.totalClaims)}
                subtitle="Ödenen + muallak"
                icon="warning"
                trend={kpis.totalClaims > 0 ? 'down' : undefined}
              />
              <KpiCard
                title="Teknik Marj"
                value={formatCurrency(kpis.technicalMargin)}
                icon="account_balance"
                variant="gradient"
                trend={kpis.technicalMargin > 0 ? 'up' : kpis.technicalMargin < 0 ? 'down' : undefined}
              />
            </div>
          </section>

          {/* Charts — Financial Trajectory + Segment Distribution */}
          <section className="mb-12">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 rounded-xl bg-sl-surface-lowest p-8 shadow-[0_12px_32px_rgba(25,28,31,0.04)]">
                <h2 className="mb-6 font-headline text-lg font-semibold tracking-tight text-sl-on-surface">
                  Finansal Seyir
                </h2>
                <ChartErrorBoundary><RevenueClaimsChart versionId={versionId} /></ChartErrorBoundary>
              </div>
              <div className="rounded-xl bg-sl-surface-lowest p-8 shadow-[0_12px_32px_rgba(25,28,31,0.04)]">
                <h2 className="mb-6 font-headline text-lg font-semibold tracking-tight text-sl-on-surface">
                  Segment Dağılımı
                </h2>
                <ChartErrorBoundary><SegmentDonut versionId={versionId} /></ChartErrorBoundary>
              </div>
            </div>
          </section>

          {/* Kârlılık KPIs */}
          <section className="mb-12">
            <h2 className="mb-6 font-headline text-xl font-bold tracking-tight text-sl-on-surface">
              Kârlılık Göstergeleri
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                title="Teknik Kâr"
                value={formatCurrency(kpis.technicalProfit)}
                icon="trending_up"
                trend={kpis.technicalProfit > 0 ? 'up' : kpis.technicalProfit < 0 ? 'down' : undefined}
              />
              <KpiCard
                title="Net Kâr"
                value={formatCurrency(kpis.netProfit)}
                icon="savings"
                trend={kpis.netProfit > 0 ? 'up' : kpis.netProfit < 0 ? 'down' : undefined}
              />
              <KpiCard
                title="EBITDA"
                value={formatCurrency(kpis.ebitda)}
                icon="monitoring"
                trend={kpis.ebitda > 0 ? 'up' : kpis.ebitda < 0 ? 'down' : undefined}
              />
              <KpiCard
                title="Kâr Marjı"
                value={formatPercent(kpis.profitRatio)}
                icon="percent"
                trend={kpis.profitRatio > 0.1 ? 'up' : kpis.profitRatio < 0 ? 'down' : undefined}
              />
            </div>
          </section>

          {/* Oranlar + Charts Row */}
          <section className="mb-12">
            <h2 className="mb-6 font-headline text-xl font-bold tracking-tight text-sl-on-surface">
              Operasyonel Oranlar
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                title="Hasar Prim Oranı"
                value={formatPercent(kpis.lossRatio)}
                icon="analytics"
                trend={kpis.lossRatio > 0 ? (kpis.lossRatio > 0.7 ? 'down' : 'up') : undefined}
              />
              <KpiCard
                title="Gider Oranı"
                value={formatPercent(kpis.expenseRatio)}
                icon="receipt_long"
              />
              <KpiCard
                title="Bileşik Oran"
                value={formatPercent(kpis.combinedRatio)}
                icon="donut_large"
                trend={kpis.combinedRatio > 0 ? (kpis.combinedRatio < 1 ? 'up' : 'down') : undefined}
              />
              <KpiCard
                title="Muallak Oranı"
                value={formatPercent(kpis.muallakRatio)}
                icon="pending_actions"
              />
            </div>
          </section>

          {/* Additional Charts */}
          <section className="mb-12">
            <h2 className="mb-6 font-headline text-xl font-bold tracking-tight text-sl-on-surface">
              Detay Grafikler
            </h2>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-xl bg-sl-surface-lowest p-8 shadow-[0_12px_32px_rgba(25,28,31,0.04)]">
                <h3 className="mb-4 font-headline text-base font-semibold text-sl-on-surface">Hasar Prim Oranı Trendi</h3>
                <ChartErrorBoundary><LossRatioChart versionId={versionId} /></ChartErrorBoundary>
              </div>
              <div className="rounded-xl bg-sl-surface-lowest p-8 shadow-[0_12px_32px_rgba(25,28,31,0.04)]">
                <h3 className="mb-4 font-headline text-base font-semibold text-sl-on-surface">EBITDA Trendi</h3>
                <ChartErrorBoundary><EbitdaChart versionId={versionId} /></ChartErrorBoundary>
              </div>
              <div className="rounded-xl bg-sl-surface-lowest p-8 shadow-[0_12px_32px_rgba(25,28,31,0.04)]">
                <h3 className="mb-4 font-headline text-base font-semibold text-sl-on-surface">Bileşik Oran</h3>
                <ChartErrorBoundary><CombinedRatioChart versionId={versionId} /></ChartErrorBoundary>
              </div>
              <div className="rounded-xl bg-sl-surface-lowest p-8 shadow-[0_12px_32px_rgba(25,28,31,0.04)]">
                <h3 className="mb-4 font-headline text-base font-semibold text-sl-on-surface">Gider Dağılımı</h3>
                <ChartErrorBoundary><ExpensePie versionId={versionId} /></ChartErrorBoundary>
              </div>
              <div className="rounded-xl bg-sl-surface-lowest p-8 shadow-[0_12px_32px_rgba(25,28,31,0.04)]">
                <h3 className="mb-4 font-headline text-base font-semibold text-sl-on-surface">Kümülatif Gelir</h3>
                <ChartErrorBoundary><CumulativeAreaChart versionId={versionId} /></ChartErrorBoundary>
              </div>
              <div className="rounded-xl bg-sl-surface-lowest p-8 shadow-[0_12px_32px_rgba(25,28,31,0.04)]">
                <h3 className="mb-4 font-headline text-base font-semibold text-sl-on-surface">En Büyük Müşteriler</h3>
                <ChartErrorBoundary><TopCustomersChart versionId={versionId} /></ChartErrorBoundary>
              </div>
            </div>
          </section>

          {/* Monthly Summary */}
          <section className="mb-12">
            <h2 className="mb-6 font-headline text-xl font-bold tracking-tight text-sl-on-surface">
              Aylık Özet
            </h2>
            <div className="rounded-xl bg-sl-surface-lowest p-8 shadow-[0_12px_32px_rgba(25,28,31,0.04)]">
              <ChartErrorBoundary><MonthlySummaryTable versionId={versionId} /></ChartErrorBoundary>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
