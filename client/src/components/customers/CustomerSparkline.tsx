import { LineChart, Line, ResponsiveContainer } from 'recharts'
import type { CustomerMonthly } from '../../hooks/useCustomers'
import { CHART_COLORS } from '../dashboard/chart-utils'

interface CustomerSparklineProps {
  data: CustomerMonthly[]
  dataKey?: keyof Pick<CustomerMonthly, 'revenue' | 'claims' | 'lossRatio'>
  color?: string
  height?: number
}

export function CustomerSparkline({
  data,
  dataKey = 'lossRatio',
  color = CHART_COLORS.primary,
  height = 32,
}: CustomerSparklineProps) {
  if (data.length === 0) {
    return <span className="text-xs text-text-muted">--</span>
  }

  return (
    <div style={{ width: 96, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
