import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BudgetTreePanel } from '../components/budget-planning/BudgetTreePanel'
import { BudgetCustomerGrid } from '../components/budget-planning/BudgetCustomerGrid'
import { cellKey } from '../components/budget-planning/budget-grid-types'
import type {
  CellId,
  ContractRow,
  GridValues,
} from '../components/budget-planning/budget-grid-types'
import { BudgetOpexGrid } from '../components/budget-planning/BudgetOpexGrid'
import {
  CopyFromYearModal,
  GrowByPercentModal,
} from '../components/budget-planning/QuickActionModals'
import { ExcelImportModal } from '../components/budget-planning/ExcelImportModal'
import { WorkContextBar } from '../components/budget-planning/WorkContextBar'
import { SubmissionChecklist } from '../components/budget-planning/SubmissionChecklist'
import { useSubmissionChecklist } from '../components/budget-planning/useSubmissionChecklist'
import {
  useNextStepNavigator,
  type NextStepAction,
} from '../components/budget-planning/useNextStepNavigator'
import { BudgetPeriodsPage } from './BudgetPeriodsPage'
import { translateApiError } from '../lib/api-error'
import { METRIC_LABELS } from '../lib/metric-labels'
import { HelpHint } from '../components/shared/Tooltip'
import { showToast } from '../components/shared/toast-bus'
import {
  bulkUpsertEntries,
  createRevision,
  createVersion,
  deleteEntry,
  getCustomerContracts,
  getCustomers,
  getEntries,
  getExpenseEntries,
  getTree,
  getVersions,
  getYears,
  submitVersion,
} from '../components/budget-planning/api'
import type { CustomerContractRow } from '../components/budget-planning/api'
import {
  CURRENCIES,
  getStatusLabel,
  IN_PROGRESS_STATUSES,
  isEditableStatus,
  MONTHS,
} from '../components/budget-planning/types'
import type {
  BudgetEntryUpsert,
  BudgetMode,
  BudgetVersionStatus,
  CustomerRow,
  TreeSelection,
} from '../components/budget-planning/types'
import {
  formatAmount,
  formatCompact,
  lossRatioPercent,
  marginPercent,
  toNumber,
} from '../components/budget-planning/utils'
import { useAppContextStore } from '../stores/appContext'

type Modal = 'copy' | 'grow' | 'excel' | null

