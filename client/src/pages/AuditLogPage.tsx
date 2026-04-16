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
    <div className="space-y-12">
      <div>
        <h1 className="font-headline text-4xl font-bold tracking-[-0.02em] text-sl-on-surface">
          Denetim Kayitlari
        </h1>
        <p className="font-body text-lg text-sl-on-surface-variant mt-2 max-w-2xl">
          Sistem uzerindeki tum degisiklikleri inceleyin.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-xl bg-sl-surface-low p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="entity-type" className="font-body text-xs font-medium text-sl-on-surface-variant">
            Entity Tipi
          </label>
          <select
            id="entity-type"
            value={entityType}
            onChange={handleEntityChange}
            className="rounded-md border border-sl-outline-variant/15 bg-sl-surface-lowest px-3 py-2
                       font-body text-sm text-sl-on-surface
                       focus:outline-none focus:ring-2 focus:ring-sl-primary-fixed"
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
          <label htmlFor="date-from" className="font-body text-xs font-medium text-sl-on-surface-variant">
            Baslangic Tarihi
          </label>
          <input
            id="date-from"
            type="date"
            value={dateFrom}
            onChange={handleDateFromChange}
            className="rounded-md border border-sl-outline-variant/15 bg-sl-surface-lowest px-3 py-2
                       font-body text-sm text-sl-on-surface
                       focus:outline-none focus:ring-2 focus:ring-sl-primary-fixed"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="date-to" className="font-body text-xs font-medium text-sl-on-surface-variant">
            Bitis Tarihi
          </label>
          <input
            id="date-to"
            type="date"
            value={dateTo}
            onChange={handleDateToChange}
            className="rounded-md border border-sl-outline-variant/15 bg-sl-surface-lowest px-3 py-2
                       font-body text-sm text-sl-on-surface
                       focus:outline-none focus:ring-2 focus:ring-sl-primary-fixed"
          />
        </div>
      </div>

      <AuditLogTable items={data?.items ?? []} isLoading={isLoading} />

      {data && data.totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between rounded-xl bg-sl-surface-lowest px-4 py-3 shadow-[0_12px_32px_rgba(25,28,31,0.04)]">
          <p className="font-body text-sm text-sl-on-surface-variant">
            Toplam <span className="font-medium text-sl-on-surface">{data.totalCount}</span> kayit
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-sl-outline-variant/15 px-3 py-1.5 font-body text-sm font-medium
                         text-sl-on-surface transition-colors hover:bg-sl-surface-low disabled:opacity-40"
            >
              Onceki
            </button>
            <span className="flex items-center px-2 font-body text-sm tabular-nums text-sl-on-surface-variant">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-sl-outline-variant/15 px-3 py-1.5 font-body text-sm font-medium
                         text-sl-on-surface transition-colors hover:bg-sl-surface-low disabled:opacity-40"
            >
              Sonraki
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
