import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'
import type { MonthlyVarianceDto } from '../../hooks/useVariance'

interface WaterfallChartProps {
  data: MonthlyVarianceDto[]
}

const MONTH_LABELS = [
  'Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara',
] as const

interface WaterfallDatum {
  name: string
  value: number
  base: number
  fill: string
  runningTotal: number
}

function formatCompact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return String(Math.round(value))
}

interface WaterfallTooltipProps {
  active?: boolean
  payload?: Array<{ payload: WaterfallDatum }>
  label?: string
}

function WaterfallTooltip({ active, payload, label }: WaterfallTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const datum = payload[0].payload
  const sign = datum.runningTotal >= 0 ? '+' : ''

  return (
    <div className="rounded-lg border border-sl-outline-variant/15 bg-sl-surface-lowest px-3 py-2 text-sm shadow-[var(--sl-shadow-sm)]">
      <p className="mb-1 font-medium">Ay: {label}</p>
      <p className="text-text-muted">
        Kumulatif: {sign}{formatCompact(datum.runningTotal)} TRY
      </p>
    </div>
  )
}

export function WaterfallChart({ data }: WaterfallChartProps) {
  const chartData = useMemo(() => {
    const result: WaterfallDatum[] = []
    let runningTotal = 0

    for (const month of data) {
      const variance = month.revenueVariance
      const base = variance >= 0 ? runningTotal : runningTotal + variance
      runningTotal += variance

      result.push({
        name: MONTH_LABELS[month.month - 1],
        value: Math.abs(variance),
        base,
        fill: variance >= 0 ? '#059669' : '#dc2626',
        runningTotal,
      })
    }

    result.push({
      name: 'Toplam',
      value: Math.abs(runningTotal),
      base: runningTotal >= 0 ? 0 : runningTotal,
      fill: runningTotal >= 0 ? '#0d9488' : '#e11d48',
      runningTotal,
    })

    return result
  }, [data])

  return (
    <div className="rounded-xl border border-sl-outline-variant/15 bg-sl-surface-lowest p-5 shadow-[var(--sl-shadow-sm)]">
      <h3 className="mb-4 text-sm font-semibold text-text-muted">
        Aylik Gelir Sapma Selalesi (TRY)
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickFormatter={formatCompact}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <Tooltip content={<WaterfallTooltip />} />
          <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
          <Bar dataKey="base" stackId="waterfall" fill="transparent" />
          <Bar dataKey="value" stackId="waterfall" radius={[3, 3, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
