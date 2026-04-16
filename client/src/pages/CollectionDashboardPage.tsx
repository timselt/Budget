import { useNavigate } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useCollectionConsolidated } from '../hooks/useCollectionConsolidated'
import { KpiCard } from '../components/ui/KpiCard'
import { ChartCard } from '../components/dashboard/ChartCard'
import { ChartErrorBoundary } from '../components/ui/ChartErrorBoundary'
import type { SegmentSummary, TopOverdueCustomer } from '../types/collections'

const RISK_COLORS = {
  high: '#ba1a1a',
  medium: '#d4a017',
  low: '#5eccbe',
} as const

const SEGMENT_COLORS = [
  '#6750a4', '#0061a4', '#006e1c', '#984061',
  '#7d5700', '#006874', '#8b4513', '#4a148c',
] as const

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

function SegmentComparisonTable({ segments }: { segments: SegmentSummary[] }) {
  const navigate = useNavigate()

  if (!Array.isArray(segments) || segments.length === 0) {
    return (
      <p className="py-8 text-center font-body text-sm text-sl-on-surface-variant">
        Segment verisi bulunamadi.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-sl-outline-variant/15">
            <th className="py-3 pr-4 font-body text-xs font-medium uppercase tracking-wider text-sl-on-surface-variant">
              Segment
            </th>
            <th className="py-3 pr-4 text-right font-body text-xs font-medium uppercase tracking-wider text-sl-on-surface-variant">
              Toplam Alacak
            </th>
            <th className="py-3 pr-4 text-right font-body text-xs font-medium uppercase tracking-wider text-sl-on-surface-variant">
              Vadesi Gecen
            </th>
            <th className="py-3 pr-4 text-right font-body text-xs font-medium uppercase tracking-wider text-sl-on-surface-variant">
              Gecikme %
            </th>
            <th className="py-3 pr-4 text-right font-body text-xs font-medium uppercase tracking-wider text-sl-on-surface-variant">
              Musteri
            </th>
            <th className="py-3 text-right font-body text-xs font-medium uppercase tracking-wider text-sl-on-surface-variant">
              Yuksek Risk
            </th>
          </tr>
        </thead>
        <tbody>
          {segments.map((seg) => (
            <tr
              key={seg.segmentId}
              onClick={() => navigate(`/tahsilat/segment/${seg.segmentId}`)}
              className="cursor-pointer border-b border-sl-outline-variant/8 transition-colors hover:bg-sl-surface-high/50"
            >
              <td className="py-3 pr-4 font-body text-sm font-medium text-sl-on-surface">
                {seg.segmentName}
              </td>
              <td className="py-3 pr-4 text-right font-body text-sm tabular-nums text-sl-on-surface">
                {formatCurrency(seg.totalReceivable)}
              </td>
              <td className="py-3 pr-4 text-right font-body text-sm tabular-nums text-sl-error">
                {formatCurrency(seg.overdue)}
              </td>
              <td className="py-3 pr-4 text-right font-body text-sm tabular-nums text-sl-on-surface">
                {formatPercent(seg.overdueRatio)}
              </td>
              <td className="py-3 pr-4 text-right font-body text-sm tabular-nums text-sl-on-surface">
                {seg.customerCount}
              </td>
              <td className="py-3 text-right font-body text-sm tabular-nums text-sl-error">
                {seg.highRiskCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RiskDistributionChart({ segments }: { segments: SegmentSummary[] }) {
  if (!Array.isArray(segments) || segments.length === 0) return null

  const chartData = segments.map((seg) => ({
    name: seg.segmentName,
    high: seg.highRiskCount,
    medium: seg.mediumRiskCount,
    low: seg.lowRiskCount,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: 'var(--color-sl-on-surface-variant)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--color-sl-on-surface-variant)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--color-sl-surface-lowest)',
            border: '1px solid var(--color-sl-outline-variant)',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="high" name="Yuksek" stackId="risk" fill={RISK_COLORS.high} radius={[0, 0, 0, 0]} />
        <Bar dataKey="medium" name="Orta" stackId="risk" fill={RISK_COLORS.medium} />
        <Bar dataKey="low" name="Dusuk" stackId="risk" fill={RISK_COLORS.low} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function SegmentShareDonut({ segments }: { segments: SegmentSummary[] }) {
  if (!Array.isArray(segments) || segments.length === 0) return null

  const chartData = segments.map((seg) => ({
    name: seg.segmentName,
    value: seg.totalReceivable,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={110}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
        >
          {chartData.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={SEGMENT_COLORS[index % SEGMENT_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => formatCurrency(Number(value))}
          contentStyle={{
            background: 'var(--color-sl-surface-lowest)',
            border: '1px solid var(--color-sl-outline-variant)',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

function TopOverduePanel({ customers }: { customers: TopOverdueCustomer[] }) {
  if (!Array.isArray(customers) || customers.length === 0) {
    return (
      <p className="py-6 text-center font-body text-sm text-sl-on-surface-variant">
        Veri bulunamadi.
      </p>
    )
  }

  const maxAmount = Math.max(...customers.map((c) => c.amount))

  return (
    <div className="space-y-3">
      {customers.map((customer) => {
        const barWidth = maxAmount > 0 ? (customer.amount / maxAmount) * 100 : 0
        return (
          <div key={customer.customerId} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate font-body text-sm text-sl-on-surface">
                {customer.customerName}
              </span>
              <span className="shrink-0 font-body text-xs tabular-nums text-sl-on-surface-variant">
                {formatCurrency(customer.amount)} ({formatPercent(customer.sharePercent)})
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-sl-surface-high">
              <div
                className="h-full rounded-full bg-sl-error transition-all"
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function CollectionDashboardPage() {
  const { data, isLoading, error } = useCollectionConsolidated()

  return (
    <div>
      <header className="mb-12">
        <h1 className="font-headline text-4xl font-bold tracking-[-0.02em] text-sl-on-surface">
          Tahsilat Yonetimi
        </h1>
        <p className="font-body text-lg text-sl-on-surface-variant mt-2 max-w-2xl">
          Konsolide tahsilat ve alacak gorunumu
        </p>
      </header>

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <p className="font-body text-sl-on-surface-variant">Yukleniyor...</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-sl-error-container/30 p-4">
          <p className="font-body text-sm text-sl-error">
            Tahsilat verileri yuklenemedi.
          </p>
        </div>
      )}

      {data && (
        <>
          <section className="mb-12">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard title="Toplam Alacak" value={formatCurrency(data.totalReceivable)} />
              <KpiCard
                title="Vadesi Gecen"
                value={formatCurrency(data.totalOverdue)}
                trend="down"
              />
              <KpiCard title="Vadesi Bekleyen" value={formatCurrency(data.totalPending)} />
              <KpiCard
                title="Gecikme Orani"
                value={formatPercent(data.overdueRatio)}
                trend={data.overdueRatio > 0.3 ? 'down' : 'up'}
              />
            </div>
          </section>

          <section className="mb-12">
            <h2 className="mb-4 font-headline text-xl font-bold tracking-tight text-sl-on-surface">
              Segment Karsilastirma
            </h2>
            <div className="rounded-xl bg-sl-surface-lowest p-8 shadow-[0_12px_32px_rgba(25,28,31,0.04)]">
              <SegmentComparisonTable segments={data.segments} />
            </div>
          </section>

          <section className="mb-12">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartErrorBoundary>
                <ChartCard title="Risk Dagilimi">
                  <RiskDistributionChart segments={data.segments} />
                </ChartCard>
              </ChartErrorBoundary>

              <ChartErrorBoundary>
                <ChartCard title="Segment Pay Dagilimi">
                  <SegmentShareDonut segments={data.segments} />
                </ChartCard>
              </ChartErrorBoundary>
            </div>
          </section>

          <section className="mb-12">
            <ChartCard title="Top 10 Vadesi Gecen Musteriler">
              <TopOverduePanel customers={data.topOverdueCustomers} />
            </ChartCard>
          </section>
        </>
      )}
    </div>
  )
}
