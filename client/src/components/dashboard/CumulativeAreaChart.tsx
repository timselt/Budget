import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { MonthlyDataPoint } from '../../hooks/useDashboardMonthly'
import { useDashboardMonthly } from '../../hooks/useDashboardMonthly'
import { ChartCard } from './ChartCard'
import { CHART_COLORS, formatTryCurrency, formatFullCurrency } from './chart-utils'

interface Props {
  versionId: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: MonthlyDataPoint }>
  label?: string
}

function CumulativeTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }
  const row = payload[0].payload
  return (
    <div
      className="rounded-lg border bg-white px-3 py-2 text-sm shadow-md"
      style={{ borderColor: CHART_COLORS.border }}
    >
      <p className="mb-1 font-medium">{label}</p>
      <p style={{ color: CHART_COLORS.primary }}>
        Kumulatif Gelir: {formatFullCurrency(row.cumulativeRevenue)}
      </p>
      <p style={{ color: CHART_COLORS.secondary }}>
        Butce Hedefi: {formatFullCurrency(row.cumulativeBudgetTarget)}
      </p>
    </div>
  )
}

export function CumulativeAreaChart({ versionId }: Props) {
  const { data, isLoading, error } = useDashboardMonthly(versionId)

  if (isLoading) {
    return (
      <ChartCard title="Kumulatif Gelir vs Butce Hedefi">
        <div className="flex h-64 items-center justify-center text-text-muted">
          Yukleniyor...
        </div>
      </ChartCard>
    )
  }

  if (error || !data) {
    return (
      <ChartCard title="Kumulatif Gelir vs Butce Hedefi">
        <div className="flex h-64 items-center justify-center text-danger">
          Veri yuklenemedi.
        </div>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Kumulatif Gelir vs Butce Hedefi">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.25} />
              <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradBudget" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.15} />
              <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.border} />
          <XAxis
            dataKey="monthLabel"
            tick={{ fontSize: 12 }}
            stroke={CHART_COLORS.muted}
          />
          <YAxis
            tickFormatter={formatTryCurrency}
            tick={{ fontSize: 12 }}
            stroke={CHART_COLORS.muted}
          />
          <Tooltip content={<CumulativeTooltip />} />
          <Legend />
          <Area
            type="monotone"
            dataKey="cumulativeRevenue"
            name="Kumulatif Gelir"
            stroke={CHART_COLORS.primary}
            strokeWidth={2.5}
            fill="url(#gradRevenue)"
          />
          <Area
            type="monotone"
            dataKey="cumulativeBudgetTarget"
            name="Butce Hedefi"
            stroke={CHART_COLORS.secondary}
            strokeWidth={2}
            strokeDasharray="5 3"
            fill="url(#gradBudget)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
