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
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gider Girisi</h1>
          <p className="mt-1 text-sm text-text-muted">
            Aylik gider kalemlerini girin ve ozel kalemleri tanimlayin.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="version-select" className="text-sm font-medium text-text-muted">
            Versiyon
          </label>
          <select
            id="version-select"
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
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
        <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-white">
          <p className="text-sm text-text-muted">
            Devam etmek icin bir butce versiyonu secin.
          </p>
        </div>
      ) : (
        <>
          <nav className="mb-5 flex gap-1 rounded-lg bg-surface-alt p-1" role="tablist">
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
              <p className="text-text-muted">Yukleniyor...</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/5 p-4">
              <p className="text-sm text-danger">Veriler yuklenemedi. Lutfen tekrar deneyin.</p>
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
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary-400 border-t-transparent" />
              <span className="text-xs text-text-muted">Kaydediliyor...</span>
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
      className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
        active
          ? 'bg-white text-text shadow-sm'
          : 'text-text-muted hover:text-text'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
