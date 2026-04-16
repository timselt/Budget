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
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Varyans Analizi
        </h1>
        <p className="text-sm text-text-muted">
          Butce ve gerceklesen karsilastirmasi
        </p>
      </header>

      {summaryError && (
        <div className="mb-6 rounded-lg border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm text-danger">Varyans verileri yuklenemedi.</p>
        </div>
      )}

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <p className="text-text-muted">Yukleniyor...</p>
        </div>
      )}

      {summary && (
        <>
          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-text-muted">Gelir Sapmasi</p>
              <p className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${totalRevenueVariance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(totalRevenueVariance)}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                {formatPercent(totalRevenueVariancePct)}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-text-muted">Hasar Sapmasi</p>
              <p className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${totalClaimsVariance <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(totalClaimsVariance)}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                {formatPercent(totalClaimsVariancePct)}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-text-muted">Kritik Uyari</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-red-600">
                {criticalCount}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">musteri</p>
            </div>

            <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-text-muted">Yuksek Uyari</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-orange-600">
                {highCount}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">musteri</p>
            </div>
          </section>

          <nav className="mb-4 flex gap-1 rounded-lg border border-border bg-slate-50 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-text-muted hover:text-slate-700'
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
