import { useCallback, useState } from 'react'
import { useBudgetVersions, type BudgetVersion } from '../hooks/useBudgetVersions'
import {
  useBudgetEntries,
  useSaveBudgetEntries,
  type BudgetType,
} from '../hooks/useBudgetEntries'
import { BudgetGrid } from '../components/budget/BudgetGrid'

const CURRENT_YEAR_ID = new Date().getFullYear()

const BUDGET_TABS: { key: BudgetType; label: string }[] = [
  { key: 'Revenue', label: 'Gelir' },
  { key: 'Claims', label: 'Hasar' },
]

export function BudgetEntryPage() {
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null)
  const [budgetType, setBudgetType] = useState<BudgetType>('Revenue')
  const [dirtyEntries, setDirtyEntries] = useState<
    Map<string, { customerId: number; month: number; amount: number }>
  >(new Map())

  const { data: versions, isLoading: isVersionsLoading } = useBudgetVersions(CURRENT_YEAR_ID)
  const { data: rows, isLoading: isEntriesLoading, isError, error } = useBudgetEntries(
    selectedVersionId,
    budgetType,
  )
  const saveMutation = useSaveBudgetEntries()

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
          <h1 className="text-2xl font-semibold tracking-tight">Bütçe Girişi</h1>
          <p className="mt-0.5 text-sm text-text-muted">
            Müşteri bazlı aylık bütçe verilerini girin ve kaydedin.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedVersionId ?? ''}
            onChange={handleVersionChange}
            disabled={isVersionsLoading}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm
                       text-text shadow-sm transition-colors
                       focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
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
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                ${
                  activeVersion.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-800'
                    : activeVersion.status === 'DRAFT'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                }`}
            >
              {activeVersion.status}
            </span>
          )}
        </div>
      </header>

      {selectedVersionId && (
        <>
          <div className="flex items-center justify-between border-b border-border">
            <nav className="flex gap-0" aria-label="Bütçe türü">
              {BUDGET_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabChange(tab.key)}
                  className={`relative px-5 py-2.5 text-sm font-medium transition-colors
                    ${
                      budgetType === tab.key
                        ? 'text-primary-600 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary-500'
                        : 'text-text-muted hover:text-text'
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
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm
                         font-medium text-white shadow-sm transition-all
                         hover:bg-primary-700 active:scale-[0.98]
                         disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saveMutation.isPending ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : null}
              Kaydet
              {dirtyEntries.size > 0 && (
                <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
                  {dirtyEntries.size}
                </span>
              )}
            </button>
          </div>

          {isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Veriler yüklenirken hata oluştu: {(error as Error)?.message ?? 'Bilinmeyen hata'}
            </div>
          )}

          {saveMutation.isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Kaydetme hatası: {(saveMutation.error as Error)?.message ?? 'Bilinmeyen hata'}
            </div>
          )}

          {saveMutation.isSuccess && dirtyEntries.size === 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
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
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border">
          <svg
            className="h-10 w-10 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776"
            />
          </svg>
          <p className="text-sm text-text-muted">
            Başlamak için bir bütçe versiyonu seçin.
          </p>
        </div>
      )}
    </div>
  )
}
