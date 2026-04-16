import { useState, useCallback } from 'react'
import { useBudgetVersions } from '../hooks/useBudgetVersions'
import type { BudgetVersion } from '../hooks/useBudgetVersions'
import {
  useExpenseEntries,
  useCreateExpenseEntry,
  useDeleteExpenseEntry,
} from '../hooks/useExpenseEntries'
import {
  useSpecialItems,
  useCreateSpecialItem,
  useDeleteSpecialItem,
} from '../hooks/useSpecialItems'
import type { SpecialItemType } from '../hooks/useSpecialItems'
import { ExpenseGrid } from '../components/expenses/ExpenseGrid'
import { SpecialItemsForm } from '../components/expenses/SpecialItemsForm'

type Tab = 'expenses' | 'special'

const DEFAULT_CURRENCY = 'TRY'

export function ExpenseEntryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('expenses')
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null)

  // TODO: yearId secici eklenecek, simdilik 1
  const { data: versions } = useBudgetVersions(1)
  const {
    data: expenseEntries,
    isLoading: expensesLoading,
    error: expensesError,
  } = useExpenseEntries(selectedVersionId)
  const {
    data: specialItems,
    isLoading: specialLoading,
    error: specialError,
  } = useSpecialItems(selectedVersionId)

  const createExpense = useCreateExpenseEntry()
  const deleteExpense = useDeleteExpenseEntry()
  const createSpecialItem = useCreateSpecialItem()
  const deleteSpecialItem = useDeleteSpecialItem()

  const handleVersionChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setSelectedVersionId(val ? Number(val) : null)
  }, [])

  const handleExpenseSave = useCallback(
    (categoryId: number, month: number, amount: number, existingId: number | null) => {
      if (selectedVersionId === null) return

      if (existingId !== null && amount === 0) {
        deleteExpense.mutate({ id: existingId, versionId: selectedVersionId })
        return
      }

      if (existingId !== null) {
        deleteExpense.mutate(
          { id: existingId, versionId: selectedVersionId },
          {
            onSuccess: () => {
              createExpense.mutate({
                versionId: selectedVersionId,
                categoryId,
                month,
                amount,
                currencyCode: DEFAULT_CURRENCY,
              })
            },
          }
        )
        return
      }

      if (amount > 0) {
        createExpense.mutate({
          versionId: selectedVersionId,
          categoryId,
          month,
          amount,
          currencyCode: DEFAULT_CURRENCY,
        })
      }
    },
    [selectedVersionId, createExpense, deleteExpense]
  )

  const handleSpecialSave = useCallback(
    (type: SpecialItemType, month: number, amount: number, existingId: number | null) => {
      if (selectedVersionId === null) return

      if (existingId !== null && amount === 0) {
        deleteSpecialItem.mutate({ id: existingId, versionId: selectedVersionId })
        return
      }

      if (existingId !== null) {
        deleteSpecialItem.mutate(
          { id: existingId, versionId: selectedVersionId },
          {
            onSuccess: () => {
              createSpecialItem.mutate({
                versionId: selectedVersionId,
                type,
                month,
                amount,
                currencyCode: DEFAULT_CURRENCY,
              })
            },
          }
        )
        return
      }

      if (amount > 0) {
        createSpecialItem.mutate({
          versionId: selectedVersionId,
          type,
          month,
          amount,
          currencyCode: DEFAULT_CURRENCY,
        })
      }
    },
    [selectedVersionId, createSpecialItem, deleteSpecialItem]
  )

  const isLoading = activeTab === 'expenses' ? expensesLoading : specialLoading
  const error = activeTab === 'expenses' ? expensesError : specialError
  const isSaving =
    createExpense.isPending ||
    deleteExpense.isPending ||
    createSpecialItem.isPending ||
    deleteSpecialItem.isPending

  return (
    <div>
      <header className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-headline text-4xl font-bold tracking-[-0.02em] text-sl-on-surface">
            Gider Girisi
          </h1>
          <p className="font-body text-lg text-sl-on-surface-variant mt-2 max-w-2xl">
            Aylik gider kalemlerini girin ve ozel kalemleri tanimlayin.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="version-select" className="font-body text-sm font-medium text-sl-on-surface-variant">
            Versiyon
          </label>
          <select
            id="version-select"
            className="rounded-lg border border-sl-outline-variant/15 bg-sl-surface-lowest px-3 py-2
                       font-body text-sm shadow-[var(--sl-shadow-sm)] transition-colors
                       focus:border-sl-primary focus:outline-none focus:ring-2 focus:ring-sl-primary-fixed"
            value={selectedVersionId ?? ''}
            onChange={handleVersionChange}
          >
            <option value="">Versiyon secin...</option>
            {versions?.map((v: BudgetVersion) => (
              <option key={v.id} value={v.id}>
                {v.name} {v.isActive ? '(Aktif)' : `(${v.status})`}
              </option>
            ))}
          </select>
        </div>
      </header>

      {selectedVersionId === null ? (
        <div className="flex h-48 items-center justify-center rounded-xl bg-sl-surface-lowest shadow-[0_12px_32px_rgba(25,28,31,0.04)]">
          <p className="font-body text-sm text-sl-on-surface-variant">
            Devam etmek icin bir butce versiyonu secin.
          </p>
        </div>
      ) : (
        <>
          <nav className="mb-5 flex gap-1 rounded-lg bg-sl-surface-low p-1" role="tablist">
            <TabButton
              active={activeTab === 'expenses'}
              onClick={() => setActiveTab('expenses')}
              label="Gider Kalemleri"
            />
            <TabButton
              active={activeTab === 'special'}
              onClick={() => setActiveTab('special')}
              label="Ozel Kalemler"
            />
          </nav>

          {isLoading && (
            <div className="flex h-48 items-center justify-center">
              <p className="font-body text-sl-on-surface-variant">Yukleniyor...</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-sl-error-container/30 p-4">
              <p className="font-body text-sm text-sl-error">
                Veriler yuklenemedi. Lutfen tekrar deneyin.
              </p>
            </div>
          )}

          {!isLoading && !error && activeTab === 'expenses' && expenseEntries && (
            <ExpenseGrid
              entries={expenseEntries}
              onSave={handleExpenseSave}
              isSaving={isSaving}
            />
          )}

          {!isLoading && !error && activeTab === 'special' && specialItems && (
            <SpecialItemsForm
              items={specialItems}
              onSave={handleSpecialSave}
              isSaving={isSaving}
            />
          )}

          {isSaving && (
            <div className="mt-3 flex items-center gap-2">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-sl-primary border-t-transparent" />
              <span className="font-body text-xs text-sl-on-surface-variant">Kaydediliyor...</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface TabButtonProps {
  active: boolean
  onClick: () => void
  label: string
}

function TabButton({ active, onClick, label }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`rounded-md px-4 py-2 font-body text-sm font-medium transition-all ${
        active
          ? 'bg-sl-surface-lowest text-sl-on-surface shadow-[var(--sl-shadow-sm)]'
          : 'text-sl-on-surface-variant hover:text-sl-on-surface'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
