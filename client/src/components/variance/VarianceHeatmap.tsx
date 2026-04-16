import { useMemo } from 'react'
import type { HeatmapCell } from '../../hooks/useVariance'

interface VarianceHeatmapProps {
  data: HeatmapCell[]
}

const MONTH_LABELS = [
  'Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara',
] as const

function cellColor(pct: number): string {
  if (pct <= -0.20) return 'bg-red-600 text-white'
  if (pct <= -0.10) return 'bg-red-400 text-white'
  if (pct <= -0.05) return 'bg-red-200 text-red-900'
  if (pct < 0.05) return 'bg-slate-100 text-slate-600'
  if (pct < 0.10) return 'bg-emerald-200 text-emerald-900'
  if (pct < 0.20) return 'bg-emerald-400 text-white'
  return 'bg-emerald-600 text-white'
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(0)}%`
}

export function VarianceHeatmap({ data }: VarianceHeatmapProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, { customerName: string; months: Map<number, number> }>()
    for (const cell of data) {
      const key = String(cell.customerId)
      if (!map.has(key)) {
        map.set(key, { customerName: cell.customerName, months: new Map() })
      }
      map.get(key)!.months.set(cell.month, cell.variancePercent)
    }
    return Array.from(map.entries()).map(([id, val]) => ({
      customerId: id,
      customerName: val.customerName,
      months: val.months,
    }))
  }, [data])

  if (grouped.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-white p-8 text-center text-text-muted shadow-sm">
        Isitma haritasi verisi bulunamadi.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-slate-50/80">
            <th className="sticky left-0 z-10 bg-slate-50/80 px-3 py-2.5 text-left font-medium text-text-muted">
              Musteri
            </th>
            {MONTH_LABELS.map((label, i) => (
              <th
                key={i}
                className="min-w-[52px] px-1 py-2.5 text-center font-medium text-text-muted"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grouped.map((row) => (
            <tr key={row.customerId} className="border-b border-border/30">
              <td className="sticky left-0 z-10 bg-white px-3 py-1.5 font-medium text-sm whitespace-nowrap">
                {row.customerName}
              </td>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                const pct = row.months.get(month) ?? 0
                return (
                  <td key={month} className="px-0.5 py-0.5">
                    <div
                      className={`flex h-8 items-center justify-center rounded ${cellColor(pct)}`}
                      title={`${row.customerName} - ${MONTH_LABELS[month - 1]}: ${formatPct(pct)}`}
                    >
                      {formatPct(pct)}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center gap-2 border-t border-border px-4 py-2.5">
        <span className="text-xs text-text-muted mr-1">Skala:</span>
        <div className="flex items-center gap-1">
          <div className="h-4 w-8 rounded bg-red-600" />
          <span className="text-xs text-text-muted">-20%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-4 w-8 rounded bg-red-200" />
          <span className="text-xs text-text-muted">-5%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-4 w-8 rounded bg-slate-100" />
          <span className="text-xs text-text-muted">0%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-4 w-8 rounded bg-emerald-200" />
          <span className="text-xs text-text-muted">+5%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-4 w-8 rounded bg-emerald-600" />
          <span className="text-xs text-text-muted">+20%</span>
        </div>
      </div>
    </div>
  )
}
