import type { PnlLineItems } from '../../hooks/useScenarios'

interface ScenarioPnlTableProps {
  scenarioName: string
  base: PnlLineItems
  scenario: PnlLineItems
  delta: PnlLineItems
}

interface PnlRow {
  label: string
  key: keyof PnlLineItems
  isRatio: boolean
  isBold: boolean
}

const PNL_ROWS: PnlRow[] = [
  { label: 'Toplam Gelir', key: 'totalRevenue', isRatio: false, isBold: true },
  { label: 'Toplam Hasar', key: 'totalClaims', isRatio: false, isBold: false },
  { label: 'Teknik Marj', key: 'technicalMargin', isRatio: false, isBold: true },
  { label: 'Genel Giderler', key: 'generalExpenses', isRatio: false, isBold: false },
  { label: 'Teknik Giderler', key: 'technicalExpenses', isRatio: false, isBold: false },
  { label: 'Teknik Kar', key: 'technicalProfit', isRatio: false, isBold: true },
  { label: 'Finansal Gelir', key: 'financialIncome', isRatio: false, isBold: false },
  { label: 'Finansal Gider', key: 'financialExpenses', isRatio: false, isBold: false },
  { label: 'Net Kar', key: 'netProfit', isRatio: false, isBold: true },
  { label: 'EBITDA', key: 'ebitda', isRatio: false, isBold: true },
  { label: 'Hasar Prim Orani', key: 'lossRatio', isRatio: true, isBold: false },
  { label: 'Bilesik Oran', key: 'combinedRatio', isRatio: true, isBold: false },
  { label: 'Kar Marji', key: 'profitRatio', isRatio: true, isBold: false },
]

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatRatio(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

function formatDelta(value: number, isRatio: boolean): string {
  const formatted = isRatio
    ? `${(value * 100).toFixed(2)} p.p.`
    : formatCurrency(value)
  return value > 0 ? `+${formatted}` : formatted
}

function deltaColor(value: number, key: keyof PnlLineItems): string {
  const invertedKeys: Set<keyof PnlLineItems> = new Set([
    'totalClaims',
    'generalExpenses',
    'technicalExpenses',
    'financialExpenses',
    'lossRatio',
    'combinedRatio',
  ])

  if (value === 0) return 'text-text-muted'
  const isPositiveGood = !invertedKeys.has(key)
  const isGood = isPositiveGood ? value > 0 : value < 0
  return isGood ? 'text-success' : 'text-danger'
}

export function ScenarioPnlTable({
  scenarioName,
  base,
  scenario,
  delta,
}: ScenarioPnlTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-raised">
            <th className="px-4 py-3 text-left font-semibold">Kalem</th>
            <th className="px-4 py-3 text-right font-semibold">Baz</th>
            <th className="px-4 py-3 text-right font-semibold">{scenarioName}</th>
            <th className="px-4 py-3 text-right font-semibold">Fark</th>
          </tr>
        </thead>
        <tbody>
          {PNL_ROWS.map((row) => {
            const baseVal = base[row.key]
            const scenarioVal = scenario[row.key]
            const deltaVal = delta[row.key]
            const format = row.isRatio ? formatRatio : formatCurrency

            return (
              <tr
                key={row.key}
                className={`border-b border-border/50 transition-colors last:border-b-0 hover:bg-surface-raised/50 ${
                  row.isBold ? 'bg-surface-raised/30' : ''
                }`}
              >
                <td className={`px-4 py-2.5 ${row.isBold ? 'font-semibold' : ''}`}>
                  {row.label}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {format(baseVal)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {format(scenarioVal)}
                </td>
                <td
                  className={`px-4 py-2.5 text-right tabular-nums font-medium ${deltaColor(deltaVal, row.key)}`}
                >
                  {formatDelta(deltaVal, row.isRatio)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
