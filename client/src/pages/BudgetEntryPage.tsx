import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

interface BudgetYearRow {
  id: number
  year: number
  isLocked: boolean
}

interface BudgetVersionRow {
  id: number
  budgetYearId: number
  name: string
  status: string
  isActive: boolean
}

interface CustomerRow {
  id: number
  code: string
  name: string
  segmentId: number
  segmentName: string | null
  defaultCurrencyCode: string | null
  isActive: boolean
}

interface BudgetEntryRow {
  id: number
  versionId: number
  customerId: number
  customerName: string | null
  month: number
  entryType: 'REVENUE' | 'CLAIM'
  amountOriginal: number
  currencyCode: string
  amountTryFixed: number
  amountTrySpot: number
}

interface BudgetEntryUpsert {
  id: number | null
  customerId: number
  month: number
  entryType: 'REVENUE' | 'CLAIM'
  amountOriginal: number
  currencyCode: string
}

type EntryType = 'REVENUE' | 'CLAIM'

type CellValue = { id: number | null; amount: string }
type RowValues = Record<number, CellValue>

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
const CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP'] as const
const EDITABLE_STATUSES = new Set(['Draft', 'Rejected'])

async function getYears(): Promise<BudgetYearRow[]> {
  const { data } = await api.get<BudgetYearRow[]>('/budget/years')
  return data
}

async function getVersions(yearId: number): Promise<BudgetVersionRow[]> {
  const { data } = await api.get<BudgetVersionRow[]>(`/budget/years/${yearId}/versions`)
  return data
}

async function getCustomers(): Promise<CustomerRow[]> {
  const { data } = await api.get<CustomerRow[]>('/customers')
  return data
}

async function getEntries(versionId: number): Promise<BudgetEntryRow[]> {
  const { data } = await api.get<BudgetEntryRow[]>(`/budget/versions/${versionId}/entries`)
  return data
}

function emptyRow(): RowValues {
  const r: RowValues = {}
  for (let m = 1; m <= 12; m += 1) r[m] = { id: null, amount: '' }
  return r
}

