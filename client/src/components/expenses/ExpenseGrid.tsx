import { useState, useMemo, useCallback } from 'react'
import type { ExpenseEntry, ExpenseClassification } from '../../hooks/useExpenseEntries'

const MONTHS = [
  'Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara',
] as const

const CLASSIFICATION_LABELS: Record<ExpenseClassification, string> = {
  GENERAL: 'Genel Giderler',
  TECHNICAL: 'Teknik Giderler',
  EXTRAORDINARY: 'Olaganustu Giderler',
}

const CLASSIFICATION_ORDER: readonly ExpenseClassification[] = [
  'GENERAL',
  'TECHNICAL',
  'EXTRAORDINARY',
] as const

interface CategoryRow {
  categoryId: number
  categoryName: string
  classification: ExpenseClassification
  months: Record<number, { id: number | null; amount: number }>
  yearTotal: number
}

interface EditingCell {
  categoryId: number
  month: number
}

interface ExpenseGridProps {
  entries: readonly ExpenseEntry[]
  onSave: (categoryId: number, month: number, amount: number, existingId: number | null) => void
  isSaving: boolean
}

function buildCategoryRows(entries: readonly ExpenseEntry[]): readonly CategoryRow[] {
  const map = new Map<number, CategoryRow>()

  for (const entry of entries) {
    let row = map.get(entry.categoryId)
    if (!row) {
      row = {
        categoryId: entry.categoryId,
        categoryName: entry.categoryName,
        classification: entry.classification,
        months: {},
        yearTotal: 0,
      }
      map.set(entry.categoryId, row)
    }
    row.months[entry.month] = { id: entry.id, amount: entry.amount }
    row.yearTotal += entry.amount
  }

  return Array.from(map.values()).sort((a, b) => {
    const classOrder = CLASSIFICATION_ORDER.indexOf(a.classification) - CLASSIFICATION_ORDER.indexOf(b.classification)
    if (classOrder !== 0) return classOrder
    return a.categoryName.localeCompare(b.categoryName, 'tr')
  })
}

function groupByClassification(rows: readonly CategoryRow[]): Map<ExpenseClassification, readonly CategoryRow[]> {
  const grouped = new Map<ExpenseClassification, CategoryRow[]>()
  for (const cls of CLASSIFICATION_ORDER) {
    grouped.set(cls, [])
  }
  for (const row of rows) {
    grouped.get(row.classification)?.push(row)
  }
  return grouped
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/\./g, '').replace(',', '.').trim()
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

export function ExpenseGrid({ entries, onSave, isSaving }: ExpenseGridProps) {
  const [editing, setEditing] = useState<EditingCell | null>(null)
  const [editValue, setEditValue] = useState('')

  const rows = useMemo(() => buildCategoryRows(entries), [entries])
  const grouped = useMemo(() => groupByClassification(rows), [rows])

  const handleCellClick = useCallback((categoryId: number, month: number, currentAmount: number) => {
    setEditing({ categoryId, month })
    setEditValue(currentAmount === 0 ? '' : formatAmount(currentAmount))
  }, [])

  const handleCellBlur = useCallback(() => {
    if (!editing) return
    const amount = parseAmount(editValue)
    const row = rows.find((r) => r.categoryId === editing.categoryId)
    const existingId = row?.months[editing.month]?.id ?? null
    const existingAmount = row?.months[editing.month]?.amount ?? 0

    if (amount !== existingAmount) {
      onSave(editing.categoryId, editing.month, amount, existingId)
    }
    setEditing(null)
    setEditValue('')
  }, [editing, editValue, rows, onSave])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
    if (e.key === 'Escape') {
      setEditing(null)
      setEditValue('')
    }
  }, [])

  if (rows.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-sl-outline-variant/15 bg-sl-surface-lowest">
        <p className="text-sm text-text-muted">
          Henuz gider kategorisi tanimlanmamis.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-sl-outline-variant/15 bg-sl-surface-lowest shadow-[var(--sl-shadow-sm)]">
      <table className="w-full min-w-[1100px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-sl-outline-variant/15 bg-surface-alt">
            <th className="sticky left-0 z-10 bg-surface-alt px-4 py-3 text-left font-semibold text-text-muted">
              Kategori
            </th>
            <th className="px-3 py-3 text-left font-semibold text-text-muted">
              Sinif
            </th>
            {MONTHS.map((m, i) => (
              <th
                key={i}
                className="px-2 py-3 text-right font-semibold text-text-muted"
              >
                {m}
              </th>
            ))}
            <th className="px-3 py-3 text-right font-semibold text-primary-700">
              Yil Toplami
            </th>
          </tr>
        </thead>
        <tbody>
          {CLASSIFICATION_ORDER.map((cls) => {
            const classRows = grouped.get(cls) ?? []
            if (classRows.length === 0) return null

            const classTotal = classRows.reduce((sum, r) => sum + r.yearTotal, 0)
            const classMonthTotals = Array.from({ length: 12 }, (_, m) =>
              classRows.reduce((sum, r) => sum + (r.months[m + 1]?.amount ?? 0), 0)
            )

            return (
              <ClassificationSection
                key={cls}
                classification={cls}
                rows={classRows}
                classTotal={classTotal}
                classMonthTotals={classMonthTotals}
                editing={editing}
                editValue={editValue}
                isSaving={isSaving}
                onCellClick={handleCellClick}
                onEditValueChange={setEditValue}
                onCellBlur={handleCellBlur}
                onKeyDown={handleKeyDown}
              />
            )
          })}
          <GrandTotalRow rows={rows} />
        </tbody>
      </table>
    </div>
  )
}

