import { useDashboardMonthly } from '../../hooks/useDashboardMonthly'
import { ChartCard } from './ChartCard'
import { formatFullCurrency, formatPercent } from './chart-utils'

interface Props {
  versionId: number
}

interface KpiColumn {
  key: keyof RowValues
  label: string
  format: (v: number) => string
}

type RowValues = {
  revenue: number
  claims: number
  lossRatio: number
  combinedRatio: number
  ebitda: number
  technicalProfit: number
  netProfit: number
  expenseRatio: number
  ebitdaMargin: number
  technicalMargin: number
}

const KPI_COLUMNS: KpiColumn[] = [
  { key: 'revenue', label: 'Gelir', format: formatFullCurrency },
  { key: 'claims', label: 'Hasar', format: formatFullCurrency },
  { key: 'technicalMargin', label: 'Teknik Marj', format: formatFullCurrency },
  { key: 'technicalProfit', label: 'Teknik Kar', format: formatFullCurrency },
  { key: 'ebitda', label: 'EBITDA', format: formatFullCurrency },
  { key: 'netProfit', label: 'Net Kar', format: formatFullCurrency },
  { key: 'lossRatio', label: 'Hasar Orani', format: formatPercent },
  { key: 'expenseRatio', label: 'Gider Orani', format: formatPercent },
  { key: 'combinedRatio', label: 'Bilesik Oran', format: formatPercent },
  { key: 'ebitdaMargin', label: 'EBITDA Marji', format: formatPercent },
]

export function MonthlySummaryTable({ versionId }: Props) {
  const { data, isLoading, error } = useDashboardMonthly(versionId)

  if (isLoading) {
    return (
      <ChartCard title="Aylik KPI Ozeti">
        <div className="flex h-48 items-center justify-center text-text-muted">
          Yukleniyor...
        </div>
      </ChartCard>
    )
  }

  if (error || !data) {
    return (
      <ChartCard title="Aylik KPI Ozeti">
        <div className="flex h-48 items-center justify-center text-danger">
          Veri yuklenemedi.
        </div>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Aylik KPI Ozeti" className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="sticky left-0 bg-white px-3 py-2 text-left text-xs font-semibold text-text-muted uppercase">
              KPI
            </th>
            {data.map((row) => (
              <th
                key={row.month}
                className="px-3 py-2 text-right text-xs font-semibold text-text-muted"
              >
                {row.monthLabel}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {KPI_COLUMNS.map((col) => (
            <tr key={col.key} className="border-b border-border/50 hover:bg-surface-alt">
              <td className="sticky left-0 bg-white px-3 py-2 font-medium text-text">
                {col.label}
              </td>
              {data.map((row) => {
                const value = row[col.key]
                const isNegative = typeof value === 'number' && value < 0
                return (
                  <td
                    key={row.month}
                    className={`px-3 py-2 text-right tabular-nums ${
                      isNegative ? 'text-danger' : ''
                    }`}
                  >
                    {col.format(value)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </ChartCard>
  )
}