export function BudgetEntryPage() {
  const queryClient = useQueryClient()
  const ALL_OPTION = '__all__'
  const [mode, setMode] = useState<BudgetMode>('tree')
  const [yearOverride, setYearOverride] = useState<number | null>(null)
  const versionId = useAppContextStore((s) => s.selectedVersionId)
  const setVersion = useAppContextStore((s) => s.setVersion)
  const [currency, setCurrency] = useState<string>('TRY')
  const [selectionOverride, setSelectionOverride] = useState<TreeSelection | null>(null)
  const [customerModeSegmentId, setCustomerModeSegmentId] = useState<number | null>(null)
  const [customerModeCustomerId, setCustomerModeCustomerId] = useState<number | null>(null)
  const [values, setValues] = useState<GridValues>({})
  const [customerDrafts, setCustomerDrafts] = useState<Record<number, GridValues>>({})
  const [dirtyCustomerIds, setDirtyCustomerIds] = useState<number[]>([])
  const [pendingDeleteIds, setPendingDeleteIds] = useState<number[]>([])
  const [saveError, setSaveError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [createDraftError, setCreateDraftError] = useState<string | null>(null)
  const [modal, setModal] = useState<Modal>(null)

  // Bağımsız sorgular (türetilmiş değerlere bağlı değil).
  const yearsQuery = useQuery({ queryKey: ['budget-years'], queryFn: getYears })
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

  const years = useMemo(() => yearsQuery.data ?? [], [yearsQuery.data])
  const customers = useMemo(
    () => (customersQuery.data ?? []).filter((c) => c.isActive),
    [customersQuery.data],
  )
  const tree = treeQuery.data ?? null
  const entries = useMemo(() => entriesQuery.data ?? [], [entriesQuery.data])

  // Varsayılan yıl: bugünün yılı (fallback: kilitli olmayan ilk yıl, o da
  // yoksa listedeki ilk yıl). Kullanıcı her gelişte güncel FY'ye düşer.
  const yearId = useMemo<number | null>(() => {
    if (yearOverride !== null && years.some((y) => y.id === yearOverride)) {
      return yearOverride
    }
    if (years.length === 0) return null
    const now = new Date().getFullYear()
    const current = years.find((y) => y.year === now)
    const firstOpen = years.find((y) => !y.isLocked)
    return (current ?? firstOpen ?? years[0]).id
  }, [yearOverride, years])
  const setYearId = setYearOverride

  const expenseEntriesQuery = useQuery({
    queryKey: ['expense-entries', yearId, versionId],
    queryFn: () =>
      yearId && versionId
        ? getExpenseEntries(yearId, versionId)
        : Promise.resolve([]),
    enabled: yearId !== null && versionId !== null,
  })

  // Mode'a göre default selection:
  //  - A (tree) → ilk segment
  //  - C (customer) → ilk müşteri
  const selection = useMemo<TreeSelection | null>(() => {
    if (!tree) return selectionOverride
    if (selectionOverride) return selectionOverride
    if (mode === 'tree') {
      const firstSegment = tree.segments[0]
      if (firstSegment) {
        return { kind: 'segment', segmentId: firstSegment.segmentId }
      }
      return null
    }
    const firstCustomer = tree.segments.find((s) => s.customers.length > 0)?.customers[0]
    if (firstCustomer) {
      return {
        kind: 'customer',
        customerId: firstCustomer.customerId,
        segmentId: firstCustomer.segmentId,
      }
    }
    return null
  }, [tree, mode, selectionOverride])
  const setSelection = setSelectionOverride

  // yearId'ye bağımlı versiyon sorgusu.
  const versionsQuery = useQuery({
    queryKey: ['budget-versions', yearId],
    queryFn: () => (yearId ? getVersions(yearId) : Promise.resolve([])),
    enabled: yearId !== null,
  })
  const versions = useMemo(() => versionsQuery.data ?? [], [versionsQuery.data])

  // selection'a bağımlı kontrat sorgusu.
  const selectedCustomerId =
    mode === 'customer'
      ? customerModeCustomerId
      : selection?.kind === 'customer'
        ? selection.customerId
        : null
  const contractsQuery = useQuery({
    queryKey: ['customer-contracts', selectedCustomerId],
    queryFn: () =>
      selectedCustomerId
        ? getCustomerContracts(selectedCustomerId)
        : Promise.resolve([]),
    enabled: selectedCustomerId !== null,
  })
  const contracts = useMemo(
    () => (contractsQuery.data ?? []).filter((c) => c.isActive),
    [contractsQuery.data],
  )

  const currentVersion = versions.find((v) => v.id === versionId) ?? null
  const isEditable = isEditableStatus(currentVersion?.status)

  const gridContracts = useMemo<ContractRow[]>(
    () =>
      contracts.map((c) => ({
        contractId: c.id,
        productName: c.productName,
        productCode: c.productCode,
        contractCode: c.contractCode,
      })),
    [contracts],
  )

  const contractByProductId = useMemo(() => {
    const m = new Map<number, CustomerContractRow>()
    for (const c of contracts) m.set(c.productId, c)
    return m
  }, [contracts])

  // Varsayılan versiyon: düzenlenebilir (DRAFT/REJECTED) varsa onu, yoksa
  // aktif olanı, o da yoksa listedeki ilkini seç. Kullanıcının girişe hazır
  // bir versiyona düşmesi için. (setVersion = zustand store action, rule dışı.)
  useEffect(() => {
    if (versions.length === 0) {
      setVersion(null)
      return
    }
    if (versionId !== null && versions.some((v) => v.id === versionId)) return
    const editable = versions.find((v) => isEditableStatus(v.status))
    if (editable) {
      setVersion({ id: editable.id, label: editable.name, status: editable.status })
      return
    }
    const fallback = versions.find((v) => v.isActive) ?? versions[0]
    setVersion({ id: fallback.id, label: fallback.name, status: fallback.status })
  }, [versions, versionId, setVersion])

  // Müşteri + entries + contracts değiştikçe grid value'ları yeniden kur.
  // React 19: "Storing information from previous renders" — useEffect yerine
  // render sırasında setState (guarded) ile server verisini form'a sync et.
  const [valuesSyncKey, setValuesSyncKey] = useState<{
    selectedCustomerId: number | null
    entries: typeof entries
    contractByProductId: typeof contractByProductId
  }>({ selectedCustomerId, entries, contractByProductId })
  if (
    valuesSyncKey.selectedCustomerId !== selectedCustomerId ||
    valuesSyncKey.entries !== entries ||
    valuesSyncKey.contractByProductId !== contractByProductId
  ) {
    setValuesSyncKey({ selectedCustomerId, entries, contractByProductId })
    if (selectedCustomerId === null) {
      setValues({})
    } else if (customerDrafts[selectedCustomerId]) {
      setValues(customerDrafts[selectedCustomerId]!)
    } else {
      const next: GridValues = {}
      const customerEntries = entries.filter((e) => e.customerId === selectedCustomerId)
      for (const e of customerEntries) {
        let contractId: number | null = null
        if (e.contractId) {
          contractId = e.contractId
        } else if (e.productId && contractByProductId.has(e.productId)) {
          contractId = contractByProductId.get(e.productId)!.id
        }
        const key = cellKey({
          contractId,
          kind: e.entryType,
          month: e.month,
        })
        next[key] = {
          id: e.id,
          amount: e.amountOriginal.toString(),
          quantity: e.quantity ?? null,
        }
      }
      setValues(next)
      setCustomerDrafts((prev) => ({ ...prev, [selectedCustomerId]: next }))
      const firstCurrency = customerEntries.find((e) => e.currencyCode)?.currencyCode
      if (firstCurrency) setCurrency(firstCurrency)
    }
  }

  const selectedSegmentData =
    selection?.kind === 'segment'
      ? tree?.segments.find((s) => s.segmentId === selection.segmentId) ?? null
      : null

  const selectedOpex =
    selection?.kind === 'opex'
      ? tree?.opexCategories.find(
          (o) => o.expenseCategoryId === selection.expenseCategoryId,
        )
      : null

  const selectedCustomerData =
    selection?.kind === 'customer'
      ? tree?.segments
          .flatMap((segment) => segment.customers)
          .find((customer) => customer.customerId === selection.customerId) ?? null
      : null

  const activeSegmentData =
    selection?.kind === 'segment'
      ? selectedSegmentData
      : selection?.kind === 'customer'
        ? tree?.segments.find((segment) => segment.segmentId === selection.segmentId) ?? null
        : null

  // Müşteri başına tamamlandı: versiyonda o müşterinin en az 1 BudgetEntry'si
  // varsa "tamamlandı" sayılır (design doc §4 karar A).
  const completedCustomerIds = useMemo(() => {
    const ids = new Set<number>()
    for (const e of entries) ids.add(e.customerId)
    return ids
  }, [entries])

  const totalCustomerCount = customers.length
  const completedCustomerCount = completedCustomerIds.size
  const allCustomersComplete =
    totalCustomerCount > 0 && completedCustomerCount === totalCustomerCount
  const missingCustomerCount = Math.max(0, totalCustomerCount - completedCustomerCount)
  const customerModeSegment = useMemo(
    () =>
      customerModeSegmentId === null
        ? null
        : (tree?.segments.find((segment) => segment.segmentId === customerModeSegmentId) ?? null),
    [customerModeSegmentId, tree],
  )
  const customerModeFilteredCustomers = useMemo(
    () =>
      customers.filter((c) =>
        customerModeSegmentId ? c.segmentId === customerModeSegmentId : true,
      ),
    [customers, customerModeSegmentId],
  )
  const customerModeLabel = customerModeSegment
    ? `${customerModeSegment.segmentName} müşterileri`
    : 'Müşteri Seç'
  const customerModeAllLabel = customerModeSegment
    ? `Tüm ${customerModeSegment.segmentName} müşterileri`
    : 'Tüm müşteriler'

  const hasInProgressDraft = versions.some((v) =>
    IN_PROGRESS_STATUSES.has(v.status as BudgetVersionStatus),
  )

  const expenseEntries = useMemo(
    () => expenseEntriesQuery.data ?? [],
    [expenseEntriesQuery.data],
  )

  // Onaya hazırlık checklist (esnek: 1 sert + 4 yumuşak kural)
  const checklist = useSubmissionChecklist({
    customers,
    entries,
    expenseEntries,
  })

  // WorkContextBar smart navigator — checklist priority'sinden tek
  // navigation hedefi türetir (jump-to-customer/opex/highlight-scenario).
  const opexLite = useMemo(
    () =>
      (tree?.opexCategories ?? []).map((o) => ({
        expenseCategoryId: o.expenseCategoryId,
      })),
    [tree],
  )
  const nextStep = useNextStepNavigator(checklist, {
    customers,
    entries,
    opexCategories: opexLite,
  })

  const overviewTotals = useMemo(
    () => ({
      revenueTotal: tree?.revenueTotalTry ?? 0,
      claimTotal: tree?.claimTotalTry ?? 0,
    }),
    [tree],
  )

  const overviewMargin = overviewTotals.revenueTotal - overviewTotals.claimTotal
  const overviewLossRatio = lossRatioPercent(
    overviewTotals.revenueTotal,
    overviewTotals.claimTotal,
  )
  const overviewMarginPct = marginPercent(
    overviewTotals.revenueTotal,
    overviewTotals.claimTotal,
  )

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!versionId || dirtyCustomerIds.length === 0) {
        throw new Error('Kaydedilecek değişiklik yok')
      }
      const upserts: BudgetEntryUpsert[] = []
      for (const customerId of dirtyCustomerIds) {
        const draft = customerDrafts[customerId] ?? {}
        for (const key of Object.keys(draft)) {
          const cell = draft[key]
          const [rawContractId, kind, monthStr] = key.split(':')
          const amount = toNumber(cell.amount)
          const hasContent = cell.amount.trim() !== '' || cell.quantity != null
          if (!hasContent && cell.id === null) continue

          const contractId =
            rawContractId === 'fb' || rawContractId === ''
              ? null
              : Number(rawContractId)

          upserts.push({
            id: cell.id,
            customerId,
            month: Number(monthStr),
            entryType: kind as 'REVENUE' | 'CLAIM',
            amountOriginal: amount,
            currencyCode: currency,
            contractId,
            // Quantity only relevant on REVENUE rows; CLAIM rows always send null.
            quantity:
              (kind as 'REVENUE' | 'CLAIM') === 'REVENUE' ? cell.quantity : null,
          })
        }
      }
      await bulkUpsertEntries(versionId, upserts)
      for (const entryId of pendingDeleteIds) {
        await deleteEntry(versionId, entryId)
      }
    },
    onSuccess: () => {
      setSaveError(null)
      setCustomerDrafts({})
      setDirtyCustomerIds([])
      setPendingDeleteIds([])
      queryClient.invalidateQueries({ queryKey: ['budget-entries', versionId] })
      queryClient.invalidateQueries({ queryKey: ['budget-tree', versionId] })
      queryClient.invalidateQueries({ queryKey: ['customer-summary', versionId] })
    },
    onError: (e: unknown) => {
      setSaveError(translateApiError(e, {
        resource: 'budget',
        statusLabel: getStatusLabel(currentVersion?.status),
      }))
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
      setSubmitError(translateApiError(e, {
        resource: 'budget',
        statusLabel: getStatusLabel(currentVersion?.status),
      }))
    },
  })

  // Aktif versiyon varsa "revizyon" — backend Active'in tüm budget_entries'ini
  // yeni taslağa kopyalar (POST /create-revision). Aktif yoksa boş yeni taslak
  // (POST /years/{yearId}/versions). Buton metni / banner mesajı bu farkı yansıtır.
  const createDraftMutation = useMutation({
    mutationFn: async () => {
      if (!yearId) throw new Error('Yıl seçilmedi')
      // Aktif versiyon varsa onun id'siyle revizyon aç, yoksa boş taslak.
      const activeVersion = versions.find(
        (v) => (v.status as BudgetVersionStatus) === 'Active',
      )
      if (activeVersion) {
        return createRevision(activeVersion.id)
      }
      const yearLabel = years.find((y) => y.id === yearId)?.year ?? yearId
      const nextIndex = versions.length + 1
      const name = `${yearLabel} V${nextIndex} Taslak`
      return createVersion(yearId, { name })
    },
    onSuccess: (created) => {
      setCreateDraftError(null)
      setVersion({ id: created.id, label: created.name, status: created.status })
      setSelection(null)
      setCustomerModeSegmentId(null)
      setCustomerModeCustomerId(null)
      setCustomerDrafts({})
      setDirtyCustomerIds([])
      queryClient.invalidateQueries({ queryKey: ['budget-versions', yearId] })
      queryClient.invalidateQueries({ queryKey: ['budget-entries', created.id] })
      queryClient.invalidateQueries({ queryKey: ['budget-tree', created.id] })
    },
    onError: (e: unknown) => {
      setCreateDraftError(translateApiError(e))
    },
  })

  // Smart navigator "Düzelt →" CTA → mode/selection güncelle, gerekirse
  // senaryo dropdown'unu pulse ile vurgula. Pulse: 1.5s sonra attribute kaldır.
  const handleJumpToNextStep = (action: NextStepAction) => {
    if (action.kind === 'jump-to-customer' && action.customerId) {
      const cust = customers.find((c) => c.id === action.customerId)
      if (cust) {
        setMode('customer')
        setCustomerModeSegmentId(cust.segmentId)
        setCustomerModeCustomerId(cust.id)
        setSelection({
          kind: 'customer',
          customerId: cust.id,
          segmentId: cust.segmentId,
        })
      }
    } else if (action.kind === 'jump-to-opex' && action.expenseCategoryId) {
      setMode('tree')
      setSelection({
        kind: 'opex',
        expenseCategoryId: action.expenseCategoryId,
      })
    }
  }

  const updateCell = (
    cell: CellId,
    value: { amount: string; quantity: number | null },
  ) => {
    if (selectedCustomerId === null) return
    setValues((prev) => {
      const key = cellKey(cell)
      const existing = prev[key]
      const next = {
        ...prev,
        [key]: {
          id: existing?.id ?? null,
          amount: value.amount,
          quantity: value.quantity,
        },
      }
      setCustomerDrafts((drafts) => ({
        ...drafts,
        [selectedCustomerId]: next,
      }))
      setDirtyCustomerIds((prevDirty) =>
        prevDirty.includes(selectedCustomerId)
          ? prevDirty
          : [...prevDirty, selectedCustomerId],
      )
      return next
    })
  }

  const deleteCellHandler = (cell: CellId, entryId: number) => {
    if (!confirm(`${MONTHS[cell.month - 1]} kaydı silinecek. Emin misiniz?`)) return
    if (selectedCustomerId !== null) {
      setValues((prev) => {
        const key = cellKey(cell)
        const next = {
          ...prev,
          [key]: { id: null, amount: '', quantity: null },
        }
        setCustomerDrafts((drafts) => ({
          ...drafts,
          [selectedCustomerId]: next,
        }))
        setDirtyCustomerIds((prevDirty) =>
          prevDirty.includes(selectedCustomerId)
            ? prevDirty
            : [...prevDirty, selectedCustomerId],
        )
        return next
      })
    }
    setPendingDeleteIds((prev) =>
      prev.includes(entryId) ? prev : [...prev, entryId],
    )
  }

  const handleModalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['budget-entries', versionId] })
    queryClient.invalidateQueries({ queryKey: ['budget-tree', versionId] })
    queryClient.invalidateQueries({ queryKey: ['customer-summary', versionId] })
  }

  const handleSubmit = () => {
    if (!isEditable || !allCustomersComplete) return
    const warningList = checklist.items
      .filter((i) => i.level === 'warn')
      .map((i) => `   • ${i.message}`)
      .join('\n')
    const msg =
      checklist.warnCount > 0
        ? `Bu versiyon onaya gönderilecek.\n\n⚠ Uyarılar (göndermeyi engellemez):\n${warningList}\n\nDevam etmek istiyor musunuz?`
        : 'Bu versiyon onaya gönderilecek. Emin misiniz?'
    if (!confirm(msg)) return
    setSubmitError(null)
    submitMutation.mutate()
  }

  return (
    <section>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-on-surface">
            Bütçe Planlama
          </h2>
          <p className="page-context-hint">
            Aktif veya taslak bütçeyi müşteri × ay × ürün matrisinde girin.
            Sadece <strong>Taslak</strong> ve <strong>Reddedildi</strong> sürümler düzenlenebilir.
          </p>
        </div>
        <div className="flex gap-3">
          {isEditable ? (
            <button
              type="button"
              className={mode === 'customer' ? 'btn-primary' : 'btn-secondary'}
              disabled={!versionId}
              onClick={() => setModal('excel')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                upload_file
              </span>
              {mode === 'customer' ? 'Excel’den Toplu Aktar' : 'Excel İçe Aktar'}
            </button>
          ) : null}
          {mode === 'customer' ? (
            <button
              type="button"
              className="btn-secondary"
              disabled={
                !isEditable || saveMutation.isPending || dirtyCustomerIds.length === 0
              }
              onClick={() => {
                setSaveError(null)
                saveMutation.mutate()
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                save
              </span>
              {saveMutation.isPending
                ? 'Kaydediliyor…'
                : dirtyCustomerIds.length > 1
                  ? `Tüm Değişiklikleri Kaydet (${dirtyCustomerIds.length})`
                  : 'Tüm Değişiklikleri Kaydet'}
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex gap-1 mb-4 bg-surface-container-low rounded-lg p-1 w-fit">
        <button
          type="button"
          className={`tab ${mode === 'tree' ? 'active' : ''}`}
          onClick={() => setMode('tree')}
        >
          <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: 16 }}>
            account_tree
          </span>
          Hiyerarşik Planlama
        </button>
        <button
          type="button"
          className={`tab ${mode === 'customer' ? 'active' : ''}`}
          onClick={() => setMode('customer')}
        >
          <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: 16 }}>
            person_pin
          </span>
          Müşteri Odaklı Giriş
        </button>
        <button
          type="button"
          className={`tab ${mode === 'versions' ? 'active' : ''}`}
          onClick={() => setMode('versions')}
        >
          <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: 16 }}>
            calendar_month
          </span>
          Versiyonlar
        </button>
      </div>

      <div className="card mb-4 flex flex-wrap items-center gap-3">
        <span className="label-sm">Filtre</span>
        <select
          className="select"
          value={yearId ?? ''}
          onChange={(e) => {
            setYearId(e.target.value === '' ? null : Number(e.target.value))
            setVersion(null)
            setSelection(null)
            setCustomerModeSegmentId(null)
            setCustomerModeCustomerId(null)
            setCustomerDrafts({})
            setDirtyCustomerIds([])
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
            const id = e.target.value === '' ? null : Number(e.target.value)
            if (id === null) {
              setVersion(null)
            } else {
              const v = versions.find((x) => x.id === id)
              if (v) setVersion({ id: v.id, label: v.name, status: v.status })
            }
            setSelection(null)
            setCustomerModeSegmentId(null)
            setCustomerModeCustomerId(null)
            setCustomerDrafts({})
            setDirtyCustomerIds([])
          }}
          disabled={!yearId}
        >
          <option value="">Versiyon —</option>
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} — {getStatusLabel(v.status)}
              {v.isActive ? ' ★' : ''}
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
          <span className="chip chip-neutral inline-flex items-center gap-1">
            Hücre Rehberi
            <HelpHint
              placement="bottom"
              text="Mavi hücreler doğrudan giriş alanıdır. Gri hücreler formülle hesaplanır. Sarı hücreler müşteri seçmeden doldurulamaz."
            />
          </span>
          {currentVersion && !isEditable ? (
            <span className="chip chip-error">Salt-okunur</span>
          ) : null}
        </div>
      </div>

      {saveError ? (
        <div className="card mb-4 text-sm text-error">{saveError}</div>
      ) : null}
      {submitError ? (
        <div className="card mb-4 text-sm text-error">{submitError}</div>
      ) : null}
      {createDraftError ? (
        <div className="card mb-4 text-sm text-error">{createDraftError}</div>
      ) : null}
      {yearId && currentVersion ? (
        <WorkContextBar
          yearLabel={years.find((y) => y.id === yearId)?.year ?? 0}
          version={currentVersion}
          isEditable={isEditable}
          completedCount={completedCustomerCount}
          totalCount={totalCustomerCount}
          currency={currency}
          onCreateRevision={
            hasInProgressDraft
              ? undefined
              : () => {
                  setCreateDraftError(null)
                  createDraftMutation.mutate()
                }
          }
          createRevisionPending={createDraftMutation.isPending}
          nextStep={nextStep}
          onJumpToNextStep={
            nextStep && nextStep.action.kind !== 'none'
              ? () => handleJumpToNextStep(nextStep.action)
              : undefined
          }
        />
      ) : null}

      <div className="grid grid-cols-12 gap-4 mb-4">
        <KpiCard
          title={METRIC_LABELS.revenue}
          value={formatCompact(overviewTotals.revenueTotal)}
          chipClass="chip-error"
          helpText="Seçili versiyonun toplam yıllık bütçe geliri."
        />
        <KpiCard
          title={METRIC_LABELS.claims}
          value={formatCompact(overviewTotals.claimTotal)}
          chipClass="chip-warning"
          helpText="Seçili versiyonun toplam yıllık bütçe hasarı."
        />
        <KpiCard
          title={METRIC_LABELS.technicalMargin}
          value={formatCompact(overviewMargin)}
          chipClass="chip-info"
          note={`%${formatAmount(overviewMarginPct)} marj`}
          helpText={`Seçili versiyon için ${METRIC_LABELS.revenue} − ${METRIC_LABELS.claims}.`}
        />
        <KpiCard
          title={METRIC_LABELS.lossRatio}
          value={`%${formatAmount(overviewLossRatio)}`}
          chipClass="chip-neutral"
          helpText="Seçili versiyonun toplam hasar / prim oranı."
        />
      </div>

      {isEditable && currentVersion && mode !== 'versions' ? (
        <SubmissionChecklist
          result={checklist}
          footer={
            <button
              type="button"
              className="btn-primary"
              disabled={
                !isEditable ||
                !allCustomersComplete ||
                submitMutation.isPending
              }
              title={
                !isEditable
                  ? 'Bu versiyon düzenlenemez'
                  : !allCustomersComplete
                    ? `${missingCustomerCount} müşteride henüz tutar girilmedi`
                    : undefined
              }
              onClick={handleSubmit}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                verified
              </span>
              {submitMutation.isPending
                ? 'Gönderiliyor…'
                : allCustomersComplete
                  ? 'Onaya Gönder'
                  : `Onaya Gönder (${missingCustomerCount} eksik)`}
            </button>
          }
        />
      ) : null}

      {mode === 'versions' ? (
        <BudgetPeriodsPage embedded />
      ) : mode === 'tree' ? (
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
            {activeSegmentData ? (
              <>
                {selection?.kind === 'customer' && selectedCustomerData ? (
                  <CustomerSummaryPanel
                    customer={selectedCustomerData}
                    onOpenCustomerMode={() => setMode('customer')}
                  />
                ) : (
                  <SegmentSummaryPanel segment={activeSegmentData} />
                )}
                <SegmentCustomersTable
                  segment={activeSegmentData}
                  selectedCustomerId={
                    selection?.kind === 'customer' ? selection.customerId : null
                  }
                  onSelectCustomer={(customerId) =>
                    setSelection({
                      kind: 'customer',
                      customerId,
                      segmentId: activeSegmentData.segmentId,
                    })
                  }
                  onGoToCustomerMode={(customerId) => {
                    // Atomically pre-select the customer in customer-focused
                    // mode (segment + customer ids set BEFORE mode switch) so
                    // the matrix opens directly — no extra "pick a customer"
                    // step. "Müşteri Değiştir" lets the user back out.
                    setSelection({
                      kind: 'customer',
                      customerId,
                      segmentId: activeSegmentData.segmentId,
                    })
                    setCustomerModeSegmentId(activeSegmentData.segmentId)
                    setCustomerModeCustomerId(customerId)
                    setMode('customer')
                  }}
                />
              </>
            ) : selectedOpex ? (
              <BudgetOpexGrid opex={selectedOpex} />
            ) : (
              <div className="card text-sm text-on-surface-variant">
                Soldan bir kategori seçin.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="card mb-4 flex flex-wrap items-center gap-3">
            <span className="label-sm">Kategori Seç</span>
            <select
              className="select min-w-[260px]"
              value={customerModeSegmentId ?? ALL_OPTION}
              onChange={(e) => {
                if (e.target.value === ALL_OPTION) {
                  setCustomerModeSegmentId(null)
                  setCustomerModeCustomerId(null)
                  return
                }
                const id = Number(e.target.value)
                setCustomerModeSegmentId(id)
                setCustomerModeCustomerId(null)
              }}
              disabled={!tree || tree.segments.length === 0}
            >
              <option value={ALL_OPTION}>Tümü</option>
              {(tree?.segments ?? []).map((segment) => (
                <option key={segment.segmentId} value={segment.segmentId}>
                  {segment.segmentName}
                </option>
              ))}
            </select>
            <span className="label-sm">{customerModeLabel}</span>
            <select
              className="select min-w-[420px]"
              value={customerModeCustomerId ?? ALL_OPTION}
              onChange={(e) => {
                if (e.target.value === ALL_OPTION) {
                  setCustomerModeCustomerId(null)
                  return
                }
                const id = Number(e.target.value)
                const cust = customers.find((c) => c.id === id)
                if (!cust) return
                setCustomerModeSegmentId(cust.segmentId)
                setCustomerModeCustomerId(cust.id)
              }}
              disabled={customers.length === 0}
            >
              <option value={ALL_OPTION}>{customerModeAllLabel}</option>
              {customerModeFilteredCustomers.map((c) => {
                const done = completedCustomerIds.has(c.id)
                return (
                  <option key={c.id} value={c.id}>
                    {done ? '🟢 ' : '⚪ '}
                    {c.code} — {c.name}
                    {c.segmentName ? ` (${c.segmentName})` : ''}
                  </option>
                )
              })}
            </select>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                className="btn-secondary"
                disabled={!isEditable || customerModeCustomerId == null}
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
                disabled={!isEditable || customerModeCustomerId == null}
                onClick={() => setModal('grow')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  trending_up
                </span>
                +%X Büyüt
              </button>
            </div>
          </div>

          {customerModeCustomerId !== null ? (
            <>
              <div className="mb-3 flex items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    // Reset both ids so the FilteredCustomersTable (the
                    // "pick a customer" step) renders again. Useful when
                    // the page was opened with a pre-selected customer
                    // and the user wants to switch.
                    setCustomerModeCustomerId(null)
                    setCustomerModeSegmentId(null)
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    arrow_back
                  </span>
                  Müşteri Değiştir
                </button>
              </div>
              <BudgetCustomerGrid
                contracts={gridContracts}
                values={values}
                disabled={!isEditable}
                onCellChange={updateCell}
                onCellDelete={deleteCellHandler}
              />
            </>
          ) : (
            <FilteredCustomersTable
              customers={customers.filter((c) =>
                customerModeSegmentId ? c.segmentId === customerModeSegmentId : true,
              )}
              scopeLabel={
                customerModeSegmentId
                  ? (tree?.segments.find((segment) => segment.segmentId === customerModeSegmentId)
                      ?.segmentName ?? 'Seçili kategori')
                  : 'Tüm müşteriler'
              }
              completedCustomerIds={completedCustomerIds}
              onSelectCustomer={(customerId) => {
                const customer = customers.find((c) => c.id === customerId)
                if (!customer) return
                setCustomerModeSegmentId(customer.segmentId)
                setCustomerModeCustomerId(customer.id)
              }}
            />
          )}
        </div>
      )}

      {modal === 'copy' && versionId ? (
        <CopyFromYearModal
          versionId={versionId}
          customerId={customerModeCustomerId}
          years={years}
          currentYearId={yearId}
          onClose={() => setModal(null)}
          onSuccess={handleModalSuccess}
        />
      ) : null}
      {modal === 'grow' && versionId ? (
        <GrowByPercentModal
          versionId={versionId}
          customerId={customerModeCustomerId}
          onClose={() => setModal(null)}
          onSuccess={handleModalSuccess}
        />
      ) : null}
      {modal === 'excel' && versionId ? (
        <ExcelImportModal
          versionId={versionId}
          onClose={() => setModal(null)}
          onSuccess={() => {
            handleModalSuccess()
            showToast('✓ Excel içe aktarma tamamlandı.')
          }}
        />
      ) : null}
    </section>
  )
}

function KpiCard({
  title,
  value,
  chipClass,
  note,
  helpText,
  tone = 'neutral',
}: {
  title: string
  value: string
  chipClass: string
  note?: string
  helpText?: string
  tone?: 'neutral' | 'category' | 'customer'
}) {
  const toneClass =
    tone === 'category'
      ? 'border border-[#f5c7c3] bg-[#fff7f5]'
      : tone === 'customer'
        ? 'border border-[#c9d8ff] bg-[#f5f8ff]'
        : ''

  return (
    <div className={`col-span-12 md:col-span-3 card ${toneClass}`}>
      <div className="flex items-center gap-2">
        <span className="label-sm">
          {title}
          {helpText && <HelpHint text={helpText} />}
        </span>
        <span className={`chip ${chipClass}`} />
      </div>
      <p className="text-2xl font-black tracking-display num mt-2">{value}</p>
      {note ? <p className="text-xs text-on-surface-variant mt-1">{note}</p> : null}
    </div>
  )
}

interface SegmentCustomerRow {
  customerId: number
  customerCode: string
  customerName: string
  revenueTotalTry: number
  claimTotalTry: number
  lossRatioPercent: number
  activeContractCount: number
}

interface SegmentSummary {
  segmentId: number
  segmentCode: string
  segmentName: string
  revenueTotalTry: number
  claimTotalTry: number
  customers: SegmentCustomerRow[]
}

interface CustomerSummary {
  customerId: number
  customerCode: string
  customerName: string
  activeContractCount: number
  revenueTotalTry: number
  claimTotalTry: number
  lossRatioPercent: number
}

function SegmentSummaryPanel({
  segment,
}: {
  segment: SegmentSummary
}) {
  const segmentLossRatio =
    segment.revenueTotalTry > 0
      ? (segment.claimTotalTry / segment.revenueTotalTry) * 100
      : 0
  const segmentMargin = segment.revenueTotalTry - segment.claimTotalTry
  const marginPct = segment.revenueTotalTry > 0
    ? (segmentMargin / segment.revenueTotalTry) * 100
    : 0

  return (
    <>
      <div className="card mb-4 flex items-center gap-4 border-l-4 border-l-primary">
        <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
            category
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="chip chip-info">Kategori Özeti</span>
            <p className="text-[0.65rem] text-on-surface-variant font-semibold uppercase tracking-[0.08em]">
              Seçili kategori
            </p>
          </div>
          <h3 className="text-[1.5rem] leading-none font-black tracking-display text-on-surface mt-2">
            {segment.segmentName}
          </h3>
          <p className="text-sm text-on-surface-variant mt-1">
            Bu alandaki kartlar, kategorinin altındaki tum musteri toplamlarini gosterir.
          </p>
          <p className="text-sm text-on-surface-variant mt-1">
            {segment.customers.length} müşteri · {METRIC_LABELS.revenue} {formatCompact(segment.revenueTotalTry)} · {METRIC_LABELS.lossRatio} %
            {formatAmount(segmentLossRatio)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 mb-4">
        <KpiCard
          title={METRIC_LABELS.revenue}
          value={formatCompact(segment.revenueTotalTry)}
          chipClass="chip-info"
          tone="category"
        />
        <KpiCard
          title={METRIC_LABELS.claims}
          value={formatCompact(segment.claimTotalTry)}
          chipClass="chip-error"
          tone="category"
        />
        <KpiCard
          title={METRIC_LABELS.technicalMargin}
          value={formatCompact(segmentMargin)}
          chipClass="chip-neutral"
          note={`%${formatAmount(marginPct)} marj`}
          tone="category"
        />
        <KpiCard
          title={METRIC_LABELS.lossRatio}
          value={`%${formatAmount(segmentLossRatio)}`}
          chipClass="chip-neutral"
          tone="category"
        />
      </div>
    </>
  )
}

function CustomerSummaryPanel({
  customer,
  onOpenCustomerMode,
}: {
  customer: CustomerSummary
  onOpenCustomerMode: () => void
}) {
  const technicalMargin = customer.revenueTotalTry - customer.claimTotalTry
  const marginPct =
    customer.revenueTotalTry > 0
      ? (technicalMargin / customer.revenueTotalTry) * 100
      : 0

  return (
    <>
      <div className="card mb-4 flex items-center gap-4 border-l-4 border-l-[#002366]">
        <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
            person
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="chip chip-neutral">Müşteri Özeti</span>
            <p className="text-[0.65rem] text-on-surface-variant font-semibold uppercase tracking-[0.08em]">
              Seçili müşteri
            </p>
          </div>
          <h3 className="text-[1.5rem] leading-none font-black tracking-display text-on-surface mt-2">
            {customer.customerName}
          </h3>
          <p className="text-sm text-on-surface-variant mt-1">
            Bu alandaki kartlar yalnızca seçilen müşterinin verilerini gösterir.
          </p>
          <p className="text-sm text-on-surface-variant mt-1">
            {customer.customerCode} · {customer.activeContractCount} aktif kontrat
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={onOpenCustomerMode}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            arrow_forward
          </span>
          Müşteri Odaklı Girişte Aç
        </button>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <KpiCard
          title={METRIC_LABELS.revenue}
          value={formatCompact(customer.revenueTotalTry)}
          chipClass="chip-info"
          tone="customer"
        />
        <KpiCard
          title={METRIC_LABELS.claims}
          value={formatCompact(customer.claimTotalTry)}
          chipClass="chip-error"
          tone="customer"
        />
        <KpiCard
          title={METRIC_LABELS.technicalMargin}
          value={formatCompact(technicalMargin)}
          chipClass="chip-neutral"
          note={`%${formatAmount(marginPct)} marj`}
          tone="customer"
        />
        <KpiCard
          title={METRIC_LABELS.lossRatio}
          value={`%${formatAmount(customer.lossRatioPercent)}`}
          chipClass="chip-neutral"
          tone="customer"
        />
      </div>
    </>
  )
}

function SegmentCustomersTable({
  segment,
  selectedCustomerId,
  onSelectCustomer,
  onGoToCustomerMode,
}: {
  segment: SegmentSummary
  selectedCustomerId: number | null
  onSelectCustomer: (customerId: number) => void
  onGoToCustomerMode: (customerId: number) => void
}) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b border-outline-variant">
        <div>
          <h4 className="text-base font-bold">Kategoriye bağlı müşteriler</h4>
          <p className="text-xs text-on-surface-variant mt-1">
            Müşteri seçildiğinde liste görünür kalır; yalnızca üst özet seçilen müşteriye döner.
          </p>
        </div>
      </div>
      {segment.customers.length === 0 ? (
        <p className="p-6 text-sm text-on-surface-variant">
          Bu kategoride henüz müşteri yok.
        </p>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Müşteri</th>
              <th className="text-right">{METRIC_LABELS.revenue} (TL)</th>
              <th className="text-right">{METRIC_LABELS.claims} (TL)</th>
              <th className="text-right">{METRIC_LABELS.lossRatio}</th>
              <th className="text-right">Aktif Kontrat</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {segment.customers.map((c) => {
              const isSelected = selectedCustomerId === c.customerId
              return (
                <tr
                  key={c.customerId}
                  className={isSelected ? 'bg-[#f5f8ff]' : undefined}
                >
                  <td>
                    <button
                      type="button"
                      className="text-left"
                      onClick={() => onSelectCustomer(c.customerId)}
                    >
                      <div className="font-semibold">{c.customerName}</div>
                      <div className="text-[0.65rem] text-on-surface-variant font-mono">
                        {c.customerCode}
                      </div>
                    </button>
                  </td>
                  <td className="text-right num">{formatAmount(c.revenueTotalTry)}</td>
                  <td className="text-right num">{formatAmount(c.claimTotalTry)}</td>
                  <td className="text-right">
                    <LossRatioBadge value={c.lossRatioPercent} />
                  </td>
                  <td className="text-right num">{c.activeContractCount}</td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="p-1 text-on-surface-variant hover:text-primary"
                      title="Bu müşteriyi Müşteri Odaklı Giriş'te aç"
                      onClick={() => onGoToCustomerMode(c.customerId)}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                        arrow_forward
                      </span>
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

function FilteredCustomersTable({
  customers,
  scopeLabel,
  completedCustomerIds,
  onSelectCustomer,
}: {
  customers: CustomerRow[]
  scopeLabel: string
  completedCustomerIds: Set<number>
  onSelectCustomer: (customerId: number) => void
}) {
  const completedCount = customers.filter((customer) =>
    completedCustomerIds.has(customer.id),
  ).length

  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-4 border-b border-outline-variant">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h4 className="text-base font-bold">Toplu Çalışma Paneli</h4>
            <p className="text-xs text-on-surface-variant mt-1">
              Kapsam: <span className="font-semibold text-on-surface">{scopeLabel}</span>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className="chip chip-neutral">{customers.length} müşteri</span>
            <span className="chip chip-success">{completedCount} dolu</span>
          </div>
        </div>
        <p className="text-xs text-on-surface-variant mt-3">
          Kategori filtresine göre müşterileri görün, tekil seçim yapınca ürün listesi açılır.
        </p>
      </div>
      {customers.length === 0 ? (
        <p className="p-6 text-sm text-on-surface-variant">
          Bu filtre için müşteri bulunamadı.
        </p>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Müşteri</th>
              <th>Segment</th>
              <th>Durum</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer: CustomerRow) => (
              <tr key={customer.id}>
                <td>
                  <div className="font-semibold">{customer.name}</div>
                  <div className="text-[0.65rem] text-on-surface-variant font-mono">
                    {customer.code}
                  </div>
                </td>
                <td>{customer.segmentName ?? '—'}</td>
                <td>
                  <span className={`chip ${completedCustomerIds.has(customer.id) ? 'chip-success' : 'chip-neutral'}`}>
                    {completedCustomerIds.has(customer.id) ? 'Dolu' : 'Boş'}
                  </span>
                </td>
                <td className="text-right">
                  <button
                    type="button"
                    className="p-1 text-on-surface-variant hover:text-primary"
                    title="Bu müşteriyi aç"
                    onClick={() => onSelectCustomer(customer.id)}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      arrow_forward
                    </span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function LossRatioBadge({ value }: { value: number }) {
  if (value <= 0) return <span className="text-on-surface-variant">—</span>
  const chip =
    value <= 55 ? 'chip-success' : value <= 70 ? 'chip-warning' : 'chip-error'
  return (
    <span className={`chip ${chip}`}>
      %{formatAmount(value)}
    </span>
  )
}
