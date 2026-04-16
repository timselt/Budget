import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import type { TopCustomerDataPoint } from '../../hooks/useDashboardTopCustomers'
import { useDashboardTopCustomers } from '../../hooks/useDashboardTopCustomers'
import { ChartCard } from './ChartCard'
import { CHART_COLORS, formatTryCurrency, formatFullCurrency, formatPercent } from './chart-utils'

interface Props {
  versionId: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: TopCustomerDataPoint }>
}

function CustomerTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }
  const item = payload[0].payload
  return (
    <div
      className="rounded-lg border bg-white px-3 py-2 text-sm shadow-md"
      style={{ borderColor: CHART_COLORS.border }}
    >
      <p className="font-medium">{item.customerName}</p>
      <p>Gelir: {formatFullCurrency(item.revenue)}</p>
      <p>Pay: {formatPercent(item.revenueShare)}</p>
    </div>
  )
}

export function TopCustomersChart({ versionId }: Props) {
  const { data, isLoading, error } = useDashboardTopCustomers(versionId)

  if (isLoading) {
    return (
      <ChartCard title="En Buyuk 10 Musteri">
        <div className="flex h-64 items-center justify-center text-text-muted">
          Yukleniyor...
        </div>
      </ChartCard>
    )
  }

  if (error || !data) {
    return (
      <ChartCard title="En Buyuk 10 Musteri">
        <div className="flex h-64 items-center justify-center text-danger">
          Veri yuklenemedi.
        </div>
      </ChartCard>
    )
  }

  const sorted = [...data].sort((a, b) => a.revenue - b.revenue)

  return (
    <ChartCard title="En Buyuk 10 Musteri">
      <ResponsiveContainer width="100%" height={Math.max(300, sorted.length * 36)}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={CHART_COLORS.border}
            horizontal={false}
          />
          <XAxis
            type="number"
            tickFormatter={formatTryCurrency}
            tick={{ fontSize: 12 }}
            stroke={CHART_COLORS.muted}
          />
          <YAxis
            type="category"
            dataKey="customerName"
            tick={{ fontSize: 11 }}
            width={120}
            stroke={CHART_COLORS.muted}
          />
          <Tooltip content={<CustomerTooltip />} />
          <Bar dataKey="revenue" name="Gelir" radius={[0, 4, 4, 0]}>
            {sorted.map((_entry, index) => (
              <Cell
                key={`cust-${index}`}
                fill={
                  index >= sorted.length - 3
                    ? CHART_COLORS.primary
                    : CHART_COLORS.primaryLight
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
