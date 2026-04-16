import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'
import type { SegmentDataPoint } from '../../hooks/useDashboardSegments'
import { useDashboardSegments } from '../../hooks/useDashboardSegments'
import { ChartCard } from './ChartCard'
import { PIE_PALETTE, formatPercent, formatFullCurrency, CHART_COLORS } from './chart-utils'

interface Props {
  versionId: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: SegmentDataPoint }>
}

function SegmentTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }
  const item = payload[0].payload
  return (
    <div
      className="rounded-lg border border-sl-outline-variant/15 bg-sl-surface-lowest px-3 py-2 text-sm shadow-[var(--sl-shadow-sm)]"
      style={{ borderColor: CHART_COLORS.border }}
    >
      <p className="font-medium">{item.segmentName}</p>
      <p>Gelir: {formatFullCurrency(item.revenue)}</p>
      <p>Pay: {formatPercent(item.revenueShare)}</p>
    </div>
  )
}

export function SegmentDonut({ versionId }: Props) {
  const { data, isLoading, error } = useDashboardSegments(versionId)

  if (isLoading) {
    return (
      <ChartCard title="Segment Gelir Dagilimi">
        <div className="flex h-64 items-center justify-center text-text-muted">
          Yukleniyor...
        </div>
      </ChartCard>
    )
  }

  if (error || !data || !Array.isArray(data)) {
    return (
      <ChartCard title="Segment Gelir Dagilimi">
        <div className="flex h-64 items-center justify-center text-danger">
          Veri yuklenemedi.
        </div>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Segment Gelir Dagilimi">
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={data}
            dataKey="revenue"
            nameKey="segmentName"
            cx="50%"
            cy="50%"
            innerRadius="45%"
            outerRadius="75%"
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((_entry, index) => (
              <Cell
                key={`segment-${index}`}
                fill={PIE_PALETTE[index % PIE_PALETTE.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<SegmentTooltip />} />
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
