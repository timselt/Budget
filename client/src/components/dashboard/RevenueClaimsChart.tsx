import {
  ResponsiveContainer,
  LineChart,
  Line,
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

function RevenueClaimsTooltip({ active, payload, label }: CustomTooltipProps) {
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
        Gelir: {formatFullCurrency(row.revenue)}
      </p>
      <p style={{ color: CHART_COLORS.danger }}>
        Hasar: {formatFullCurrency(row.claims)}
      </p>
    </div>
  )
}

export function RevenueClaimsChart({ versionId }: Props) {
  const { data, isLoading, error } = useDashboardMonthly(versionId)

  if (isLoading) {
    return (
      <ChartCard title="Aylik Gelir & Hasar">
        <div className="flex h-64 items-center justify-center text-text-muted">
          Yukleniyor...
        </div>
      </ChartCard>
    )
  }

  if (error || !data) {
    return (
      <ChartCard title="Aylik Gelir & Hasar">
        <div className="flex h-64 items-center justify-center text-danger">
          Veri yuklenemedi.
        </div>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Aylik Gelir & Hasar">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.border} />
          <XAxis
            dataKey="monthLabel"
            tick={{ fontSize: 12 }}
            stroke={CHART_COLORS.muted}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={formatTryCurrency}
            tick={{ fontSize: 12 }}
            stroke={CHART_COLORS.muted}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={formatTryCurrency}
            tick={{ fontSize: 12 }}
            stroke={CHART_COLORS.muted}
          />
          <Tooltip content={<RevenueClaimsTooltip />} />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="revenue"
            name="Gelir"
            stroke={CHART_COLORS.primary}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="claims"
            name="Hasar"
            stroke={CHART_COLORS.danger}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
