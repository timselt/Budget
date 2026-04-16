import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/auth'
import { useDashboardKpis } from '../hooks/useDashboardKpis'
import { KpiCard } from '../components/ui/KpiCard'
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
  const { user, fetchUser } = useAuthStore()
  const [versionId] = useState<number>(1)

  useEffect(() => {
    if (!user) {
      fetchUser()
    }
  }, [user, fetchUser])

  const { data: kpis, isLoading, error } = useDashboardKpis(versionId)

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-text-muted">Bütçe performans özeti</p>
      </header>

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <p className="text-text-muted">Yükleniyor...</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm text-danger">KPI verileri yüklenemedi.</p>
        </div>
      )}

      {kpis && (
        <>
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-medium">Gelir & Hasar</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

          <section className="mb-8">
            <h2 className="mb-3 text-lg font-medium">Kârlılık</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

          <section className="mb-8">
            <h2 className="mb-3 text-lg font-medium">Oranlar</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

          <section className="mb-8">
            <h2 className="mb-3 text-lg font-medium">Grafikler</h2>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <RevenueClaimsChart versionId={versionId} />
              <LossRatioChart versionId={versionId} />
              <EbitdaChart versionId={versionId} />
              <CombinedRatioChart versionId={versionId} />
              <SegmentDonut versionId={versionId} />
              <ExpensePie versionId={versionId} />
              <CumulativeAreaChart versionId={versionId} />
              <TopCustomersChart versionId={versionId} />
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-lg font-medium">Aylık Özet</h2>
            <MonthlySummaryTable versionId={versionId} />
          </section>
        </>
      )}
    </div>
  )
}
