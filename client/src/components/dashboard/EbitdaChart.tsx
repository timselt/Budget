import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
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

function EbitdaTooltip({ active, payload, label }: CustomTooltipProps) {
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
      <p>EBITDA: {formatFullCurrency(row.ebitda)}</p>
    </div>
  )
}

export function EbitdaChart({ versionId }: Props) {
  const { data, isLoading, error } = useDashboardMonthly(versionId)

  if (isLoading) {
    return (
      <ChartCard title="Aylik EBITDA">
        <div className="flex h-64 items-center justify-center text-text-muted">
          Yukleniyor...
        </div>
      </ChartCard>
    )
  }

  if (error || !data || !Array.isArray(data)) {
    return (
      <ChartCard title="Aylik EBITDA">
        <div className="flex h-64 items-center justify-center text-danger">
          Veri yuklenemedi.
        </div>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Aylik EBITDA">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
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
          <Tooltip content={<EbitdaTooltip />} />
          <Legend />
          <Bar dataKey="ebitda" name="EBITDA" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={`ebitda-${entry.month}`}
                fill={
                  entry.ebitda >= 0
                    ? CHART_COLORS.secondary
                    : CHART_COLORS.danger
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
