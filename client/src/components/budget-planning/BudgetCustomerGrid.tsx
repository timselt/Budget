import type { EntryType, RowValues } from './types'
import { MONTHS } from './types'
import { formatAmount, toNumber } from './utils'

interface Props {
  revenueRow: RowValues
  claimRow: RowValues
  disabled: boolean
  onCellChange: (type: EntryType, month: number, value: string) => void
  onCellDelete: (type: EntryType, month: number) => void
}

/**
 * Müşteri × ay revenue/claim girişi için 14 sütunlu tablo. Alt bileşen;
 * parent selected customer/version context'ini sağlar.
 */
export function BudgetCustomerGrid({
  revenueRow,
  claimRow,
  disabled,
  onCellChange,
  onCellDelete,
}: Props) {
  const revenueTotal = sumRow(revenueRow)
  const claimTotal = sumRow(claimRow)
  const marginTotal = revenueTotal - claimTotal

  return (
    <div className="card p-0 overflow-hidden">
      <div className="max-h-[60vh] overflow-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ minWidth: 220 }}>Kalem</th>
              {MONTHS.map((m) => (
                <th key={m} className="text-right">
                  {m}
                </th>
              ))}
              <th className="text-right bg-[#191c1f] text-white">Toplam</th>
            </tr>
          </thead>
          <tbody>
            <SectionRow accent="bg-[#b50303]" label="GELİR" />
            <EditableRow
              label="Müşteri Toplam"
              row={revenueRow}
              disabled={disabled}
              color="text-[#005b9f]"
              onChange={(m, v) => onCellChange('REVENUE', m, v)}
              onDelete={(m) => onCellDelete('REVENUE', m)}
            />
            <SummaryRow label="GELİR TOPLAM" row={revenueRow} />

            <SectionRow accent="bg-[#8a5300]" label="HASAR" />
            <EditableRow
              label="Müşteri Toplam"
              row={claimRow}
              disabled={disabled}
              color="text-[#8a5300]"
              onChange={(m, v) => onCellChange('CLAIM', m, v)}
              onDelete={(m) => onCellDelete('CLAIM', m)}
            />
            <SummaryRow label="HASAR TOPLAM" row={claimRow} />

            <tr className="budget-metric-row">
              <td className="font-semibold">TEKNİK MARJ</td>
              {MONTHS.map((_, i) => {
                const rev = toNumber(revenueRow[i + 1]?.amount ?? '')
                const cla = toNumber(claimRow[i + 1]?.amount ?? '')
                const margin = rev - cla
                return (
                  <td key={i} className="text-right num font-semibold">
                    {formatAmount(margin)}
                  </td>
                )
              })}
              <td className="text-right num font-bold">{formatAmount(marginTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SectionRow({ accent, label }: { accent: string; label: string }) {
  return (
    <tr>
      <td className="budget-section-row" colSpan={14}>
        <span className={`budget-section-dot ${accent}`} />
        {label}
      </td>
    </tr>
  )
}

function SummaryRow({ label, row }: { label: string; row: RowValues }) {
  return (
    <tr className="row-total">
      <td>{label}</td>
      {MONTHS.map((_, i) => (
        <td key={i} className="text-right num">
          {formatAmount(toNumber(row[i + 1]?.amount ?? ''))}
        </td>
      ))}
      <td className="text-right num font-bold">{formatAmount(sumRow(row))}</td>
    </tr>
  )
}

function EditableRow({
  label,
  row,
  disabled,
  color,
  onChange,
  onDelete,
}: {
  label: string
  row: RowValues
  disabled: boolean
  color: string
  onChange: (month: number, value: string) => void
  onDelete: (month: number) => void
}) {
  const total = sumRow(row)
  return (
    <tr>
      <td className="font-semibold">{label}</td>
      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
        const cell = row[m]
        return (
          <td key={m} className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <input
                className={`cell-edit ${color}`}
                value={cell?.amount ?? ''}
                disabled={disabled}
                inputMode="decimal"
                onChange={(e) => onChange(m, e.target.value)}
              />
              {cell?.id != null && !disabled ? (
                <button
                  type="button"
                  className="text-on-surface-variant hover:text-error"
                  title={`${MONTHS[m - 1]} kaydını sil`}
                  onClick={() => onDelete(m)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                    close
                  </span>
                </button>
              ) : null}
            </div>
          </td>
        )
      })}
      <td className="text-right num font-bold bg-surface-container-low">
        {formatAmount(total)}
      </td>
    </tr>
  )
}

function sumRow(row: RowValues): number {
  let total = 0
  for (let m = 1; m <= 12; m += 1) {
    total += toNumber(row[m]?.amount ?? '')
  }
  return total
}
