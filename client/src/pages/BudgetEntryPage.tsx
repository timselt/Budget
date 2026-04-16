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

const FORMULA_CHECKS = [
  { label: 'Segment toplamları tutarlı', ok: true },
  { label: 'Yıllık toplam = aylık toplamlar', ok: true },
  { label: 'EBITDA marjı %12 üstünde', ok: true },
  { label: 'Hasar / Prim oranı ≤ %65', ok: false },
] as const

const APPROVAL_STEPS = [
  { label: 'Departman Yöneticisi', status: 'done' as const },
  { label: 'CFO', status: 'current' as const },
  { label: 'CEO', status: 'pending' as const },
  { label: 'Yönetim Kurulu', status: 'pending' as const },
] as const

const RECENT_CHANGES = [
  { user: 'A. Yılmaz', action: 'Oto Asistans Q2 gelir güncellendi', time: '14:32' },
  { user: 'M. Kaya', action: 'Sağlık segmenti hasar tahmini revize', time: '13:15' },
  { user: 'S. Demir', action: 'OPEX personel bütçesi eklendi', time: '11:48' },
] as const

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
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-extrabold tracking-[-0.02em] text-sl-on-surface">
            Bütçe Planlama
          </h1>
          <p className="mt-2 max-w-2xl font-body text-sm text-sl-on-surface-variant">
            Segment × Ürün × Ay bazında bütçe planı girişi ve onay süreci.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-md bg-sl-surface-container-high px-3 py-2 font-body text-sm font-medium text-sl-on-surface transition-colors hover:bg-sl-surface-container-highest">
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            Excel İçe Aktar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={dirtyEntries.size === 0 || saveMutation.isPending}
            className="flex items-center gap-2 rounded-md bg-sl-surface-container-high px-3 py-2 font-body text-sm font-medium text-sl-on-surface transition-colors hover:bg-sl-surface-container-highest disabled:opacity-50"
          >
            {saveMutation.isPending && (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-sl-on-surface border-t-transparent" />
            )}
            <span className="material-symbols-outlined text-[18px]">save</span>
            Taslak Kaydet
            {dirtyEntries.size > 0 && (
              <span className="rounded-full bg-sl-primary/10 px-1.5 py-0.5 text-xs font-bold text-sl-primary">
                {dirtyEntries.size}
              </span>
            )}
          </button>
          <button className="flex items-center gap-2 rounded-md bg-gradient-to-br from-sl-primary to-sl-primary-container px-4 py-2 font-body text-sm font-medium text-white shadow-[0_4px_12px_rgba(181,3,3,0.15)] transition-all duration-200 hover:shadow-[0_8px_20px_rgba(181,3,3,0.25)] hover:brightness-110 active:scale-[0.97]">
            <span className="material-symbols-outlined text-[18px]">send</span>
            Onaya Gönder
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedYearId ?? ''}
          onChange={handleYearChange}
          disabled={isYearsLoading}
          className="h-9 rounded-lg bg-sl-surface-container-high px-3 pr-8 font-body text-sm font-medium text-sl-on-surface outline-none transition-all focus:bg-sl-surface-lowest focus:ring-2 focus:ring-sl-primary/40"
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
          className="h-9 rounded-lg bg-sl-surface-container-high px-3 pr-8 font-body text-sm font-medium text-sl-on-surface outline-none transition-all focus:bg-sl-surface-lowest focus:ring-2 focus:ring-sl-primary/40 disabled:opacity-50"
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
                  ? 'bg-sl-success-container text-sl-success'
                  : activeVersion.status === 'DRAFT'
                    ? 'bg-sl-warning-container text-sl-warning'
                    : 'bg-sl-primary/10 text-sl-primary'
              }`}
          >
            {activeVersion.status}
          </span>
        )}

        <div className="ml-auto flex items-center gap-3 text-xs text-sl-on-surface-variant">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-sl-primary/20" />
            Kullanıcı girişi
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-sl-surface-container-high" />
            Formül hesaplı
          </span>
        </div>
      </div>

      {selectedVersionId && (
        <>
          {/* Budget type tabs */}
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
            <div className="rounded-xl bg-sl-success-container/30 p-4 font-body text-sm text-sl-success">
              Veriler başarıyla kaydedildi.
            </div>
          )}

          {/* Grid + Side Panels */}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 xl:col-span-9">
              <BudgetGrid
                rows={rows ?? []}
                isLoading={isEntriesLoading}
                onDirtyChange={handleDirtyChange}
              />
            </div>

            <aside className="col-span-12 flex flex-col gap-5 xl:col-span-3">
              {/* Formül Kontrolü */}
              <div className="rounded-xl bg-sl-surface-lowest p-5 shadow-[var(--sl-shadow-ambient)]">
                <h3 className="mb-4 font-headline text-sm font-bold text-sl-on-surface">Formül Kontrolü</h3>
                <div className="flex flex-col gap-2.5">
                  {FORMULA_CHECKS.map((check) => (
                    <div key={check.label} className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-[16px] ${check.ok ? 'text-sl-success' : 'text-sl-warning'}`}>
                        {check.ok ? 'check_circle' : 'warning'}
                      </span>
                      <span className="text-xs text-sl-on-surface-variant">{check.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Onay Akışı */}
              <div className="rounded-xl bg-sl-surface-lowest p-5 shadow-[var(--sl-shadow-ambient)]">
                <h3 className="mb-4 font-headline text-sm font-bold text-sl-on-surface">Onay Akışı</h3>
                <div className="flex flex-col gap-3">
                  {APPROVAL_STEPS.map((step, i) => (
                    <div key={step.label} className="flex items-center gap-3">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold
                        ${step.status === 'done' ? 'bg-sl-success-container text-sl-success' : step.status === 'current' ? 'bg-sl-primary/10 text-sl-primary' : 'bg-sl-surface-container-high text-sl-on-surface-variant'}`}>
                        {step.status === 'done' ? (
                          <span className="material-symbols-outlined text-[14px]">check</span>
                        ) : (
                          i + 1
                        )}
                      </div>
                      <span className={`text-xs ${step.status === 'done' ? 'font-bold text-sl-success' : step.status === 'current' ? 'font-bold text-sl-primary' : 'text-sl-on-surface-variant'}`}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Son Değişiklikler */}
              <div className="rounded-xl bg-sl-surface-lowest p-5 shadow-[var(--sl-shadow-ambient)]">
                <h3 className="mb-4 font-headline text-sm font-bold text-sl-on-surface">Son Değişiklikler</h3>
                <div className="flex flex-col gap-3">
                  {RECENT_CHANGES.map((change) => (
                    <div key={change.time} className="flex items-start gap-2">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sl-primary-container">
                        <span className="font-label text-[0.5rem] font-bold text-sl-on-primary-container">
                          {change.user.split(' ').map(w => w[0]).join('')}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-sl-on-surface">{change.action}</p>
                        <p className="mt-0.5 text-[0.6rem] text-sl-on-surface-variant">{change.user} · {change.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
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
