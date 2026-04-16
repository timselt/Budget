import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'
import type { ExpenseDataPoint } from '../../hooks/useDashboardExpenses'
import { useDashboardExpenses } from '../../hooks/useDashboardExpenses'
import { ChartCard } from './ChartCard'
import { PIE_PALETTE, formatPercent, formatFullCurrency, CHART_COLORS } from './chart-utils'

interface Props {
  versionId: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: ExpenseDataPoint }>
}

function ExpenseTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }
  const item = payload[0].payload
  return (
    <div
      className="rounded-lg border border-sl-outline-variant/15 bg-sl-surface-lowest px-3 py-2 text-sm shadow-[var(--sl-shadow-sm)]"
      style={{ borderColor: CHART_COLORS.border }}
    >
      <p className="font-medium">{item.category}</p>
      <p>Tutar: {formatFullCurrency(item.amount)}</p>
      <p>Pay: {formatPercent(item.share)}</p>
    </div>
  )
}

export function ExpensePie({ versionId }: Props) {
  const { data, isLoading, error } = useDashboardExpenses(versionId)

  if (isLoading) {
    return (
      <ChartCard title="Gider Dagilimi">
        <div className="flex h-64 items-center justify-center text-text-muted">
          Yukleniyor...
        </div>
      </ChartCard>
    )
  }

  if (error || !data || !Array.isArray(data)) {
    return (
      <ChartCard title="Gider Dagilimi">
        <div className="flex h-64 items-center justify-center text-danger">
          Veri yuklenemedi.
        </div>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Gider Dagilimi">
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="category"
            cx="50%"
            cy="50%"
            outerRadius="75%"
            paddingAngle={1}
            strokeWidth={0}
          >
            {data.map((_entry, index) => (
              <Cell
                key={`expense-${index}`}
                fill={PIE_PALETTE[index % PIE_PALETTE.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<ExpenseTooltip />} />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            iconSize={10}
            wrapperStyle={{ fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
