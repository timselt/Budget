import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts'
import type { MonthlyDataPoint } from '../../hooks/useDashboardMonthly'
import { useDashboardMonthly } from '../../hooks/useDashboardMonthly'
import { ChartCard } from './ChartCard'
import { CHART_COLORS, formatPercent } from './chart-utils'

interface Props {
  versionId: number
}

const LOSS_RATIO_THRESHOLD = 0.6

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: MonthlyDataPoint }>
  label?: string
}

function LossRatioTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }
  const row = payload[0].payload
  return (
    <div
      className="rounded-lg border border-sl-outline-variant/15 bg-sl-surface-lowest px-3 py-2 text-sm shadow-[var(--sl-shadow-sm)]"
      style={{ borderColor: CHART_COLORS.border }}
    >
      <p className="mb-1 font-medium">{label}</p>
      <p>Hasar Orani: {formatPercent(row.lossRatio)}</p>
    </div>
  )
}

export function LossRatioChart({ versionId }: Props) {
  const { data, isLoading, error } = useDashboardMonthly(versionId)

  if (isLoading) {
    return (
      <ChartCard title="Hasar Prim Orani">
        <div className="flex h-64 items-center justify-center text-text-muted">
          Yukleniyor...
        </div>
      </ChartCard>
    )
  }

  if (error || !data || !Array.isArray(data)) {
    return (
      <ChartCard title="Hasar Prim Orani">
        <div className="flex h-64 items-center justify-center text-danger">
          Veri yuklenemedi.
        </div>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Hasar Prim Orani">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.border} />
          <XAxis
            dataKey="monthLabel"
            tick={{ fontSize: 12 }}
            stroke={CHART_COLORS.muted}
          />
          <YAxis
            tickFormatter={(v: number) => formatPercent(v)}
            tick={{ fontSize: 12 }}
            stroke={CHART_COLORS.muted}
            domain={[0, 'auto']}
          />
          <Tooltip content={<LossRatioTooltip />} />
          <Legend />
          <ReferenceLine
            y={LOSS_RATIO_THRESHOLD}
            stroke={CHART_COLORS.danger}
            strokeDasharray="6 4"
            strokeWidth={2}
            label={{
              value: `Esik %${LOSS_RATIO_THRESHOLD * 100}`,
              position: 'insideTopRight',
              fill: CHART_COLORS.danger,
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="lossRatio"
            name="Hasar Orani"
            stroke={CHART_COLORS.primary}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
