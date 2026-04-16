import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { ScenarioComparisonItem } from '../../hooks/useScenarios'

interface TornadoChartProps {
  scenarios: ScenarioComparisonItem[]
}

interface TornadoEntry {
  label: string
  value: number
  scenarioName: string
}

const METRIC_LABELS: Record<string, string> = {
  netProfit: 'Net Kar',
  ebitda: 'EBITDA',
  technicalProfit: 'Teknik Kar',
  technicalMargin: 'Teknik Marj',
  totalRevenue: 'Toplam Gelir',
}

const POSITIVE_COLOR = 'oklch(65% 0.19 145)'
const NEGATIVE_COLOR = 'oklch(65% 0.22 25)'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value)
}

export function TornadoChart({ scenarios }: TornadoChartProps) {
  const metricKeys = Object.keys(METRIC_LABELS) as (keyof typeof METRIC_LABELS)[]

  const entries: TornadoEntry[] = scenarios.flatMap((s) =>
    metricKeys.map((key) => ({
      label: `${s.scenarioName} - ${METRIC_LABELS[key]}`,
      value: s.delta[key as keyof typeof s.delta] as number,
      scenarioName: s.scenarioName,
    }))
  )

  const sorted = [...entries].sort(
    (a, b) => Math.abs(b.value) - Math.abs(a.value)
  )

  if (sorted.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-text-muted">
        Karsilastirma icin en az 2 senaryo secin.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-surface-raised p-4">
      <h3 className="mb-4 text-base font-semibold tracking-tight">
        Hassasiyet Analizi (Baz'a Gore Fark)
      </h3>
      <ResponsiveContainer width="100%" height={Math.max(sorted.length * 36, 200)}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 4, right: 60, left: 140, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
          <XAxis
            type="number"
            tickFormatter={formatCurrency}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={130}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value) => [formatCurrency(Number(value)), 'Fark']}
            contentStyle={{
              borderRadius: '0.5rem',
              border: '1px solid var(--color-border)',
              fontSize: '0.8125rem',
            }}
          />
          <ReferenceLine x={0} stroke="var(--color-text-muted)" strokeWidth={1} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
            {sorted.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.value >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
