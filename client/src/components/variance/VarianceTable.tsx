import { useState, useMemo } from 'react'
import type { CustomerVarianceDto } from '../../hooks/useVariance'
import { AlertBadge } from './AlertBadge'

interface VarianceTableProps {
  data: CustomerVarianceDto[]
}

type SortField =
  | 'customerName'
  | 'budgetRevenue'
  | 'actualRevenue'
  | 'revenueVariancePercent'
  | 'lossRatio'
  | 'claimsVariancePercent'

type SortDirection = 'asc' | 'desc'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function varianceColor(pct: number): string {
  if (pct < -0.10) return 'text-red-600'
  if (pct < -0.05) return 'text-amber-600'
  if (pct > 0.05) return 'text-emerald-600'
  return 'text-text-muted'
}

export function VarianceTable({ data }: VarianceTableProps) {
  const [sortField, setSortField] = useState<SortField>('revenueVariancePercent')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const sorted = useMemo(() => {
    const slice = [...data]
    slice.sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal, 'tr')
          : bVal.localeCompare(aVal, 'tr')
      }
      const diff = (aVal as number) - (bVal as number)
      return sortDirection === 'asc' ? diff : -diff
    })
    return slice
  }, [data, sortField, sortDirection])

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  function sortIndicator(field: SortField): string {
    if (sortField !== field) return ''
    return sortDirection === 'asc' ? ' \u2191' : ' \u2193'
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-slate-50/80">
            <th
              className="cursor-pointer px-4 py-3 text-left font-medium text-text-muted"
              onClick={() => handleSort('customerName')}
            >
              Musteri{sortIndicator('customerName')}
            </th>
            <th
              className="cursor-pointer px-4 py-3 text-right font-medium text-text-muted"
              onClick={() => handleSort('budgetRevenue')}
            >
              Butce Gelir{sortIndicator('budgetRevenue')}
            </th>
            <th
              className="cursor-pointer px-4 py-3 text-right font-medium text-text-muted"
              onClick={() => handleSort('actualRevenue')}
            >
              Gercek Gelir{sortIndicator('actualRevenue')}
            </th>
            <th
              className="cursor-pointer px-4 py-3 text-right font-medium text-text-muted"
              onClick={() => handleSort('revenueVariancePercent')}
            >
              Gelir Fark %{sortIndicator('revenueVariancePercent')}
            </th>
            <th
              className="cursor-pointer px-4 py-3 text-right font-medium text-text-muted"
              onClick={() => handleSort('claimsVariancePercent')}
            >
              Hasar Fark %{sortIndicator('claimsVariancePercent')}
            </th>
            <th
              className="cursor-pointer px-4 py-3 text-right font-medium text-text-muted"
              onClick={() => handleSort('lossRatio')}
            >
              Hasar/Prim{sortIndicator('lossRatio')}
            </th>
            <th className="px-4 py-3 text-center font-medium text-text-muted">
              Uyari
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={row.customerId}
              className="border-b border-border/50 transition-colors hover:bg-slate-50/50"
            >
              <td className="px-4 py-3 font-medium">
                <span className="text-text-muted text-xs mr-2">{row.customerCode}</span>
                {row.customerName}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatCurrency(row.budgetRevenue)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatCurrency(row.actualRevenue)}
              </td>
              <td className={`px-4 py-3 text-right tabular-nums font-medium ${varianceColor(row.revenueVariancePercent)}`}>
                {formatPercent(row.revenueVariancePercent)}
              </td>
              <td className={`px-4 py-3 text-right tabular-nums font-medium ${varianceColor(-row.claimsVariancePercent)}`}>
                {formatPercent(row.claimsVariancePercent)}
              </td>
              <td className={`px-4 py-3 text-right tabular-nums font-medium ${row.lossRatio > 0.8 ? 'text-red-600' : 'text-text-muted'}`}>
                {formatPercent(row.lossRatio)}
              </td>
              <td className="px-4 py-3 text-center">
                <AlertBadge severity={row.alert} />
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-text-muted">
                Veri bulunamadi.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
