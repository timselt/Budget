import { useState } from 'react'
import { useDashboardKpis } from '../hooks/useDashboardKpis'
import { ChartErrorBoundary } from '../components/ui/ChartErrorBoundary'
import { RevenueClaimsChart } from '../components/dashboard/RevenueClaimsChart'
import { LossRatioChart } from '../components/dashboard/LossRatioChart'
import { SegmentDonut } from '../components/dashboard/SegmentDonut'
import { ExpensePie } from '../components/dashboard/ExpensePie'
import { EbitdaBridge } from '../components/dashboard/EbitdaBridge'
import { ServiceLinePerformance } from '../components/dashboard/ServiceLinePerformance'
import { CriticalAlerts } from '../components/dashboard/CriticalAlerts'
import { MonthlySummaryTable } from '../components/dashboard/MonthlySummaryTable'

function formatPercent(value: number): string {
  return `%${(value * 100).toFixed(1)}`
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatMillions(value: number): string {
  return `${(value / 1_000_000).toFixed(1)}M`
}

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  target?: { value: string; percent: number }
  trend?: { direction: 'up' | 'down'; text: string }
  accent?: 'primary' | 'tertiary' | 'success' | 'warning'
}

function KpiMiniCard({ label, value, sub, target, trend, accent = 'primary' }: KpiCardProps) {
  const accentColor = {
    primary: 'text-sl-primary',
    tertiary: 'text-sl-tertiary',
    success: 'text-sl-success',
    warning: 'text-sl-warning',
  }[accent]

  return (
    <div className="rounded-xl bg-sl-surface-lowest p-5 shadow-[var(--sl-shadow-ambient)]">
      <p className="font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">
        {label}
      </p>
      <p className="mt-2 font-headline text-2xl font-black tracking-tighter text-sl-on-surface">
        {value}
      </p>
      {sub && <p className={`mt-1 text-xs font-bold ${accentColor}`}>{sub}</p>}
      {target && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[0.6rem]">
            <span className="text-sl-on-surface-variant">Hedef: {target.value}</span>
            <span className="font-bold text-sl-on-surface-variant">%{target.percent}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sl-surface-container-high">
            <div
              className={`h-full rounded-full ${accent === 'warning' ? 'bg-sl-warning' : accent === 'success' ? 'bg-sl-success' : 'bg-sl-primary'}`}
              style={{ width: `${Math.min(target.percent, 100)}%` }}
            />
          </div>
        </div>
      )}
      {trend && (
        <div className="mt-2 flex items-center gap-1">
          <span className={`material-symbols-outlined text-[14px] ${trend.direction === 'up' ? 'text-sl-success' : 'text-sl-primary'}`}>
            {trend.direction === 'up' ? 'trending_up' : 'trending_down'}
          </span>
          <span className="text-[0.65rem] text-sl-on-surface-variant">{trend.text}</span>
        </div>
      )}
    </div>
  )
}

