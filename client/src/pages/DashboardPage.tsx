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
    <div>
      {/* Header */}
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="font-headline text-3xl font-extrabold tracking-[-0.02em] text-sl-on-surface">
            Executive Overview
          </h1>
          <p className="mt-2 max-w-2xl font-body text-sm text-sl-on-surface-variant">
            Gelir, hasar, kârlılık ve operasyonel oranlar — bütçe performans özeti
          </p>
        </div>
        <select className="cursor-pointer appearance-none rounded-md bg-sl-surface-lowest px-4 py-2 pr-8 font-body text-sm font-medium text-sl-on-surface shadow-[0_12px_32px_rgba(25,28,31,0.04)] outline-none focus:ring-2 focus:ring-sl-primary/40">
          <option>FY 2026</option>
          <option>FY 2025</option>
        </select>
      </div>

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <p className="font-body text-sl-on-surface-variant">Yükleniyor...</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-sl-error-container/30 p-6">
          <p className="font-body text-sm text-sl-error">KPI verileri yüklenemedi.</p>
        </div>
      )}

      {kpis && (
        <div className="grid grid-cols-12 gap-6">
          {/* Hero Card — Total Revenue */}
          <div className="col-span-12 lg:col-span-4 group relative overflow-hidden rounded-xl bg-sl-surface-container-low p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-sl-primary/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <span className="mb-4 block font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">
                  Toplam Gelir
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-headline text-4xl font-black tracking-tighter text-sl-on-surface">
                    {formatCurrency(kpis.totalRevenue)}
                  </span>
                </div>
              </div>
              <div className="mt-8 flex items-center justify-between">
                <div className="flex items-center gap-1.5 rounded-full bg-sl-tertiary-container/30 px-3 py-1.5 text-sl-tertiary">
                  <span className="material-symbols-outlined text-[16px] font-bold">trending_up</span>
                  <span className="text-sm font-bold">Yıllık brüt prim</span>
                </div>
                <span className="material-symbols-outlined text-4xl text-sl-outline-variant/30 font-light">account_balance</span>
              </div>
            </div>
          </div>

          {/* Financial Trajectory Chart */}
          <div className="col-span-12 lg:col-span-8 rounded-xl bg-sl-surface-lowest p-8 shadow-[0_12px_32px_rgba(25,28,31,0.02)]">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-headline text-lg font-bold tracking-tight text-sl-on-surface">Finansal Seyir</h3>
              <span className="rounded-md bg-sl-surface px-3 py-1 font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">
                Aylık
              </span>
            </div>
            <ChartErrorBoundary><RevenueClaimsChart versionId={versionId} /></ChartErrorBoundary>
          </div>

          {/* Claims & Segment Row */}
          <div className="col-span-12 lg:col-span-7 overflow-hidden rounded-xl bg-sl-surface-lowest p-0 shadow-[0_12px_32px_rgba(25,28,31,0.02)]">
            <div className="p-8 pb-4">
              <h3 className="font-headline text-lg font-bold tracking-tight text-sl-on-surface">Kârlılık Göstergeleri</h3>
            </div>
            <div className="flex flex-col">
              {/* Teknik Kâr */}
              <div className="group relative flex items-center justify-between bg-sl-surface-container-low/50 p-4 px-8 transition-colors hover:bg-sl-surface-container-low">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-sl-tertiary transition-all group-hover:w-1.5" />
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sl-surface text-sl-tertiary">
                    <span className="material-symbols-outlined text-[20px]">trending_up</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-sl-on-surface">Teknik Kâr</p>
                    <p className="mt-0.5 text-xs text-sl-on-surface-variant">Prim − hasar − gider</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-headline text-lg font-black tracking-tight text-sl-on-surface">
                    {formatCurrency(kpis.technicalProfit)}
                  </p>
                </div>
              </div>
              {/* Net Kâr */}
              <div className="group relative flex items-center justify-between bg-sl-surface-lowest p-4 px-8 transition-colors hover:bg-sl-surface-container-low">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-sl-tertiary opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sl-surface-container text-sl-tertiary">
                    <span className="material-symbols-outlined text-[20px]">savings</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-sl-on-surface">Net Kâr</p>
                    <p className="mt-0.5 text-xs text-sl-on-surface-variant">Tüm giderler sonrası</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-headline text-lg font-bold tracking-tight text-sl-on-surface">
                    {formatCurrency(kpis.netProfit)}
                  </p>
                </div>
              </div>
              {/* EBITDA */}
              <div className="group relative flex items-center justify-between bg-sl-surface-container-low/50 p-4 px-8 transition-colors hover:bg-sl-surface-container-low">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-sl-primary transition-all group-hover:w-1.5" />
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sl-surface text-sl-primary">
                    <span className="material-symbols-outlined text-[20px]">monitoring</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-sl-on-surface">EBITDA</p>
                    <p className="mt-0.5 text-xs text-sl-on-surface-variant">Faiz, amortisman öncesi</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-headline text-lg font-black tracking-tight text-sl-on-surface">
                    {formatCurrency(kpis.ebitda)}
                  </p>
                  <p className="text-xs font-bold text-sl-tertiary">
                    Marj: {formatPercent(kpis.ebitdaMargin)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Segment Distribution */}
          <div className="col-span-12 lg:col-span-5 flex flex-col rounded-xl bg-sl-surface-container-low p-8">
            <h3 className="mb-6 font-headline text-lg font-bold tracking-tight text-sl-on-surface">Segment Dağılımı</h3>
            <div className="flex flex-1 flex-col justify-center">
              <ChartErrorBoundary><SegmentDonut versionId={versionId} /></ChartErrorBoundary>
            </div>
          </div>

          {/* Operasyonel Oranlar — 4-sütun KPI */}
          <div className="col-span-12">
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
                title="Kâr Marjı"
                value={formatPercent(kpis.profitRatio)}
                icon="percent"
                trend={kpis.profitRatio > 0.1 ? 'up' : kpis.profitRatio < 0 ? 'down' : undefined}
              />
            </div>
          </div>

          {/* Detay Grafikler */}
          <div className="col-span-12">
            <h2 className="mb-6 font-headline text-xl font-bold tracking-tight text-sl-on-surface">
              Detay Grafikler
            </h2>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-xl bg-sl-surface-lowest p-8 shadow-[0_12px_32px_rgba(25,28,31,0.02)]">
                <h3 className="mb-4 font-headline text-base font-semibold text-sl-on-surface">Hasar Prim Oranı Trendi</h3>
                <ChartErrorBoundary><LossRatioChart versionId={versionId} /></ChartErrorBoundary>
              </div>
              <div className="rounded-xl bg-sl-surface-lowest p-8 shadow-[0_12px_32px_rgba(25,28,31,0.02)]">
                <h3 className="mb-4 font-headline text-base font-semibold text-sl-on-surface">Bileşik Oran</h3>
                <ChartErrorBoundary><CombinedRatioChart versionId={versionId} /></ChartErrorBoundary>
              </div>
              <div className="rounded-xl bg-sl-surface-lowest p-8 shadow-[0_12px_32px_rgba(25,28,31,0.02)]">
                <h3 className="mb-4 font-headline text-base font-semibold text-sl-on-surface">Gider Dağılımı</h3>
                <ChartErrorBoundary><ExpensePie versionId={versionId} /></ChartErrorBoundary>
              </div>
              <div className="rounded-xl bg-sl-surface-lowest p-8 shadow-[0_12px_32px_rgba(25,28,31,0.02)]">
                <h3 className="mb-4 font-headline text-base font-semibold text-sl-on-surface">En Büyük Müşteriler</h3>
                <ChartErrorBoundary><TopCustomersChart versionId={versionId} /></ChartErrorBoundary>
              </div>
              <div className="rounded-xl bg-sl-surface-lowest p-8 shadow-[0_12px_32px_rgba(25,28,31,0.02)]">
                <h3 className="mb-4 font-headline text-base font-semibold text-sl-on-surface">Kümülatif Gelir</h3>
                <ChartErrorBoundary><CumulativeAreaChart versionId={versionId} /></ChartErrorBoundary>
              </div>
              <div className="rounded-xl bg-sl-surface-lowest p-8 shadow-[0_12px_32px_rgba(25,28,31,0.02)]">
                <h3 className="mb-4 font-headline text-base font-semibold text-sl-on-surface">EBITDA Trendi</h3>
                <ChartErrorBoundary><EbitdaChart versionId={versionId} /></ChartErrorBoundary>
              </div>
            </div>
          </div>

          {/* Aylık Özet */}
          <div className="col-span-12">
            <h2 className="mb-6 font-headline text-xl font-bold tracking-tight text-sl-on-surface">
              Aylık Özet
            </h2>
            <div className="rounded-xl bg-sl-surface-lowest p-8 shadow-[0_12px_32px_rgba(25,28,31,0.02)]">
              <ChartErrorBoundary><MonthlySummaryTable versionId={versionId} /></ChartErrorBoundary>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
