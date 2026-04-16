import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Tooltip,
} from 'recharts'
import type { Customer } from '../../hooks/useCustomers'
import { CHART_COLORS } from '../dashboard/chart-utils'

interface ConcentrationChartProps {
  customers: Customer[]
}

const THRESHOLD_WARNING = 0.3
const THRESHOLD_DANGER = 0.5

interface ConcentrationBucket {
  label: string
  share: number
  sharePercent: number
  count: number
}

function computeConcentration(customers: Customer[]): {
  buckets: ConcentrationBucket[]
  hhi: number
} {
  const totalRevenue = customers.reduce((sum, c) => sum + c.revenue, 0)
  if (totalRevenue === 0) {
    return { buckets: [], hhi: 0 }
  }

  const sorted = [...customers].sort((a, b) => b.revenue - a.revenue)

  const top5Revenue = sorted.slice(0, 5).reduce((sum, c) => sum + c.revenue, 0)
  const top10Revenue = sorted.slice(0, 10).reduce((sum, c) => sum + c.revenue, 0)
  const top20Revenue = sorted.slice(0, 20).reduce((sum, c) => sum + c.revenue, 0)

  const makeBucket = (label: string, revenue: number, count: number): ConcentrationBucket => {
    const share = revenue / totalRevenue
    return { label, share, sharePercent: Math.round(share * 100), count }
  }

  const buckets: ConcentrationBucket[] = [
    makeBucket('Top 5', top5Revenue, Math.min(5, sorted.length)),
    makeBucket('Top 10', top10Revenue, Math.min(10, sorted.length)),
    makeBucket('Top 20', top20Revenue, Math.min(20, sorted.length)),
  ]

  const hhi = sorted.reduce((sum, c) => {
    const share = c.revenue / totalRevenue
    return sum + share * share
  }, 0)

  return { buckets, hhi }
}

function getBarColor(share: number): string {
  if (share >= THRESHOLD_DANGER) return CHART_COLORS.danger
  if (share >= THRESHOLD_WARNING) return CHART_COLORS.warning
  return CHART_COLORS.secondary
}

interface ConcentrationTooltipProps {
  active?: boolean
  payload?: Array<{ payload: ConcentrationBucket }>
}

function ConcentrationTooltip({ active, payload }: ConcentrationTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }
  const row = payload[0].payload
  return (
    <div
      className="rounded-lg border bg-white px-3 py-2 text-sm shadow-md"
      style={{ borderColor: CHART_COLORS.border }}
    >
      <p className="font-medium">{row.label}</p>
      <p>Pay: %{row.sharePercent}</p>
      <p className="text-text-muted">{row.count} müşteri</p>
    </div>
  )
}

export function ConcentrationChart({ customers }: ConcentrationChartProps) {
  const { buckets, hhi } = computeConcentration(customers)

  if (buckets.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-text-muted">
        Yeterli veri yok.
      </div>
    )
  }

  return (
    <div>
      {/* HHI indicator */}
      <div className="mb-4 flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          HHI
        </span>
        <span className={`text-lg font-bold tabular-nums ${
          hhi > 0.25 ? 'text-danger' : hhi > 0.15 ? 'text-warning' : 'text-success'
        }`}>
          {(hhi * 10000).toFixed(0)}
        </span>
        <span className="text-xs text-text-muted">
          {hhi > 0.25
            ? '(Yüksek yoğunlaşma)'
            : hhi > 0.15
              ? '(Orta yoğunlaşma)'
              : '(Düşük yoğunlaşma)'}
        </span>
      </div>

      {/* Horizontal bar chart */}
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={buckets}
            layout="vertical"
            margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
          >
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(v: number) => `%${v}`}
              tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 12, fill: CHART_COLORS.muted, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip content={<ConcentrationTooltip />} />
            <ReferenceLine
              x={THRESHOLD_WARNING * 100}
              stroke={CHART_COLORS.warning}
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <ReferenceLine
              x={THRESHOLD_DANGER * 100}
              stroke={CHART_COLORS.danger}
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <Bar dataKey="sharePercent" radius={[0, 6, 6, 0]} barSize={28}>
              {buckets.map((entry) => (
                <Cell key={entry.label} fill={getBarColor(entry.share)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS.secondary }} />
          {'< %30'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS.warning }} />
          {'%30 – %50'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS.danger }} />
          {'> %50'}
        </span>
      </div>
    </div>
  )
}
