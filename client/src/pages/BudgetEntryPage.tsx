import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BudgetTreePanel } from '../components/budget-planning/BudgetTreePanel'
import { BudgetCustomerGrid } from '../components/budget-planning/BudgetCustomerGrid'
import { BudgetOpexGrid } from '../components/budget-planning/BudgetOpexGrid'
import {
  CopyFromYearModal,
  GrowByPercentModal,
} from '../components/budget-planning/QuickActionModals'
import { ExcelImportModal } from '../components/budget-planning/ExcelImportModal'
import {
  bulkUpsertEntries,
  deleteEntry,
  getCustomers,
  getCustomerSummary,
  getEntries,
  getScenarios,
  getTree,
  getVersions,
  getYears,
  submitVersion,
} from '../components/budget-planning/api'
import {
  CURRENCIES,
  EDITABLE_STATUSES,
  MONTHS,
} from '../components/budget-planning/types'
import type {
  BudgetEntryUpsert,
  BudgetMode,
  CellValue,
  EntryType,
  RowValues,
  TreeSelection,
} from '../components/budget-planning/types'
import {
  emptyRow,
  formatAmount,
  formatCompact,
  lossRatioPercent,
  marginPercent,
  sum,
  toNumber,
} from '../components/budget-planning/utils'

type Modal = 'copy' | 'grow' | 'excel' | null

