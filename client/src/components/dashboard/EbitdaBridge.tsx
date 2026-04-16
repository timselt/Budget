import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts'

const BRIDGE_DATA = [
  { name: 'FY25', value: 285, base: 0, fill: 'var(--sl-on-surface-variant)' },
  { name: 'Gelir', value: 320, base: 285, fill: 'var(--sl-success)' },
  { name: 'Hasar', value: 220, base: 385, fill: 'var(--sl-primary)' },
  { name: 'OPEX', value: 25, base: 360, fill: 'var(--sl-warning)' },
  { name: 'FY26', value: 360, base: 0, fill: 'var(--sl-tertiary)' },
]

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: typeof BRIDGE_DATA[number] }>
}

function BridgeTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  const isNeg = d.name === 'Hasar' || d.name === 'OPEX'
  return (
    <div className="rounded-lg bg-sl-surface-lowest px-3 py-2 text-sm shadow-[var(--sl-shadow-sm)]">
      <p className="font-medium text-sl-on-surface">{d.name}</p>
      <p className="text-sl-on-surface-variant">{isNeg ? '-' : ''}{d.value}M TL</p>
    </div>
  )
}

export function EbitdaBridge() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={BRIDGE_DATA} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12, fill: 'var(--sl-on-surface-variant)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => `${v}M`}
          tick={{ fontSize: 11, fill: 'var(--sl-on-surface-variant)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<BridgeTooltip />} cursor={false} />
        <ReferenceLine y={0} stroke="var(--sl-outline-variant)" strokeOpacity={0.3} />
        <Bar dataKey="base" stackId="stack" fill="transparent" radius={0} />
        <Bar dataKey="value" stackId="stack" radius={[4, 4, 0, 0]}>
          {BRIDGE_DATA.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
