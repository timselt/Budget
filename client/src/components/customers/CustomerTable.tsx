import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { Customer } from '../../hooks/useCustomers'
import { CustomerSparkline } from './CustomerSparkline'
import { CHART_COLORS, formatFullCurrency, formatPercent } from '../dashboard/chart-utils'

type SortField = 'name' | 'segment' | 'revenue' | 'claims' | 'lossRatio' | 'profit'
type SortDir = 'asc' | 'desc'

interface CustomerTableProps {
  customers: Customer[]
  segments: string[]
}

const COLUMN_HEADERS: { key: SortField; label: string; align: 'left' | 'right' }[] = [
  { key: 'name', label: 'Müşteri', align: 'left' },
  { key: 'segment', label: 'Segment', align: 'left' },
  { key: 'revenue', label: 'Gelir', align: 'right' },
  { key: 'claims', label: 'Hasar', align: 'right' },
  { key: 'lossRatio', label: 'LR%', align: 'right' },
  { key: 'profit', label: 'Kâr', align: 'right' },
]

export function CustomerTable({ customers, segments }: CustomerTableProps) {
  const [search, setSearch] = useState('')
  const [segmentFilter, setSegmentFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('revenue')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase()

    const result = customers.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(searchLower)
      const matchesSegment = segmentFilter === 'all' || c.segment === segmentFilter
      return matchesSearch && matchesSegment
    })

    const multiplier = sortDir === 'asc' ? 1 : -1
    result.sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return multiplier * aVal.localeCompare(bVal, 'tr')
      }
      return multiplier * (Number(aVal) - Number(bVal))
    })

    return result
  }, [customers, search, segmentFilter, sortField, sortDir])

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return ''
    return sortDir === 'asc' ? ' \u2191' : ' \u2193'
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Müşteri ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-sl-outline-variant/15 bg-sl-surface-lowest px-3 py-2 text-sm outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-100 sm:w-64"
        />
        <select
          value={segmentFilter}
          onChange={(e) => setSegmentFilter(e.target.value)}
          className="rounded-lg border border-sl-outline-variant/15 bg-sl-surface-lowest px-3 py-2 text-sm outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        >
          <option value="all">Tüm Segmentler</option>
          {segments.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="text-xs text-text-muted">
          {filtered.length} müşteri
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-sl-outline-variant/15 bg-sl-surface-lowest shadow-[var(--sl-shadow-sm)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sl-outline-variant/15 bg-surface-alt">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                Sıra
              </th>
              {COLUMN_HEADERS.map((col) => (
                <th
                  key={col.key}
                  className={`cursor-pointer select-none px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted transition-colors hover:text-primary-600 ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}{sortIndicator(col.key)}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text-muted">
                Trend
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((customer, index) => (
              <tr
                key={customer.id}
                className="border-b border-sl-outline-variant/15 transition-colors last:border-0 hover:bg-primary-50/40"
              >
                <td className="px-4 py-3 tabular-nums text-text-muted">
                  {index + 1}
                </td>
                <td className="px-4 py-3 font-medium">
                  <Link
                    to={`/customers/${customer.id}`}
                    className="text-primary-600 underline-offset-2 transition-colors hover:text-primary-700 hover:underline"
                  >
                    {customer.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-block rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700">
                    {customer.segment}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatFullCurrency(customer.revenue)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatFullCurrency(customer.claims)}
                </td>
                <td className={`px-4 py-3 text-right tabular-nums font-medium ${
                  customer.lossRatio > 0.7 ? 'text-danger' : customer.lossRatio > 0.5 ? 'text-warning' : 'text-success'
                }`}>
                  {formatPercent(customer.lossRatio)}
                </td>
                <td className={`px-4 py-3 text-right tabular-nums font-medium ${
                  customer.profit >= 0 ? 'text-success' : 'text-danger'
                }`}>
                  {formatFullCurrency(customer.profit)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center">
                    <CustomerSparkline
                      data={customer.monthlyTrend}
                      color={customer.lossRatio > 0.7
                        ? CHART_COLORS.danger
                        : CHART_COLORS.primary}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-text-muted">
                  Eşleşen müşteri bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