interface ClassificationSectionProps {
  classification: ExpenseClassification
  rows: readonly CategoryRow[]
  classTotal: number
  classMonthTotals: readonly number[]
  editing: EditingCell | null
  editValue: string
  isSaving: boolean
  onCellClick: (categoryId: number, month: number, currentAmount: number) => void
  onEditValueChange: (value: string) => void
  onCellBlur: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

function ClassificationSection({
  classification,
  rows,
  classTotal,
  classMonthTotals,
  editing,
  editValue,
  isSaving,
  onCellClick,
  onEditValueChange,
  onCellBlur,
  onKeyDown,
}: ClassificationSectionProps) {
  return (
    <>
      {rows.map((row) => (
        <tr
          key={row.categoryId}
          className="border-b border-sl-outline-variant/15 transition-colors hover:bg-primary-50/30"
        >
          <td className="sticky left-0 z-10 bg-sl-surface-lowest px-4 py-2.5 font-medium">
            {row.categoryName}
          </td>
          <td className="px-3 py-2.5">
            <span className={classificationBadgeClass(row.classification)}>
              {CLASSIFICATION_LABELS[row.classification]}
            </span>
          </td>
          {Array.from({ length: 12 }, (_, i) => {
            const month = i + 1
            const cell = row.months[month]
            const amount = cell?.amount ?? 0
            const isEditing = editing?.categoryId === row.categoryId && editing?.month === month

            return (
              <td key={month} className="px-1 py-1.5">
                {isEditing ? (
                  <input
                    type="text"
                    className="w-full rounded border border-primary-400 bg-primary-50/50 px-2 py-1.5 text-right text-sm font-medium outline-none focus:ring-2 focus:ring-primary-300"
                    value={editValue}
                    onChange={(e) => onEditValueChange(e.target.value)}
                    onBlur={onCellBlur}
                    onKeyDown={onKeyDown}
                    disabled={isSaving}
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    className="w-full rounded px-2 py-1.5 text-right text-sm tabular-nums transition-colors hover:bg-primary-100/60 focus:outline-none focus:ring-2 focus:ring-primary-300"
                    onClick={() => onCellClick(row.categoryId, month, amount)}
                  >
                    {amount === 0 ? (
                      <span className="text-text-muted/40">&mdash;</span>
                    ) : (
                      formatAmount(amount)
                    )}
                  </button>
                )}
              </td>
            )
          })}
          <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-primary-700">
            {formatAmount(row.yearTotal)}
          </td>
        </tr>
      ))}
      <tr className="border-b border-sl-outline-variant/15 bg-surface-alt/60">
        <td className="sticky left-0 z-10 bg-surface-alt/60 px-4 py-2 font-semibold text-text-muted">
          {CLASSIFICATION_LABELS[classification]} Toplami
        </td>
        <td />
        {classMonthTotals.map((total, i) => (
          <td key={i} className="px-2 py-2 text-right text-sm font-semibold tabular-nums text-text-muted">
            {formatAmount(total)}
          </td>
        ))}
        <td className="px-3 py-2 text-right font-bold tabular-nums text-primary-800">
          {formatAmount(classTotal)}
        </td>
      </tr>
    </>
  )
}

function GrandTotalRow({ rows }: { rows: readonly CategoryRow[] }) {
  const grandTotal = rows.reduce((sum, r) => sum + r.yearTotal, 0)
  const monthTotals = Array.from({ length: 12 }, (_, m) =>
    rows.reduce((sum, r) => sum + (r.months[m + 1]?.amount ?? 0), 0)
  )

  return (
    <tr className="border-t-2 border-primary-300 bg-primary-50/40">
      <td className="sticky left-0 z-10 bg-primary-50/40 px-4 py-3 text-base font-bold">
        Genel Toplam
      </td>
      <td />
      {monthTotals.map((total, i) => (
        <td key={i} className="px-2 py-3 text-right font-bold tabular-nums">
          {formatAmount(total)}
        </td>
      ))}
      <td className="px-3 py-3 text-right text-base font-bold tabular-nums text-primary-800">
        {formatAmount(grandTotal)}
      </td>
    </tr>
  )
}

function classificationBadgeClass(cls: ExpenseClassification): string {
  const base = 'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium'
  switch (cls) {
    case 'GENERAL':
      return `${base} bg-primary-100 text-primary-700`
    case 'TECHNICAL':
      return `${base} bg-warning/15 text-warning`
    case 'EXTRAORDINARY':
      return `${base} bg-danger/10 text-danger`
  }
}
