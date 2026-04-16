import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'
import type { SegmentPerformance } from '../../hooks/useCustomers'
import { CHART_COLORS, PIE_PALETTE } from '../dashboard/chart-utils'

interface SegmentRadarProps {
  segments: SegmentPerformance[]
}

const AXIS_LABELS: Record<string, string> = {
  revenue: 'Gelir',
  claims: 'Hasar',
  lossRatio: 'LR',
  expenseRatio: 'Gider Oranı',
  profitMargin: 'Kâr Marjı',
}

type PerformanceAxis = keyof Pick<SegmentPerformance, 'revenue' | 'claims' | 'lossRatio' | 'expenseRatio' | 'profitMargin'>

interface RadarDataPoint {
  axis: string
  [segmentName: string]: string | number
}

function normalizeSegments(segments: SegmentPerformance[]): RadarDataPoint[] {
  const axes: PerformanceAxis[] = [
    'revenue',
    'claims',
    'lossRatio',
    'expenseRatio',
    'profitMargin',
  ]

  const maxValues: Record<string, number> = {}
  for (const axis of axes) {
    maxValues[axis] = Math.max(...segments.map((s) => Math.abs(s[axis])), 1)
  }

  return axes.map((axis) => {
    const point: RadarDataPoint = { axis: AXIS_LABELS[axis] }
    for (const seg of segments) {
      point[seg.segmentName] = Math.round((Math.abs(seg[axis]) / maxValues[axis]) * 100)
    }
    return point
  })
}

export function SegmentRadar({ segments }: SegmentRadarProps) {
  if (segments.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-text-muted">
        Segment verisi bulunamadı.
      </div>
    )
  }

  const radarData = normalizeSegments(segments)

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke={CHART_COLORS.border} />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fontSize: 12, fill: CHART_COLORS.muted }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          {segments.map((seg, i) => (
            <Radar
              key={seg.segmentId}
              name={seg.segmentName}
              dataKey={seg.segmentName}
              stroke={PIE_PALETTE[i % PIE_PALETTE.length]}
              fill={PIE_PALETTE[i % PIE_PALETTE.length]}
              fillOpacity={0.12}
              strokeWidth={2}
            />
          ))}
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: `1px solid ${CHART_COLORS.border}`,
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
