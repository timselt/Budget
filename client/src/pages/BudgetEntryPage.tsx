import { useCallback, useState } from 'react'
import { useBudgetYears } from '../hooks/useBudgetYears'
import type { BudgetYear } from '../hooks/useBudgetYears'
import { useBudgetVersions } from '../hooks/useBudgetVersions'
import type { BudgetVersion } from '../hooks/useBudgetVersions'
import {
  useBudgetEntries,
  useSaveBudgetEntries,
  type BudgetType,
} from '../hooks/useBudgetEntries'
import { BudgetGrid } from '../components/budget/BudgetGrid'

const BUDGET_TABS: { key: BudgetType; label: string }[] = [
  { key: 'Revenue', label: 'Gelir' },
  { key: 'Claims', label: 'Hasar' },
]

export function BudgetEntryPage() {
  const [selectedYearId, setSelectedYearId] = useState<number | null>(null)
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null)
  const [budgetType, setBudgetType] = useState<BudgetType>('Revenue')
  const [dirtyEntries, setDirtyEntries] = useState<
    Map<string, { customerId: number; month: number; amount: number }>
  >(new Map())

  const { data: years, isLoading: isYearsLoading } = useBudgetYears()
  const { data: versions, isLoading: isVersionsLoading } = useBudgetVersions(selectedYearId)
  const { data: rows, isLoading: isEntriesLoading, isError, error } = useBudgetEntries(
    selectedVersionId,
    budgetType,
  )
  const saveMutation = useSaveBudgetEntries()

  const handleYearChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setSelectedYearId(val ? Number(val) : null)
    setSelectedVersionId(null)
    setDirtyEntries(new Map())
  }, [])

  const handleVersionChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setSelectedVersionId(val ? Number(val) : null)
    setDirtyEntries(new Map())
  }, [])

  const handleTabChange = useCallback((type: BudgetType) => {
    setBudgetType(type)
    setDirtyEntries(new Map())
  }, [])

  const handleDirtyChange = useCallback(
    (entries: Map<string, { customerId: number; month: number; amount: number }>) => {
      setDirtyEntries(entries)
    },
    [],
  )

  const handleSave = useCallback(() => {
    if (!selectedVersionId || dirtyEntries.size === 0) return

    const entries = Array.from(dirtyEntries.values()).map((e) => ({
      customerId: e.customerId,
      month: e.month,
      amountOriginal: e.amount,
      currencyCode: 'TRY',
    }))

    saveMutation.mutate(
      { versionId: selectedVersionId, type: budgetType, entries },
      {
        onSuccess: () => {
          setDirtyEntries(new Map())
        },
      },
    )
  }, [selectedVersionId, dirtyEntries, budgetType, saveMutation])

  const activeVersion = versions?.find((v: BudgetVersion) => v.id === selectedVersionId)

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-4xl font-bold tracking-[-0.02em] text-sl-on-surface">
            Bütçe Girişi
          </h1>
          <p className="mt-2 max-w-2xl font-body text-lg text-sl-on-surface-variant">
            Müşteri bazlı aylık bütçe verilerini girin ve kaydedin.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedYearId ?? ''}
            onChange={handleYearChange}
            disabled={isYearsLoading}
            className="h-9 rounded-lg bg-sl-surface-lowest px-3 pr-8 font-body text-sm font-medium text-sl-on-surface shadow-[0_12px_32px_rgba(25,28,31,0.04)] outline-none focus:ring-2 focus:ring-sl-primary/40"
          >
            <option value="">Yıl seçin…</option>
            {years?.map((y: BudgetYear) => (
              <option key={y.id} value={y.id}>
                {y.year} {y.isLocked ? '(Kilitli)' : ''}
              </option>
            ))}
          </select>

          <select
            value={selectedVersionId ?? ''}
            onChange={handleVersionChange}
            disabled={isVersionsLoading || !selectedYearId}
            className="h-9 rounded-lg bg-sl-surface-lowest px-3 pr-8 font-body text-sm font-medium text-sl-on-surface shadow-[0_12px_32px_rgba(25,28,31,0.04)] outline-none focus:ring-2 focus:ring-sl-primary/40 disabled:opacity-50"
          >
            <option value="">Versiyon seçin…</option>
            {versions?.map((v: BudgetVersion) => (
              <option key={v.id} value={v.id}>
                {v.name} {v.isActive ? '(Aktif)' : ''}
              </option>
            ))}
          </select>

          {activeVersion && (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-label text-xs font-bold uppercase tracking-[0.05em]
                ${
                  activeVersion.status === 'ACTIVE'
                    ? 'bg-sl-tertiary-container/20 text-sl-tertiary'
                    : activeVersion.status === 'DRAFT'
                      ? 'bg-sl-primary-fixed/40 text-sl-primary'
                      : 'bg-sl-primary-fixed text-sl-primary-container'
                }`}
            >
              {activeVersion.status}
            </span>
          )}
        </div>
      </header>

      {selectedVersionId && (
        <>
          <div className="flex items-center justify-between">
            <nav className="flex gap-0" aria-label="Bütçe türü">
              {BUDGET_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabChange(tab.key)}
                  className={`relative px-5 py-2.5 font-body text-sm font-medium transition-colors
                    ${
                      budgetType === tab.key
                        ? 'text-sl-primary after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-sl-primary'
                        : 'text-sl-on-surface-variant hover:text-sl-on-surface'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <button
              type="button"
              onClick={handleSave}
              disabled={dirtyEntries.size === 0 || saveMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-sl-primary to-sl-primary-container px-4 py-2 font-label text-sm font-bold uppercase tracking-[0.05em] text-white shadow-[0_4px_12px_rgba(181,3,3,0.2)] transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saveMutation.isPending && (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              <span className="material-symbols-outlined text-[18px]">save</span>
              Kaydet
              {dirtyEntries.size > 0 && (
                <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
                  {dirtyEntries.size}
                </span>
              )}
            </button>
          </div>

          {isError && (
            <div className="rounded-xl bg-sl-error-container/30 p-4 font-body text-sm text-sl-error">
              Veriler yüklenirken hata oluştu: {(error as Error)?.message ?? 'Bilinmeyen hata'}
            </div>
          )}

          {saveMutation.isError && (
            <div className="rounded-xl bg-sl-error-container/30 p-4 font-body text-sm text-sl-error">
              Kaydetme hatası: {(saveMutation.error as Error)?.message ?? 'Bilinmeyen hata'}
            </div>
          )}

          {saveMutation.isSuccess && dirtyEntries.size === 0 && (
            <div className="rounded-xl bg-sl-tertiary-container/10 p-4 font-body text-sm text-sl-tertiary">
              Veriler başarıyla kaydedildi.
            </div>
          )}

          <BudgetGrid
            rows={rows ?? []}
            isLoading={isEntriesLoading}
            onDirtyChange={handleDirtyChange}
          />
        </>
      )}

      {!selectedVersionId && (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl bg-sl-surface-container-low">
          <span className="material-symbols-outlined text-4xl text-sl-on-surface-variant/40">
            folder_open
          </span>
          <p className="font-body text-sm text-sl-on-surface-variant">
            Başlamak için bir yıl ve bütçe versiyonu seçin.
          </p>
        </div>
      )}
    </div>
  )
}