export function BudgetEntryPage() {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<BudgetMode>('tree')
  const [yearId, setYearId] = useState<number | null>(null)
  const [versionId, setVersionId] = useState<number | null>(null)
  const [scenarioId, setScenarioId] = useState<number | null>(null)
  const [currency, setCurrency] = useState<string>('TRY')
  const [selection, setSelection] = useState<TreeSelection | null>(null)
  const [revenueRow, setRevenueRow] = useState<RowValues>(() => emptyRow())
  const [claimRow, setClaimRow] = useState<RowValues>(() => emptyRow())
  const [saveError, setSaveError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [modal, setModal] = useState<Modal>(null)

  // -------- Queries --------

  const yearsQuery = useQuery({ queryKey: ['budget-years'], queryFn: getYears })
  const versionsQuery = useQuery({
    queryKey: ['budget-versions', yearId],
    queryFn: () => (yearId ? getVersions(yearId) : Promise.resolve([])),
    enabled: yearId !== null,
  })
  const scenariosQuery = useQuery({ queryKey: ['scenarios'], queryFn: getScenarios })
  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: getCustomers })
  const treeQuery = useQuery({
    queryKey: ['budget-tree', versionId],
    queryFn: () => (versionId ? getTree(versionId) : Promise.resolve(null)),
    enabled: versionId !== null,
  })
  const entriesQuery = useQuery({
    queryKey: ['budget-entries', versionId],
    queryFn: () => (versionId ? getEntries(versionId) : Promise.resolve([])),
    enabled: versionId !== null,
  })

  const selectedCustomerId =
    selection?.kind === 'customer' ? selection.customerId : null

  const summaryQuery = useQuery({
    queryKey: ['customer-summary', versionId, selectedCustomerId],
    queryFn: () =>
      versionId && selectedCustomerId
        ? getCustomerSummary(versionId, selectedCustomerId)
        : Promise.resolve(null),
    enabled: versionId !== null && selectedCustomerId !== null,
  })

  // Reference-stable derived arrays: `?? []` kullanımı her render'da yeni
  // array üretir, bu da aşağıdaki useEffect'lerde sonsuz loop'a yol açar
  // (entries effect: setRevenueRow → render → yeni entries ref → effect).
  // useMemo ile kaynak verinin referansına bağlarız.
  const years = useMemo(() => yearsQuery.data ?? [], [yearsQuery.data])
  const versions = useMemo(() => versionsQuery.data ?? [], [versionsQuery.data])
  const scenarios = useMemo(() => scenariosQuery.data ?? [], [scenariosQuery.data])
  const customers = useMemo(
    () => (customersQuery.data ?? []).filter((c) => c.isActive),
    [customersQuery.data],
  )
  const tree = treeQuery.data ?? null
  const entries = useMemo(() => entriesQuery.data ?? [], [entriesQuery.data])
  const currentVersion = versions.find((v) => v.id === versionId) ?? null
  const isEditable = currentVersion
    ? EDITABLE_STATUSES.has(currentVersion.status)
    : false

  // -------- Default selection effects --------

  useEffect(() => {
    if (yearId === null && years.length > 0) setYearId(years[0].id)
  }, [years, yearId])

  useEffect(() => {
    if (versionId === null && versions.length > 0) setVersionId(versions[0].id)
    if (versions.length === 0) setVersionId(null)
  }, [versions, versionId])

  useEffect(() => {
    if (scenarioId === null && scenarios.length > 0) setScenarioId(scenarios[0].id)
  }, [scenarios, scenarioId])

  // Default tree selection — first segment's first customer.
  useEffect(() => {
    if (!tree || selection) return
    const firstCustomer = tree.segments.find((s) => s.customers.length > 0)?.customers[0]
    if (firstCustomer) {
      setSelection({
        kind: 'customer',
        customerId: firstCustomer.customerId,
        segmentId: firstCustomer.segmentId,
      })
    } else if (tree.opexCategories.length > 0) {
      setSelection({
        kind: 'opex',
        expenseCategoryId: tree.opexCategories[0].expenseCategoryId,
      })
    }
  }, [tree, selection])

  // Load selected customer's entries into editable rows.
  useEffect(() => {
    if (selection?.kind !== 'customer') {
      setRevenueRow(emptyRow())
      setClaimRow(emptyRow())
      return
    }
    const customerEntries = entries.filter((e) => e.customerId === selection.customerId)
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
  }, [selection, entries])

  // -------- Derived KPIs --------

  const revenueTotal = useMemo(
    () => sum(Object.values(revenueRow).map((c) => toNumber(c.amount))),
    [revenueRow],
  )
  const claimTotal = useMemo(
    () => sum(Object.values(claimRow).map((c) => toNumber(c.amount))),
    [claimRow],
  )
  const margin = revenueTotal - claimTotal
  const lossRatio = lossRatioPercent(revenueTotal, claimTotal)
  const marginPct = marginPercent(revenueTotal, claimTotal)

  // -------- Mutations --------

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!versionId || selection?.kind !== 'customer') {
        throw new Error('Yıl, versiyon ve müşteri seçin')
      }
      const upserts: BudgetEntryUpsert[] = []
      const collect = (row: RowValues, type: EntryType) => {
        for (let m = 1; m <= 12; m += 1) {
          const cell = row[m]
          const amount = toNumber(cell.amount)
          const hasContent = cell.amount.trim() !== ''
          if (!hasContent && cell.id === null) continue
          upserts.push({
            id: cell.id,
            customerId: selection.customerId,
            month: m,
            entryType: type,
            amountOriginal: amount,
            currencyCode: currency,
          })
        }
      }
      collect(revenueRow, 'REVENUE')
      collect(claimRow, 'CLAIM')
      await bulkUpsertEntries(versionId, upserts)
    },
    onSuccess: () => {
      setSaveError(null)
      queryClient.invalidateQueries({ queryKey: ['budget-entries', versionId] })
      queryClient.invalidateQueries({ queryKey: ['budget-tree', versionId] })
      queryClient.invalidateQueries({ queryKey: ['customer-summary', versionId] })
    },
    onError: (e: unknown) => {
      setSaveError(e instanceof Error ? e.message : 'Kayıt başarısız')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (entryId: number) => {
      if (!versionId) return
      await deleteEntry(versionId, entryId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-entries', versionId] })
      queryClient.invalidateQueries({ queryKey: ['budget-tree', versionId] })
    },
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!versionId) throw new Error('Versiyon seçilmedi')
      await submitVersion(versionId)
    },
    onSuccess: () => {
      setSubmitError(null)
      queryClient.invalidateQueries({ queryKey: ['budget-versions', yearId] })
    },
    onError: (e: unknown) => {
      setSubmitError(e instanceof Error ? e.message : 'Onaya gönderme başarısız')
    },
  })

  // -------- Handlers --------

  const updateCell = (type: EntryType, month: number, value: string) => {
    const setter = type === 'REVENUE' ? setRevenueRow : setClaimRow
    setter((prev) => ({ ...prev, [month]: { ...prev[month], amount: value } }))
  }

  const deleteCell = (type: EntryType, month: number) => {
    const row = type === 'REVENUE' ? revenueRow : claimRow
    const cell = row[month]
    if (!cell?.id) return
    if (!confirm(`${MONTHS[month - 1]} için kayıt silinecek. Emin misiniz?`)) return
    deleteMutation.mutate(cell.id)
  }

  const handleModalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['budget-entries', versionId] })
    queryClient.invalidateQueries({ queryKey: ['budget-tree', versionId] })
    queryClient.invalidateQueries({ queryKey: ['customer-summary', versionId] })
  }

  // -------- Selected node metadata --------

  const selectedCustomer =
    selection?.kind === 'customer'
      ? tree?.segments
          .find((s) => s.segmentId === selection.segmentId)
          ?.customers.find((c) => c.customerId === selection.customerId)
      : null

  const selectedSegment =
    selection?.kind === 'customer'
      ? tree?.segments.find((s) => s.segmentId === selection.segmentId)
      : null

  const selectedOpex =
    selection?.kind === 'opex'
      ? tree?.opexCategories.find((o) => o.expenseCategoryId === selection.expenseCategoryId)
      : null

  const summary = summaryQuery.data ?? null

  // -------- Render --------

  return (
    <section>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-on-surface">
            Bütçe Planlama
          </h2>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="btn-secondary"
            disabled={!versionId || !isEditable}
            onClick={() => setModal('excel')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              upload_file
            </span>
            Excel İçe Aktar
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={!isEditable || saveMutation.isPending || selection?.kind !== 'customer'}
            onClick={() => {
              setSaveError(null)
              saveMutation.mutate()
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              save
            </span>
            {saveMutation.isPending ? 'Kaydediliyor…' : 'Taslak Kaydet'}
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!isEditable || submitMutation.isPending}
            onClick={() => {
              if (!confirm('Bu versiyon onaya gönderilecek. Emin misiniz?')) return
              setSubmitError(null)
              submitMutation.mutate()
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              verified
            </span>
            {submitMutation.isPending ? 'Gönderiliyor…' : 'Onaya Gönder'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-surface-container-low rounded-lg p-1 w-fit">
        <button
          type="button"
          className={`tab ${mode === 'tree' ? 'active' : ''}`}
          onClick={() => setMode('tree')}
        >
          <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: 16 }}>
            account_tree
          </span>
          Hiyerarşik Planlama (A)
        </button>
        <button
          type="button"
          className={`tab ${mode === 'customer' ? 'active' : ''}`}
          onClick={() => setMode('customer')}
        >
          <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: 16 }}>
            person_pin
          </span>
          Müşteri Odaklı Giriş (C)
        </button>
      </div>

      {/* Filters + legend */}
      <div className="card mb-4 flex flex-wrap items-center gap-3">
        <span className="label-sm">Filtre</span>
        <select
          className="select"
          value={yearId ?? ''}
          onChange={(e) => {
            setYearId(e.target.value === '' ? null : Number(e.target.value))
            setVersionId(null)
            setSelection(null)
          }}
        >
          <option value="">Yıl —</option>
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              FY {y.year}
              {y.isLocked ? ' (kilitli)' : ''}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={versionId ?? ''}
          onChange={(e) => {
            setVersionId(e.target.value === '' ? null : Number(e.target.value))
            setSelection(null)
          }}
          disabled={!yearId}
        >
          <option value="">Versiyon —</option>
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} — {v.status}
              {v.isActive ? ' ★' : ''}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={scenarioId ?? ''}
          onChange={(e) =>
            setScenarioId(e.target.value === '' ? null : Number(e.target.value))
          }
        >
          <option value="">Senaryo —</option>
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
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
        <div className="ml-auto flex items-center gap-2">
          <span className="chip chip-info">Mavi = giriş</span>
          <span className="chip chip-neutral">Gri = formül</span>
          <span className="chip chip-warning">Sarı = müşteri zorunlu</span>
          {currentVersion && !isEditable ? (
            <span className="chip chip-error">Salt-okunur</span>
          ) : null}
        </div>
      </div>

      {/* Error rows */}
      {saveError ? (
        <div className="card mb-4 text-sm text-error">
          <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: 16 }}>
            error
          </span>
          {saveError}
        </div>
      ) : null}
      {submitError ? (
        <div className="card mb-4 text-sm text-error">
          <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: 16 }}>
            error
          </span>
          {submitError}
        </div>
      ) : null}

      {/* KPI cards */}
      <div className="grid grid-cols-12 gap-4 mb-4">
        <KpiCard title="Plan Gelir" value={formatCompact(revenueTotal)} chipClass="chip-error" />
        <KpiCard title="Plan Hasar" value={formatCompact(claimTotal)} chipClass="chip-warning" />
        <KpiCard
          title="Teknik Marj"
          value={formatCompact(margin)}
          chipClass="chip-info"
          note={`%${formatAmount(marginPct)} marj`}
        />
        <KpiCard
          title="Loss Ratio"
          value={`%${formatAmount(lossRatio)}`}
          chipClass="chip-neutral"
        />
      </div>

      {/* Body: tree or customer mode */}
      {mode === 'tree' ? (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-3">
            <BudgetTreePanel
              tree={tree}
              selection={selection}
              onSelect={setSelection}
              loading={treeQuery.isLoading}
            />
          </div>
          <div className="col-span-12 lg:col-span-9">
            <SelectedNodeHeader
              customerName={selectedCustomer?.customerName ?? null}
              customerCode={selectedCustomer?.customerCode ?? null}
              segmentName={selectedSegment?.segmentName ?? null}
              opex={selectedOpex ?? null}
              summary={summary}
              canEdit={isEditable && selection?.kind === 'customer'}
              onCopy={() => setModal('copy')}
              onGrow={() => setModal('grow')}
            />
            {selection?.kind === 'customer' ? (
              <BudgetCustomerGrid
                revenueRow={revenueRow}
                claimRow={claimRow}
                disabled={!isEditable}
                onCellChange={updateCell}
                onCellDelete={deleteCell}
              />
            ) : selectedOpex ? (
              <BudgetOpexGrid opex={selectedOpex} />
            ) : (
              <div className="card text-sm text-on-surface-variant">
                Soldan bir müşteri veya gider kalemi seçin.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="card mb-4 flex flex-wrap items-center gap-3">
            <span className="label-sm">Müşteri Seç</span>
            <select
              className="select min-w-[420px]"
              value={selectedCustomerId ?? ''}
              onChange={(e) => {
                const id = e.target.value === '' ? null : Number(e.target.value)
                const cust = customers.find((c) => c.id === id)
                setSelection(
                  id && cust
                    ? { kind: 'customer', customerId: id, segmentId: cust.segmentId }
                    : null,
                )
              }}
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
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                className="btn-secondary"
                disabled={!isEditable || selectedCustomerId == null}
                onClick={() => setModal('copy')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  content_copy
                </span>
                Geçen Yıl Kopyala
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={!isEditable || selectedCustomerId == null}
                onClick={() => setModal('grow')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  trending_up
                </span>
                +%X Büyüt
              </button>
            </div>
          </div>

          {selection?.kind === 'customer' ? (
            <BudgetCustomerGrid
              revenueRow={revenueRow}
              claimRow={claimRow}
              disabled={!isEditable}
              onCellChange={updateCell}
              onCellDelete={deleteCell}
            />
          ) : (
            <div className="card text-sm text-on-surface-variant">
              Müşteri seçin — aylık plan burada açılacak.
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {modal === 'copy' && versionId ? (
        <CopyFromYearModal
          versionId={versionId}
          customerId={selectedCustomerId}
          years={years}
          currentYearId={yearId}
          onClose={() => setModal(null)}
          onSuccess={handleModalSuccess}
        />
      ) : null}
      {modal === 'grow' && versionId ? (
        <GrowByPercentModal
          versionId={versionId}
          customerId={selectedCustomerId}
          onClose={() => setModal(null)}
          onSuccess={handleModalSuccess}
        />
      ) : null}
      {modal === 'excel' && versionId ? (
        <ExcelImportModal
          versionId={versionId}
          onClose={() => setModal(null)}
          onSuccess={handleModalSuccess}
        />
      ) : null}
    </section>
  )
}

function SelectedNodeHeader({
  customerName,
  customerCode,
  segmentName,
  opex,
  summary,
  canEdit,
  onCopy,
  onGrow,
}: {
  customerName: string | null
  customerCode: string | null
  segmentName: string | null
  opex: { categoryName: string; totalTry: number } | null
  summary: { activeContractCount: number; lossRatioPercent: number } | null
  canEdit: boolean
  onCopy: () => void
  onGrow: () => void
}) {
  if (opex) {
    return (
      <div className="card mb-4 flex items-center gap-4">
        <div>
          <p className="text-[0.65rem] text-on-surface-variant font-semibold uppercase tracking-[0.08em]">
            Seçili gider kalemi
          </p>
          <h3 className="text-[1.5rem] leading-none font-black tracking-display text-on-surface mt-1">
            {opex.categoryName}
          </h3>
          <p className="text-sm text-on-surface-variant mt-1">
            OPEX · Toplam {formatCompact(opex.totalTry)}
          </p>
        </div>
      </div>
    )
  }

  if (customerName) {
    return (
      <div className="card mb-4 flex items-center gap-4">
        <div className="flex-1">
          <p className="text-[0.65rem] text-on-surface-variant font-semibold uppercase tracking-[0.08em]">
            Seçili müşteri
          </p>
          <h3 className="text-[1.5rem] leading-none font-black tracking-display text-on-surface mt-1">
            {customerName}{' '}
            {segmentName ? <span className="chip chip-info ml-2">{segmentName}</span> : null}
          </h3>
          <p className="text-sm text-on-surface-variant mt-1">
            {customerCode}
            {summary
              ? ` • ${summary.activeContractCount} aktif sözleşme • Loss Ratio %${formatAmount(summary.lossRatioPercent)}`
              : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-secondary"
            disabled={!canEdit}
            onClick={onCopy}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              content_copy
            </span>
            Geçen Yıl Kopyala
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={!canEdit}
            onClick={onGrow}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              trending_up
            </span>
            +%X Büyüt
          </button>
        </div>
      </div>
    )
  }

  return null
}

function KpiCard({
  title,
  value,
  chipClass,
  note,
}: {
  title: string
  value: string
  chipClass: string
  note?: string
}) {
  return (
    <div className="col-span-12 md:col-span-3 card">
      <div className="flex items-center gap-2">
        <span className="label-sm">{title}</span>
        <span className={`chip ${chipClass}`} />
      </div>
      <p className="text-2xl font-black tracking-display num mt-2">{value}</p>
      {note ? <p className="text-xs text-on-surface-variant mt-1">{note}</p> : null}
    </div>
  )
}