export function DashboardPage() {
  const [versionId] = useState<number>(1)
  const { data: kpis, isLoading, error } = useDashboardKpis(versionId)

  return (
    <div>
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-headline text-3xl font-extrabold tracking-[-0.02em] text-sl-on-surface">
            Dashboard
          </h1>
          <p className="mt-2 max-w-2xl font-body text-sm text-sl-on-surface-variant">
            Gelir, hasar, kârlılık ve operasyonel oranlar — FinOpsTur performans özeti.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-md bg-sl-surface-container-high px-3 py-2 font-body text-sm font-medium text-sl-on-surface transition-colors hover:bg-sl-surface-container-highest">
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            Filtrele
          </button>
          <button className="flex items-center gap-2 rounded-md bg-gradient-to-br from-sl-primary to-sl-primary-container px-4 py-2 font-body text-sm font-medium text-white shadow-[0_4px_12px_rgba(181,3,3,0.15)] transition-all duration-200 hover:shadow-[0_8px_20px_rgba(181,3,3,0.25)] hover:brightness-110 active:scale-[0.97]">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Rapor İndir
          </button>
        </div>
      </header>

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
          {/* Hero — Toplam Gelir */}
          <div className="col-span-12 lg:col-span-4 group relative overflow-hidden rounded-xl bg-sl-surface-container-low p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-sl-primary/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <span className="mb-4 block font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">
                  Toplam Gelir
                </span>
                <span className="font-headline text-4xl font-black tracking-tighter text-sl-on-surface">
                  {formatCurrency(kpis.totalRevenue)}
                </span>
              </div>
              <div className="mt-8 flex items-center justify-between">
                <div className="flex items-center gap-1.5 rounded-full bg-sl-tertiary-container/30 px-3 py-1.5 text-sl-tertiary">
                  <span className="material-symbols-outlined text-[16px] font-bold">trending_up</span>
                  <span className="text-sm font-bold">+18,4% vs FY25</span>
                </div>
                <span className="material-symbols-outlined text-4xl text-sl-outline-variant/30 font-light">account_balance</span>
              </div>
            </div>
          </div>

          {/* KPI Row — 4 cards */}
          <div className="col-span-12 lg:col-span-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KpiMiniCard
              label="Teknik Marj"
              value={formatMillions(kpis.technicalMargin)}
              sub={`Marj: ${formatPercent(kpis.technicalProfitRatio)}`}
              target={{ value: '1.125M', percent: 82 }}
              accent="tertiary"
            />
            <KpiMiniCard
              label="EBITDA"
              value={formatMillions(kpis.ebitda)}
              sub={`Marj: ${formatPercent(kpis.ebitdaMargin)}`}
              target={{ value: '395M', percent: 91 }}
              accent="primary"
            />
            <KpiMiniCard
              label="Loss Ratio"
              value={formatPercent(kpis.lossRatio)}
              sub="Hasar / Prim"
              trend={{ direction: kpis.lossRatio > 0.6 ? 'down' : 'up', text: 'Benchmark: %55' }}
              accent="warning"
            />
            <KpiMiniCard
              label="Bileşik Oran"
              value={formatPercent(kpis.combinedRatio)}
              sub={kpis.combinedRatio < 1 ? 'Hedef altı' : 'Hedef üstü'}
              trend={{ direction: kpis.combinedRatio < 1 ? 'up' : 'down', text: 'Hedef: %100 altı' }}
              accent={kpis.combinedRatio < 1 ? 'success' : 'warning'}
            />
          </div>

          {/* Gelir / Hasar / Teknik Marj trend */}
          <div className="col-span-12 lg:col-span-8 rounded-xl bg-sl-surface-lowest p-6 shadow-[var(--sl-shadow-ambient)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="-ml-2 font-headline text-base font-bold tracking-tight text-sl-on-surface">
                Gelir / Hasar / Teknik Marj — Aylık Trend
              </h3>
              <span className="rounded-md bg-sl-surface px-3 py-1 font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">
                12 Ay
              </span>
            </div>
            <ChartErrorBoundary><RevenueClaimsChart versionId={versionId} /></ChartErrorBoundary>
          </div>

          {/* Gelir Segmentasyonu donut */}
          <div className="col-span-12 lg:col-span-4 flex flex-col rounded-xl bg-sl-surface-lowest p-6 shadow-[var(--sl-shadow-ambient)]">
            <h3 className="-ml-2 mb-4 font-headline text-base font-bold tracking-tight text-sl-on-surface">
              Gelir Segmentasyonu
            </h3>
            <div className="flex flex-1 flex-col justify-center">
              <ChartErrorBoundary><SegmentDonut versionId={versionId} /></ChartErrorBoundary>
            </div>
          </div>

          {/* EBITDA Bridge + LR + Gider Kırılımı — 3 equal columns */}
          <div className="col-span-12 lg:col-span-4 rounded-xl bg-sl-surface-lowest p-6 shadow-[var(--sl-shadow-ambient)]">
            <h3 className="-ml-2 mb-2 font-headline text-base font-bold tracking-tight text-sl-on-surface">
              EBITDA Köprüsü
            </h3>
            <p className="mb-4 text-xs text-sl-on-surface-variant">FY25 → FY26 geçiş analizi</p>
            <ChartErrorBoundary><EbitdaBridge /></ChartErrorBoundary>
          </div>

          <div className="col-span-12 lg:col-span-4 rounded-xl bg-sl-surface-lowest p-6 shadow-[var(--sl-shadow-ambient)]">
            <h3 className="-ml-2 mb-4 font-headline text-base font-bold tracking-tight text-sl-on-surface">
              Loss Ratio (Aylık)
            </h3>
            <ChartErrorBoundary><LossRatioChart versionId={versionId} /></ChartErrorBoundary>
          </div>

          <div className="col-span-12 lg:col-span-4 rounded-xl bg-sl-surface-lowest p-6 shadow-[var(--sl-shadow-ambient)]">
            <h3 className="-ml-2 mb-4 font-headline text-base font-bold tracking-tight text-sl-on-surface">
              Gider Kırılımı
            </h3>
            <ChartErrorBoundary><ExpensePie versionId={versionId} /></ChartErrorBoundary>
          </div>

          {/* Service Lines + Critical Alerts */}
          <div className="col-span-12 lg:col-span-7">
            <ServiceLinePerformance />
          </div>
          <div className="col-span-12 lg:col-span-5">
            <CriticalAlerts />
          </div>

          {/* Operasyonel Oranlar */}
          <div className="col-span-12">
            <h2 className="-ml-2 mb-5 font-headline text-xl font-bold tracking-tight text-sl-on-surface">
              Operasyonel Oranlar
            </h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiMiniCard
                label="Hasar Prim Oranı"
                value={formatPercent(kpis.lossRatio)}
                trend={{ direction: kpis.lossRatio > 0.6 ? 'down' : 'up', text: 'vs FY25' }}
                accent="warning"
              />
              <KpiMiniCard
                label="Gider Oranı"
                value={formatPercent(kpis.expenseRatio)}
                accent="tertiary"
              />
              <KpiMiniCard
                label="Bileşik Oran"
                value={formatPercent(kpis.combinedRatio)}
                trend={{ direction: kpis.combinedRatio < 1 ? 'up' : 'down', text: kpis.combinedRatio < 1 ? 'Hedef altı' : 'Hedef üstü' }}
                accent={kpis.combinedRatio < 1 ? 'success' : 'primary'}
              />
              <KpiMiniCard
                label="Kâr Marjı"
                value={formatPercent(kpis.profitRatio)}
                trend={{ direction: kpis.profitRatio > 0.1 ? 'up' : 'down', text: 'Net kâr / gelir' }}
                accent={kpis.profitRatio > 0.1 ? 'success' : 'warning'}
              />
            </div>
          </div>

          {/* Aylık Özet Tablo */}
          <div className="col-span-12 rounded-xl bg-sl-surface-lowest p-6 shadow-[var(--sl-shadow-ambient)]">
            <h3 className="-ml-2 mb-4 font-headline text-base font-bold tracking-tight text-sl-on-surface">
              Aylık Özet
            </h3>
            <ChartErrorBoundary><MonthlySummaryTable versionId={versionId} /></ChartErrorBoundary>
          </div>
        </div>
      )}
    </div>
  )
}
