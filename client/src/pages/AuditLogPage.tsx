import { useState, useCallback } from 'react'
import { useAuditLogs, type AuditLogFilters } from '../hooks/useAuditLogs'
import { AuditLogTable } from '../components/admin/AuditLogTable'

const ENTITY_TYPES = [
  '',
  'BudgetEntry',
  'BudgetVersion',
  'ExpenseEntry',
  'Customer',
  'Company',
  'SpecialItem',
  'FxRate',
] as const

const PAGE_SIZE = 50

export function AuditLogPage() {
  const [entityType, setEntityType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const filters: AuditLogFilters = {
    entityType: entityType || undefined,
    from: dateFrom || undefined,
    to: dateTo || undefined,
    page,
    limit: PAGE_SIZE,
  }

  const { data, isLoading } = useAuditLogs(filters)

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1

  const handleEntityChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setEntityType(e.target.value)
    setPage(1)
  }, [])

  const handleDateFromChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDateFrom(e.target.value)
    setPage(1)
  }, [])

  const handleDateToChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDateTo(e.target.value)
    setPage(1)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Denetim Kayitlari</h1>
        <p className="mt-1 text-sm text-text-muted">
          Sistem uzerindeki tum degisiklikleri inceleyin.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-surface-alt/30 p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="entity-type" className="text-xs font-medium text-text-muted">
            Entity Tipi
          </label>
          <select
            id="entity-type"
            value={entityType}
            onChange={handleEntityChange}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">Tumu</option>
            {ENTITY_TYPES.filter(Boolean).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="date-from" className="text-xs font-medium text-text-muted">
            Baslangic Tarihi
          </label>
          <input
            id="date-from"
            type="date"
            value={dateFrom}
            onChange={handleDateFromChange}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="date-to" className="text-xs font-medium text-text-muted">
            Bitis Tarihi
          </label>
          <input
            id="date-to"
            type="date"
            value={dateTo}
            onChange={handleDateToChange}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      <AuditLogTable items={data?.items ?? []} isLoading={isLoading} />

      {data && data.totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3">
          <p className="text-sm text-text-muted">
            Toplam <span className="font-medium text-text">{data.totalCount}</span> kayit
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-alt disabled:opacity-40"
            >
              Onceki
            </button>
            <span className="flex items-center px-2 text-sm tabular-nums text-text-muted">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-alt disabled:opacity-40"
            >
              Sonraki
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
