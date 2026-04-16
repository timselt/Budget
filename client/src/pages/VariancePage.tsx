import { useState } from 'react'
import {
  useVarianceSummary,
  useCustomerVariance,
  useVarianceHeatmap,
} from '../hooks/useVariance'
import { WaterfallChart } from '../components/variance/WaterfallChart'
import { VarianceTable } from '../components/variance/VarianceTable'
import { VarianceHeatmap } from '../components/variance/VarianceHeatmap'

type TabKey = 'waterfall' | 'table' | 'heatmap'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'waterfall', label: 'Selale Grafik' },
  { key: 'table', label: 'Musteri Tablosu' },
  { key: 'heatmap', label: 'Isitma Haritasi' },
]

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function VariancePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('waterfall')

  // TODO: version selector — simdilik hardcoded versionId=1
  const versionId = 1

  const { data: summary, isLoading: summaryLoading, error: summaryError } = useVarianceSummary(versionId)
  const { data: customers, isLoading: customersLoading } = useCustomerVariance(versionId)
  const { data: heatmap, isLoading: heatmapLoading } = useVarianceHeatmap(versionId)

  const isLoading = summaryLoading || customersLoading || heatmapLoading

  const totalRevenueVariance = summary
    ? summary.totalActualRevenue - summary.totalBudgetRevenue
    : 0
  const totalRevenueVariancePct = summary && summary.totalBudgetRevenue !== 0
    ? totalRevenueVariance / summary.totalBudgetRevenue
    : 0
  const totalClaimsVariance = summary
    ? summary.totalActualClaims - summary.totalBudgetClaims
    : 0
  const totalClaimsVariancePct = summary && summary.totalBudgetClaims !== 0
    ? totalClaimsVariance / summary.totalBudgetClaims
    : 0

  const criticalCount = customers?.filter((c) => c.alert === 'critical').length ?? 0
  const highCount = customers?.filter((c) => c.alert === 'high').length ?? 0

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-headline text-3xl font-extrabold tracking-[-0.02em] text-sl-on-surface">
          Sapma Analizi
        </h1>
        <p className="mt-2 max-w-2xl font-body text-sm text-sl-on-surface-variant">
          Bütçe ve gerçekleşen karşılaştırması — segment, ürün ve müşteri bazında sapma takibi.
        </p>
      </header>

      {summaryError && (
        <div className="mb-12 rounded-lg bg-sl-error-container/30 p-4">
          <p className="font-body text-sm text-sl-error">
            Varyans verileri yuklenemedi.
          </p>
        </div>
      )}

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <p className="font-body text-sl-on-surface-variant">Yukleniyor...</p>
        </div>
      )}

      {summary && (
        <>
          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-sl-surface-lowest p-5 shadow-[var(--sl-shadow-ambient)]">
              <p className="font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">
                Gelir Sapması
              </p>
              <p className={`mt-2 font-headline text-2xl font-black tabular-nums tracking-tighter ${totalRevenueVariance >= 0 ? 'text-sl-success' : 'text-sl-error'}`}>
                {formatCurrency(totalRevenueVariance)}
              </p>
              <p className="mt-1 text-xs font-bold text-sl-on-surface-variant">
                {formatPercent(totalRevenueVariancePct)}
              </p>
            </div>

            <div className="rounded-xl bg-sl-surface-lowest p-5 shadow-[var(--sl-shadow-ambient)]">
              <p className="font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">
                Hasar Sapması
              </p>
              <p className={`mt-2 font-headline text-2xl font-black tabular-nums tracking-tighter ${totalClaimsVariance <= 0 ? 'text-sl-success' : 'text-sl-error'}`}>
                {formatCurrency(totalClaimsVariance)}
              </p>
              <p className="mt-1 text-xs font-bold text-sl-on-surface-variant">
                {formatPercent(totalClaimsVariancePct)}
              </p>
            </div>

            <div className="rounded-xl bg-sl-surface-lowest p-5 shadow-[var(--sl-shadow-ambient)]">
              <p className="font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">
                Kritik Uyarı
              </p>
              <p className="mt-2 font-headline text-2xl font-black tabular-nums tracking-tighter text-sl-error">
                {criticalCount}
              </p>
              <p className="mt-1 text-xs text-sl-on-surface-variant">müşteri</p>
            </div>

            <div className="rounded-xl bg-sl-surface-lowest p-5 shadow-[var(--sl-shadow-ambient)]">
              <p className="font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">
                Yüksek Uyarı
              </p>
              <p className="mt-2 font-headline text-2xl font-black tabular-nums tracking-tighter text-sl-warning">
                {highCount}
              </p>
              <p className="mt-1 text-xs text-sl-on-surface-variant">müşteri</p>
            </div>
          </section>

          <nav className="mb-5 flex gap-1 rounded-lg bg-sl-surface-low p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-md px-4 py-2 font-body text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-sl-surface-lowest text-sl-on-surface shadow-[var(--sl-shadow-sm)]'
                    : 'text-sl-on-surface-variant hover:text-sl-on-surface'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {activeTab === 'waterfall' && (
            <WaterfallChart data={summary.monthlyVariances} />
          )}

          {activeTab === 'table' && customers && (
            <VarianceTable data={customers} />
          )}

          {activeTab === 'heatmap' && heatmap && (
            <VarianceHeatmap data={heatmap} />
          )}
        </>
      )}
    </div>
  )
}
