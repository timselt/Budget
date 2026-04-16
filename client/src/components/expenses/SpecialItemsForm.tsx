import { useState, useMemo, useCallback } from 'react'
import type { SpecialItem, SpecialItemType } from '../../hooks/useSpecialItems'
import { SPECIAL_ITEM_LABELS, SPECIAL_ITEM_TYPES } from '../../hooks/useSpecialItems'

const MONTHS = [
  'Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara',
] as const

interface ItemRow {
  type: SpecialItemType
  months: Record<number, { id: number | null; amount: number }>
  yearTotal: number
}

interface EditingCell {
  type: SpecialItemType
  month: number
}

interface SpecialItemsFormProps {
  items: readonly SpecialItem[]
  onSave: (type: SpecialItemType, month: number, amount: number, existingId: number | null) => void
  isSaving: boolean
}

function buildItemRows(items: readonly SpecialItem[]): readonly ItemRow[] {
  const map = new Map<SpecialItemType, ItemRow>()

  for (const type of SPECIAL_ITEM_TYPES) {
    map.set(type, {
      type,
      months: {},
      yearTotal: 0,
    })
  }

  for (const item of items) {
    const row = map.get(item.type)
    if (row) {
      row.months[item.month] = { id: item.id, amount: item.amount }
      row.yearTotal += item.amount
    }
  }

  return Array.from(map.values())
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

export function SpecialItemsForm({ items, onSave, isSaving }: SpecialItemsFormProps) {
  const [editing, setEditing] = useState<EditingCell | null>(null)
  const [editValue, setEditValue] = useState('')

  const rows = useMemo(() => buildItemRows(items), [items])

  const handleCellClick = useCallback((type: SpecialItemType, month: number, currentAmount: number) => {
    setEditing({ type, month })
    setEditValue(currentAmount === 0 ? '' : formatAmount(currentAmount))
  }, [])

  const handleCellBlur = useCallback(() => {
    if (!editing) return
    const amount = parseAmount(editValue)
    const row = rows.find((r) => r.type === editing.type)
    const existingId = row?.months[editing.month]?.id ?? null
    const existingAmount = row?.months[editing.month]?.amount ?? 0

    if (amount !== existingAmount) {
      onSave(editing.type, editing.month, amount, existingId)
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

  const grandTotal = rows.reduce((sum, r) => sum + r.yearTotal, 0)
  const monthTotals = Array.from({ length: 12 }, (_, m) =>
    rows.reduce((sum, r) => sum + (r.months[m + 1]?.amount ?? 0), 0)
  )

  return (
    <div className="overflow-x-auto rounded-xl border border-sl-outline-variant/15 bg-sl-surface-lowest shadow-[var(--sl-shadow-sm)]">
      <table className="w-full min-w-[1100px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-sl-outline-variant/15 bg-surface-alt">
            <th className="sticky left-0 z-10 bg-surface-alt px-4 py-3 text-left font-semibold text-text-muted">
              Kalem
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
          {rows.map((row) => (
            <tr
              key={row.type}
              className="border-b border-sl-outline-variant/15 transition-colors hover:bg-primary-50/30"
            >
              <td className="sticky left-0 z-10 bg-sl-surface-lowest px-4 py-2.5 font-medium">
                {SPECIAL_ITEM_LABELS[row.type]}
              </td>
              {Array.from({ length: 12 }, (_, i) => {
                const month = i + 1
                const cell = row.months[month]
                const amount = cell?.amount ?? 0
                const isEditing = editing?.type === row.type && editing?.month === month

                return (
                  <td key={month} className="px-1 py-1.5">
                    {isEditing ? (
                      <input
                        type="text"
                        className="w-full rounded border border-primary-400 bg-primary-50/50 px-2 py-1.5 text-right text-sm font-medium outline-none focus:ring-2 focus:ring-primary-300"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleCellBlur}
                        onKeyDown={handleKeyDown}
                        disabled={isSaving}
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        className="w-full rounded px-2 py-1.5 text-right text-sm tabular-nums transition-colors hover:bg-primary-100/60 focus:outline-none focus:ring-2 focus:ring-primary-300"
                        onClick={() => handleCellClick(row.type, month, amount)}
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
          <tr className="border-t-2 border-primary-300 bg-primary-50/40">
            <td className="sticky left-0 z-10 bg-primary-50/40 px-4 py-3 font-bold">
              Toplam
            </td>
            {monthTotals.map((total, i) => (
              <td key={i} className="px-2 py-3 text-right font-bold tabular-nums">
                {formatAmount(total)}
              </td>
            ))}
            <td className="px-3 py-3 text-right text-base font-bold tabular-nums text-primary-800">
              {formatAmount(grandTotal)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
