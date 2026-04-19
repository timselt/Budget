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
import { HelpHint } from '../components/shared/Tooltip'
import {
  bulkUpsertEntries,
  createRevision,
  createVersion,
  deleteEntry,
  getCustomerContracts,
  getCustomers,
  getEntries,
  getExpenseEntries,
  getScenarios,
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
  const [mode, setMode] = useState<BudgetMode>('tree')
  const [yearOverride, setYearOverride] = useState<number | null>(null)
  const versionId = useAppContextStore((s) => s.selectedVersionId)
  const setVersion = useAppContextStore((s) => s.setVersion)
  const [scenarioOverride, setScenarioOverride] = useState<number | null>(null)
  const [currency, setCurrency] = useState<string>('TRY')
  const [selectionOverride, setSelectionOverride] = useState<TreeSelection | null>(null)
  const [values, setValues] = useState<GridValues>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [createDraftError, setCreateDraftError] = useState<string | null>(null)
  const [modal, setModal] = useState<Modal>(null)

  // Bağımsız sorgular (türetilmiş değerlere bağlı değil).
  const yearsQuery = useQuery({ queryKey: ['budget-years'], queryFn: getYears })
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
  const expenseEntriesQuery = useQuery({
    queryKey: ['expense-entries', yearId, versionId],
    queryFn: () =>
      yearId && versionId
        ? getExpenseEntries(yearId, versionId)
        : Promise.resolve([]),
    enabled: yearId !== null && versionId !== null,
  })

  const years = useMemo(() => yearsQuery.data ?? [], [yearsQuery.data])
  const scenarios = useMemo(() => scenariosQuery.data ?? [], [scenariosQuery.data])
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

  const scenarioId = useMemo<number | null>(() => {
    if (scenarioOverride !== null && scenarios.some((s) => s.id === scenarioOverride)) {
      return scenarioOverride
    }
    return scenarios[0]?.id ?? null
  }, [scenarioOverride, scenarios])
  const setScenarioId = setScenarioOverride

  // Mode'a göre default selection:
  //  - A (tree) → ilk segment
  //  - C (customer) → ilk müşteri
  const selection = useMemo<TreeSelection | null>(() => {
    if (!tree) return selectionOverride
    if (mode === 'tree') {
      if (selectionOverride?.kind === 'segment') return selectionOverride
      const firstSegment = tree.segments[0]
      if (firstSegment) {
        return { kind: 'segment', segmentId: firstSegment.segmentId }
      }
      return selectionOverride
    }
    if (selectionOverride?.kind === 'customer') return selectionOverride
    const firstCustomer = tree.segments.find((s) => s.customers.length > 0)?.customers[0]
    if (firstCustomer) {
      return {
        kind: 'customer',
        customerId: firstCustomer.customerId,
        segmentId: firstCustomer.segmentId,
      }
    }
    return selectionOverride
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
    selection?.kind === 'customer' ? selection.customerId : null
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
    selection: TreeSelection | null
    entries: typeof entries
    contractByProductId: typeof contractByProductId
  }>({ selection, entries, contractByProductId })
  if (
    valuesSyncKey.selection !== selection ||
    valuesSyncKey.entries !== entries ||
    valuesSyncKey.contractByProductId !== contractByProductId
  ) {
    setValuesSyncKey({ selection, entries, contractByProductId })
    if (selection?.kind !== 'customer') {
      setValues({})
    } else {
      const next: GridValues = {}
      const customerEntries = entries.filter((e) => e.customerId === selection.customerId)
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
        next[key] = { id: e.id, amount: e.amountOriginal.toString() }
      }
      setValues(next)
      const firstCurrency = customerEntries.find((e) => e.currencyCode)?.currencyCode
      if (firstCurrency) setCurrency(firstCurrency)
    }
  }

  const { revenueTotal, claimTotal } = useMemo(() => {
    let rev = 0
    let cla = 0
    for (const key of Object.keys(values)) {
      const [, kind] = key.split(':')
      const amount = toNumber(values[key].amount)
      if (kind === 'REVENUE') rev += amount
      else if (kind === 'CLAIM') cla += amount
    }
    return { revenueTotal: rev, claimTotal: cla }
  }, [values])

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
    scenarioId,
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

  const margin = revenueTotal - claimTotal
  const lossRatio = lossRatioPercent(revenueTotal, claimTotal)
  const marginPct = marginPercent(revenueTotal, claimTotal)

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!versionId || selection?.kind !== 'customer') {
        throw new Error('Yıl, versiyon ve müşteri seçin')
      }
      const upserts: BudgetEntryUpsert[] = []
      for (const key of Object.keys(values)) {
        const cell = values[key]
        const [rawContractId, kind, monthStr] = key.split(':')
        const amount = toNumber(cell.amount)
        const hasContent = cell.amount.trim() !== ''
        if (!hasContent && cell.id === null) continue

        const contractId =
          rawContractId === 'fb' || rawContractId === ''
            ? null
            : Number(rawContractId)
        const productId =
          contractId != null
            ? contracts.find((c) => c.id === contractId)?.productId ?? null
            : null

        upserts.push({
          id: cell.id,
          customerId: selection.customerId,
          month: Number(monthStr),
          entryType: kind as 'REVENUE' | 'CLAIM',
          amountOriginal: amount,
          currencyCode: currency,
          contractId,
          productId,
        })
      }
      await bulkUpsertEntries(versionId, upserts)
    },
    onSuccess: () => {
      setSaveError(null)
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
    } else if (action.kind === 'highlight-scenario') {
      const select = document.querySelector('select[data-scenario-select]')
      if (select instanceof HTMLElement) {
        select.setAttribute('data-attention', 'scenario')
        setTimeout(() => select.removeAttribute('data-attention'), 1500)
      }
    }
  }

  const updateCell = (cell: CellId, amount: string) => {
    setValues((prev) => {
      const key = cellKey(cell)
      const existing = prev[key]
      return {
        ...prev,
        [key]: {
          id: existing?.id ?? null,
          amount,
        },
      }
    })
  }

  const deleteCellHandler = (cell: CellId, entryId: number) => {
    if (!confirm(`${MONTHS[cell.month - 1]} kaydı silinecek. Emin misiniz?`)) return
    deleteMutation.mutate(entryId)
  }

  const handleModalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['budget-entries', versionId] })
    queryClient.invalidateQueries({ queryKey: ['budget-tree', versionId] })
    queryClient.invalidateQueries({ queryKey: ['customer-summary', versionId] })
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
            disabled={
              !isEditable || saveMutation.isPending || selection?.kind !== 'customer'
            }
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
            onClick={() => {
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
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              verified
            </span>
            {submitMutation.isPending
              ? 'Gönderiliyor…'
              : !isEditable
                ? 'Onaya Gönder'
                : allCustomersComplete
                  ? 'Onaya Gönder'
                  : `Onaya Gönder (${missingCustomerCount} eksik)`}
          </button>
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
          data-scenario-select
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
          scenarioName={scenarios.find((s) => s.id === scenarioId)?.name}
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
          title="Plan Gelir"
          value={formatCompact(revenueTotal)}
          chipClass="chip-error"
          helpText="Bu versiyondaki tüm müşterilerin yıllık prim/komisyon planı toplamı."
        />
        <KpiCard
          title="Plan Hasar"
          value={formatCompact(claimTotal)}
          chipClass="chip-warning"
          helpText="Bu versiyondaki tüm müşterilerin yıllık beklenen hasar toplamı."
        />
        <KpiCard
          title="Teknik Marj"
          value={formatCompact(margin)}
          chipClass="chip-info"
          note={`%${formatAmount(marginPct)} marj`}
          helpText="Plan Gelir − Plan Hasar. Reasürans öncesi sigortacılık karlılığı."
        />
        <KpiCard
          title="Loss Ratio"
          value={`%${formatAmount(lossRatio)}`}
          chipClass="chip-neutral"
          helpText="Hasar / Prim oranı. ≤55% iyi, 55-70% normal, >70% riskli."
        />
      </div>

      {isEditable && currentVersion && mode !== 'versions' ? (
        <SubmissionChecklist result={checklist} />
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
            {selection?.kind === 'segment' && selectedSegmentData ? (
              <SegmentSummaryPanel
                segment={selectedSegmentData}
                onGoToCustomerMode={(customerId) => {
                  setSelection({
                    kind: 'customer',
                    customerId,
                    segmentId: selectedSegmentData.segmentId,
                  })
                  setMode('customer')
                }}
              />
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
              {customers.map((c) => {
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
              contracts={gridContracts}
              values={values}
              disabled={!isEditable}
              onCellChange={updateCell}
              onCellDelete={deleteCellHandler}
            />
          ) : (
            <div className="card text-sm text-on-surface-variant">
              Müşteri seçin — aylık plan burada açılacak.
            </div>
          )}
        </div>
      )}

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

function KpiCard({
  title,
  value,
  chipClass,
  note,
  helpText,
}: {
  title: string
  value: string
  chipClass: string
  note?: string
  helpText?: string
}) {
  return (
    <div className="col-span-12 md:col-span-3 card">
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

function SegmentSummaryPanel({
  segment,
  onGoToCustomerMode,
}: {
  segment: SegmentSummary
  onGoToCustomerMode: (customerId: number) => void
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
      <div className="card mb-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
            category
          </span>
        </div>
        <div className="flex-1">
          <p className="text-[0.65rem] text-on-surface-variant font-semibold uppercase tracking-[0.08em]">
            Seçili kategori
          </p>
          <h3 className="text-[1.5rem] leading-none font-black tracking-display text-on-surface mt-1">
            {segment.segmentName}
          </h3>
          <p className="text-sm text-on-surface-variant mt-1">
            {segment.customers.length} müşteri · Toplam gelir {formatCompact(segment.revenueTotalTry)} · Loss Ratio %
            {formatAmount(segmentLossRatio)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 mb-4">
        <KpiCard
          title="Plan Gelir"
          value={formatCompact(segment.revenueTotalTry)}
          chipClass="chip-info"
        />
        <KpiCard
          title="Plan Hasar"
          value={formatCompact(segment.claimTotalTry)}
          chipClass="chip-error"
        />
        <KpiCard
          title="Teknik Marj"
          value={formatCompact(segmentMargin)}
          chipClass="chip-neutral"
          note={`%${formatAmount(marginPct)} marj`}
        />
        <KpiCard
          title="Loss Ratio"
          value={`%${formatAmount(segmentLossRatio)}`}
          chipClass="chip-neutral"
        />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-4 flex items-center justify-between border-b border-outline-variant">
          <div>
            <h4 className="text-base font-bold">Kategoriye bağlı müşteriler</h4>
            <p className="text-xs text-on-surface-variant mt-1">
              Detaylı aylık giriş için müşteri satırına tıkla — Müşteri Odaklı Giriş
              sekmesine geçilir.
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
                <th className="text-right">Plan Gelir (TL)</th>
                <th className="text-right">Plan Hasar (TL)</th>
                <th className="text-right">Loss Ratio</th>
                <th className="text-right">Aktif Kontrat</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {segment.customers.map((c) => (
                <tr key={c.customerId}>
                  <td>
                    <div className="font-semibold">{c.customerName}</div>
                    <div className="text-[0.65rem] text-on-surface-variant font-mono">
                      {c.customerCode}
                    </div>
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
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
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
