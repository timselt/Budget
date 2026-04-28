import { ChangeEvent } from 'react'

export interface BudgetCellValue {
  quantity: number | null
  amount: string
}

export interface BudgetCellInputsProps {
  quantity: number | null
  amount: string
  onChange: (next: BudgetCellValue) => void
  showQuantity: boolean
  disabled?: boolean
}

/**
 * Vertical-stack cell with optional Adet (quantity) input on top and Tutar
 * (amount) input below. Both inputs are independent — there is NO
 * auto-calculation between them. The parent owns formatting/parsing of the
 * amount string; this component just forwards `e.target.value` verbatim.
 *
 * When `showQuantity={false}` (e.g. loss/HASAR rows) only the Tutar input
 * is rendered.
 */
export function BudgetCellInputs({
  quantity,
  amount,
  onChange,
  showQuantity,
  disabled,
}: BudgetCellInputsProps) {
  const handleQuantity = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim()
    if (raw === '') {
      onChange({ quantity: null, amount })
      return
    }
    const parsed = Number(raw)
    if (Number.isFinite(parsed)) {
      onChange({ quantity: parsed, amount })
    }
    // ignore invalid numeric input (do not call onChange)
  }

  const handleAmount = (e: ChangeEvent<HTMLInputElement>) => {
    onChange({ quantity, amount: e.target.value })
  }

  return (
    <div className="flex flex-col gap-1 min-w-[110px]">
      {showQuantity && (
        <div className="flex items-center gap-1.5 justify-end">
          <input
            type="text"
            inputMode="numeric"
            placeholder="Adet"
            value={quantity ?? ''}
            onChange={handleQuantity}
            disabled={disabled}
            className="cell-edit text-right"
          />
          <span className="text-[10px] uppercase tracking-wide text-on-surface-variant">
            adet
          </span>
        </div>
      )}
      <div className="flex items-center gap-1.5 justify-end">
        <input
          type="text"
          inputMode="decimal"
          placeholder="Tutar"
          value={amount}
          onChange={handleAmount}
          disabled={disabled}
          className="cell-edit text-right"
        />
        <span className="text-[10px] uppercase tracking-wide text-on-surface-variant">
          tutar
        </span>
      </div>
    </div>
  )
}