function toNumber(input: string): number {
  if (!input.trim()) return 0
  const parsed = Number(input.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function formatAmount(value: number): string {
  return value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatCompact(value: number): string {
  const millions = value / 1_000_000
  return `${millions.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`
}

export function BudgetEntryPage() {
  const [yearId, setYearId] = useState<number | null>(null)
  const [versionId, setVersionId] = useState<number | null>(null)
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [currency, setCurrency] = useState<string>('TRY')
  const [revenueRow, setRevenueRow] = useState<RowValues>(() => emptyRow())
  const [claimRow, setClaimRow] = useState<RowValues>(() => emptyRow())
  const [saveError, setSaveError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const yearsQuery = useQuery({ queryKey: ['budget-years'], queryFn: getYears })
  const versionsQuery = useQuery({
    queryKey: ['budget-versions', yearId],
    queryFn: () => (yearId ? getVersions(yearId) : Promise.resolve([])),
    enabled: yearId !== null,
  })
  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: getCustomers })
  const entriesQuery = useQuery({
    queryKey: ['budget-entries', versionId],
    queryFn: () => (versionId ? getEntries(versionId) : Promise.resolve([])),
    enabled: versionId !== null,
  })

  const years = yearsQuery.data ?? []
  const versions = versionsQuery.data ?? []
  const customers = (customersQuery.data ?? []).filter((c) => c.isActive)
  const entries = entriesQuery.data ?? []
  const currentVersion = versions.find((v) => v.id === versionId) ?? null
  const isEditable = currentVersion ? EDITABLE_STATUSES.has(currentVersion.status) : false

  useEffect(() => {
    if (yearId === null && years.length > 0) setYearId(years[0].id)
  }, [years, yearId])

  useEffect(() => {
    if (versionId === null && versions.length > 0) setVersionId(versions[0].id)
    if (versions.length === 0) setVersionId(null)
  }, [versions, versionId])

  useEffect(() => {
    if (customerId === null && customers.length > 0) setCustomerId(customers[0].id)
  }, [customers, customerId])

  useEffect(() => {
    if (!customerId) {
      setRevenueRow(emptyRow())
      setClaimRow(emptyRow())
      return
    }
    const customerEntries = entries.filter((e) => e.customerId === customerId)
    const revenue = emptyRow()
    const claim = emptyRow()
    for (const e of customerEntries) {
      const cell: CellValue = { id: e.id, amount: e.amountOriginal.toString() }
      if (e.entryType === 'REVENUE') revenue[e.month] = cell
      else claim[e.month] = cell
    }
    setRevenueRow(revenue)
    setClaimRow(claim)
    const firstCurrency = customerEntries.find((e) => e.currencyCode)?.currencyCode
    if (firstCurrency) setCurrency(firstCurrency)
  }, [customerId, entries])

  const revenueTotal = useMemo(
    () => Object.values(revenueRow).reduce((sum, c) => sum + toNumber(c.amount), 0),
    [revenueRow],
  )
  const claimTotal = useMemo(
    () => Object.values(claimRow).reduce((sum, c) => sum + toNumber(c.amount), 0),
    [claimRow],
  )
  const margin = revenueTotal - claimTotal
  const lossRatio = revenueTotal > 0 ? (claimTotal / revenueTotal) * 100 : 0
  const marginPct = revenueTotal > 0 ? (margin / revenueTotal) * 100 : 0

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!versionId || !customerId) throw new Error('Yıl, versiyon ve müşteri seçin')
      const upserts: BudgetEntryUpsert[] = []
      const collect = (row: RowValues, type: EntryType) => {
        for (let m = 1; m <= 12; m += 1) {
          const cell = row[m]
          const amount = toNumber(cell.amount)
          // Only POST if there's content or an existing entry to update (including zero).
          const hasContent = cell.amount.trim() !== ''
          if (!hasContent && cell.id === null) continue
          upserts.push({
            id: cell.id,
            customerId,
            month: m,
            entryType: type,
            amountOriginal: amount,
            currencyCode: currency,
          })
        }
      }
      collect(revenueRow, 'REVENUE')
      collect(claimRow, 'CLAIM')
      if (upserts.length === 0) return
      await api.put(`/budget/versions/${versionId}/entries/bulk`, { entries: upserts })
    },
    onSuccess: () => {
      setSaveError(null)
      queryClient.invalidateQueries({ queryKey: ['budget-entries', versionId] })
    },
    onError: (e: unknown) => {
      setSaveError(e instanceof Error ? e.message : 'Kayıt başarısız')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async ({ entryId }: { entryId: number }) => {
      if (!versionId) return
      await api.delete(`/budget/versions/${versionId}/entries/${entryId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-entries', versionId] })
    },
  })

  const updateCell = (type: EntryType, month: number, value: string) => {
    const setter = type === 'REVENUE' ? setRevenueRow : setClaimRow
    setter((prev) => ({ ...prev, [month]: { ...prev[month], amount: value } }))
  }

  const currentCustomer = customers.find((c) => c.id === customerId)

  return (
    <section>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-on-surface">Bütçe Planlama</h2>
          <p className="text-sm text-on-surface-variant mt-2 max-w-2xl">
            Müşteri bazlı gelir ve hasar bütçesi. Versiyon DRAFT veya REJECTED durumunda
            düzenlenebilir; onaylandıktan sonra salt-okunur.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="btn-primary"
            disabled={!isEditable || saveMutation.isPending}
            onClick={() => {
              setSaveError(null)
              saveMutation.mutate()
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              save
            </span>
            {saveMutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>

      <div className="card mb-4 flex flex-wrap items-center gap-3">
        <label className="label-sm">Yıl</label>
        <select
          className="select"
          value={yearId ?? ''}
          onChange={(e) => {
            setYearId(e.target.value === '' ? null : Number(e.target.value))
            setVersionId(null)
          }}
        >
          <option value="">—</option>
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              FY {y.year}
              {y.isLocked ? ' (kilitli)' : ''}
            </option>
          ))}
        </select>
        <label className="label-sm">Versiyon</label>
        <select
          className="select"
          value={versionId ?? ''}
          onChange={(e) => setVersionId(e.target.value === '' ? null : Number(e.target.value))}
          disabled={!yearId}
        >
          <option value="">—</option>
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} — {v.status}
              {v.isActive ? ' ★' : ''}
            </option>
          ))}
        </select>
        <label className="label-sm">Müşteri</label>
        <select
          className="select min-w-[320px]"
          value={customerId ?? ''}
          onChange={(e) => setCustomerId(e.target.value === '' ? null : Number(e.target.value))}
          disabled={customers.length === 0}
        >
          <option value="">—</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.name}
              {c.segmentName ? ` (${c.segmentName})` : ''}
            </option>
          ))}
        </select>
        <label className="label-sm">Para Birimi</label>
        <select
          className="select"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="ml-auto flex gap-2 items-center">
          {currentVersion ? (
            <span
              className={`chip ${
                currentVersion.status === 'Draft'
                  ? 'chip-info'
                  : currentVersion.status === 'Rejected'
                    ? 'chip-warning'
                    : 'chip-neutral'
              }`}
            >
              {currentVersion.status}
            </span>
          ) : null}
          {!isEditable && currentVersion ? (
            <span className="chip chip-warning">Salt-okunur</span>
          ) : null}
        </div>
      </div>

      {saveError ? (
        <div className="card mb-4 text-sm text-error">
          <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: 16 }}>
            error
          </span>
          {saveError}
        </div>
      ) : null}

      <div className="grid grid-cols-12 gap-4 mb-4">
        <KpiCard title="Plan Gelir" value={formatCompact(revenueTotal)} chip="chip-error" />
        <KpiCard title="Plan Hasar" value={formatCompact(claimTotal)} chip="chip-warning" />
        <KpiCard title="Teknik Marj" value={formatCompact(margin)} chip="chip-info" />
        <KpiCard title="Loss Ratio / Marj %" value={`%${formatAmount(lossRatio)} / %${formatAmount(marginPct)}`} chip="chip-neutral" />
      </div>

      {!versionId || !customerId ? (
        <div className="card text-sm text-on-surface-variant">
          Bütçe girişi için yıl, versiyon ve müşteri seçin.
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-outline-variant flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-on-surface">
                {currentCustomer ? `${currentCustomer.name} — ${currentCustomer.code}` : '—'}
              </h3>
              <p className="text-xs text-on-surface-variant">
                {currentCustomer?.segmentName ?? 'Segment yok'} · {MONTHS.length} aylık plan
              </p>
            </div>
            <div className="flex gap-2">
              <span className="chip chip-error">Gelir</span>
              <span className="chip chip-warning">Hasar</span>
              <span className="chip chip-info">Teknik Marj (formül)</span>
            </div>
          </div>
          <div className="max-h-[60vh] overflow-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ minWidth: 180 }}>Kalem</th>
                  {MONTHS.map((m) => (
                    <th key={m} className="text-right">
                      {m}
                    </th>
                  ))}
                  <th className="text-right bg-[#191c1f] text-white">Toplam</th>
                </tr>
              </thead>
              <tbody>
                <EntryRow
                  label="GELİR"
                  accent="bg-[#b50303]"
                  row={revenueRow}
                  disabled={!isEditable}
                  onChange={(month, value) => updateCell('REVENUE', month, value)}
                  onDelete={(entryId) => deleteMutation.mutate({ entryId })}
                />
                <EntryRow
                  label="HASAR"
                  accent="bg-[#8a5300]"
                  row={claimRow}
                  disabled={!isEditable}
                  onChange={(month, value) => updateCell('CLAIM', month, value)}
                  onDelete={(entryId) => deleteMutation.mutate({ entryId })}
                />
                <tr className="budget-metric-row">
                  <td className="font-semibold">TEKNİK MARJ</td>
                  {MONTHS.map((m, i) => {
                    const rev = toNumber(revenueRow[i + 1].amount)
                    const cla = toNumber(claimRow[i + 1].amount)
                    return (
                      <td key={m} className="text-right num font-semibold">
                        {formatAmount(rev - cla)}
                      </td>
                    )
                  })}
                  <td className="text-right num font-bold">{formatAmount(margin)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}

function EntryRow({
  label,
  accent,
  row,
  disabled,
  onChange,
  onDelete,
}: {
  label: string
  accent: string
  row: RowValues
  disabled: boolean
  onChange: (month: number, value: string) => void
  onDelete: (entryId: number) => void
}) {
  const total = Object.values(row).reduce((sum, c) => sum + toNumber(c.amount), 0)
  return (
    <>
      <tr>
        <td className="budget-section-row" colSpan={14}>
          <span className={`budget-section-dot ${accent}`} />
          {label}
        </td>
      </tr>
      <tr>
        <td className="font-semibold">Müşteri Toplam</td>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
          const cell = row[m]
          return (
            <td key={m} className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <input
                  className="cell-edit text-[#005b9f]"
                  value={cell.amount}
                  disabled={disabled}
                  onChange={(e) => onChange(m, e.target.value)}
                  inputMode="decimal"
                />
                {cell.id !== null && !disabled ? (
                  <button
                    type="button"
                    className="text-on-surface-variant hover:text-error"
                    title="Bu ay girişini sil"
                    onClick={() => {
                      if (confirm(`${MONTHS[m - 1]} için kayıt silinecek. Emin misiniz?`)) {
                        onDelete(cell.id!)
                      }
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                      close
                    </span>
                  </button>
                ) : null}
              </div>
            </td>
          )
        })}
        <td className="text-right num font-bold bg-surface-container-low">{formatAmount(total)}</td>
      </tr>
    </>
  )
}

function KpiCard({ title, value, chip }: { title: string; value: string; chip: string }) {
  return (
    <div className="col-span-12 md:col-span-3 card">
      <div className="flex items-center gap-2">
        <span className="label-sm">{title}</span>
        <span className={`chip ${chip}`} />
      </div>
      <p className="text-2xl font-black tracking-display num mt-2">{value}</p>
    </div>
  )
}
