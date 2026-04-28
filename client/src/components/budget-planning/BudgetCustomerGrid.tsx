import type { ReactNode } from 'react'
import { MONTHS } from './types'
import { formatAmount, toNumber } from './utils'
import { formatPercent } from '../../lib/number-format'
import { METRIC_LABELS } from '../../lib/metric-labels'
import { cellKey } from './budget-grid-types'
import type { CellId, ContractRow, EntryKind, GridValues } from './budget-grid-types'
import { BudgetCellInputs } from './BudgetCellInputs'

interface Props {
  contracts: ContractRow[]
  values: GridValues
  disabled: boolean
  onCellChange: (
    cell: CellId,
    value: { amount: string; quantity: number | null },
  ) => void
  onCellDelete: (cell: CellId, entryId: number) => void
}

const LOSS_RATIO_OK = 55 // ≤ yeşil
const LOSS_RATIO_WARN = 70 // ≤ sarı; üstü kırmızı

/** Total columns: product header + role badge + 12 months + total. */
const TABLE_COL_COUNT = 1 + 1 + 12 + 1

export function BudgetCustomerGrid({
  contracts,
  values,
  disabled,
  onCellChange,
  onCellDelete,
}: Props) {
  const rows: ContractRow[] = contracts
  const hasContracts = rows.length > 0

  // Her ay için revenue/claim toplamı (kontrat sum'u ya da fallback tek satır)
  const monthTotals = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    let revenueSum = 0
    let claimSum = 0
    if (hasContracts) {
      for (const r of rows) {
        revenueSum += toNumber(
          values[cellKey({ contractId: r.contractId, kind: 'REVENUE', month })]?.amount ?? '',
        )
        claimSum += toNumber(
          values[cellKey({ contractId: r.contractId, kind: 'CLAIM', month })]?.amount ?? '',
        )
      }
    } else {
      revenueSum = toNumber(
        values[cellKey({ contractId: null, kind: 'REVENUE', month })]?.amount ?? '',
      )
      claimSum = toNumber(
        values[cellKey({ contractId: null, kind: 'CLAIM', month })]?.amount ?? '',
      )
    }
    return { month, revenueSum, claimSum }
  })

  const totalRevenue = monthTotals.reduce((a, t) => a + t.revenueSum, 0)
  const totalClaim = monthTotals.reduce((a, t) => a + t.claimSum, 0)
  const totalLossRatio = totalRevenue > 0 ? (totalClaim / totalRevenue) * 100 : 0

  return (
    <div className="card p-0 overflow-hidden">
      <div className="overflow-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ minWidth: 220 }}>HESAP / ÜRÜN</th>
              <th style={{ minWidth: 70 }}>TİP</th>
              {MONTHS.map((m) => (
                <th key={m} className="text-right">
                  {m}
                </th>
              ))}
              <th className="text-right bg-[#1e293b] text-white">TOPLAM</th>
            </tr>
          </thead>
          <tbody>
            {hasContracts ? (
              rows.map((r) => (
                <ProductRowGroup
                  key={r.contractId}
                  productName={r.productName}
                  contractCode={r.contractCode}
                  contractId={r.contractId}
                  values={values}
                  disabled={disabled}
                  onCellChange={onCellChange}
                  onCellDelete={onCellDelete}
                />
              ))
            ) : (
              <ProductRowGroup
                productName="Müşteri Toplam"
                contractCode="— Kontrat tanımlı değil —"
                contractId={null}
                values={values}
                disabled={disabled}
                onCellChange={onCellChange}
                onCellDelete={onCellDelete}
              />
            )}

            {/* GELİR TOPLAM */}
            <TotalRow
              label="GELİR TOPLAM"
              monthly={monthTotals.map((t) => t.revenueSum)}
              total={totalRevenue}
            />
            {/* HASAR TOPLAM */}
            <TotalRow
              label="HASAR TOPLAM"
              monthly={monthTotals.map((t) => t.claimSum)}
              total={totalClaim}
            />

            {/* TEKNİK MARJ — formül notlu özet satırı */}
            <tr className="budget-metric-row">
              <td className="font-semibold" colSpan={2}>
                {METRIC_LABELS.technicalMargin}
                <span className="ml-2 text-[10px] font-normal opacity-80">
                  (Gelir − Hasar)
                </span>
              </td>
              {monthTotals.map((t) => {
                const margin = t.revenueSum - t.claimSum
                return (
                  <td key={t.month} className="text-right num font-semibold">
                    {formatAmount(margin)}
                  </td>
                )
              })}
              <td className="text-right num font-bold">
                {formatAmount(totalRevenue - totalClaim)}
              </td>
            </tr>

            {/* Loss Ratio öncesi siyah separator bar */}
            <tr className="budget-separator-bar">
              <td colSpan={TABLE_COL_COUNT}></td>
            </tr>

            {/* LOSS RATIO — formül notlu özet satırı */}
            <tr>
              <td className="font-semibold" colSpan={2}>
                {METRIC_LABELS.lossRatio}
                <span className="ml-2 text-[10px] font-normal text-on-surface-variant">
                  (Hasar / Gelir)
                </span>
              </td>
              {monthTotals.map((t) => {
                const lr = t.revenueSum > 0 ? (t.claimSum / t.revenueSum) * 100 : 0
                return (
                  <td key={t.month} className="text-center">
                    {t.revenueSum > 0 ? (
                      <LossRatioChip value={lr} />
                    ) : (
                      <span className="text-on-surface-variant">—</span>
                    )}
                  </td>
                )
              })}
              <td className="text-center">
                {totalRevenue > 0 ? <LossRatioChip value={totalLossRatio} /> : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Single product header column (rowspan=2) joined with two sub-rows: a Gelir
 * row carrying Adet+Tutar inputs and a Hasar row carrying Tutar-only inputs.
 * Eliminates the previous duplicate-product-row layout (one under GELİR band,
 * one under HASAR band).
 */
function ProductRowGroup({
  productName,
  contractCode,
  contractId,
  values,
  disabled,
  onCellChange,
  onCellDelete,
}: {
  productName: string
  contractCode: string
  contractId: number | null
  values: GridValues
  disabled: boolean
  onCellChange: (
    cell: CellId,
    value: { amount: string; quantity: number | null },
  ) => void
  onCellDelete: (cell: CellId, entryId: number) => void
}) {
  const revenueTotal = sumKind(values, contractId, 'REVENUE')
  const claimTotal = sumKind(values, contractId, 'CLAIM')

  return (
    <>
      <tr className="budget-item-row">
        {/* a11y: rowSpan'd product header is the row-group header for the
            following Gelir + Hasar pair — screen readers announce it as such. */}
        <th scope="rowgroup" rowSpan={2} className="align-top">
          <div className="font-semibold">{productName}</div>
          <div className="font-mono text-[11px] text-on-surface-variant">
            {contractCode}
          </div>
        </th>
        <td>
          <RoleBadge kind="revenue">Gelir</RoleBadge>
        </td>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
          <CellTd
            key={`rev-${month}`}
            contractId={contractId}
            kind="REVENUE"
            month={month}
            values={values}
            disabled={disabled}
            onCellChange={onCellChange}
            onCellDelete={onCellDelete}
          />
        ))}
        <td className="text-right num font-bold bg-surface-container-low">
          {formatAmount(revenueTotal)}
        </td>
      </tr>
      <tr className="budget-item-row">
        {/* product header td is rowSpan'd from the row above */}
        <td>
          <RoleBadge kind="loss">Hasar</RoleBadge>
        </td>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
          <CellTd
            key={`cla-${month}`}
            contractId={contractId}
            kind="CLAIM"
            month={month}
            values={values}
            disabled={disabled}
            onCellChange={onCellChange}
            onCellDelete={onCellDelete}
          />
        ))}
        <td className="text-right num font-bold bg-surface-container-low">
          {formatAmount(claimTotal)}
        </td>
      </tr>
    </>
  )
}

function sumKind(values: GridValues, contractId: number | null, kind: EntryKind): number {
  let total = 0
  for (let m = 1; m <= 12; m += 1) {
    total += toNumber(values[cellKey({ contractId, kind, month: m })]?.amount ?? '')
  }
  return total
}

/**
 * Renders one month/kind cell with BudgetCellInputs (Adet on top, Tutar below).
 * Hasar (CLAIM) cells pass `showQuantity={false}` so no Adet input is shown.
 */
function CellTd({
  contractId,
  kind,
  month,
  values,
  disabled,
  onCellChange,
  onCellDelete,
}: {
  contractId: number | null
  kind: EntryKind
  month: number
  values: GridValues
  disabled: boolean
  onCellChange: (
    cell: CellId,
    value: { amount: string; quantity: number | null },
  ) => void
  onCellDelete: (cell: CellId, entryId: number) => void
}) {
  const key = cellKey({ contractId, kind, month })
  const cell = values[key] ?? { id: null, amount: '', quantity: null }
  const showQuantity = kind === 'REVENUE'

  return (
    <td className="text-right align-top">
      <div className="flex items-start gap-1 justify-end">
        <BudgetCellInputs
          quantity={showQuantity ? cell.quantity : null}
          amount={cell.amount}
          showQuantity={showQuantity}
          disabled={disabled}
          onChange={(next) =>
            onCellChange(
              { contractId, kind, month },
              { amount: next.amount, quantity: next.quantity },
            )
          }
        />
        {cell.id != null && !disabled ? (
          <button
            type="button"
            className="text-on-surface-variant hover:text-error"
            title={`${MONTHS[month - 1]} kaydını sil`}
            onClick={() => onCellDelete({ contractId, kind, month }, cell.id!)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              close
            </span>
          </button>
        ) : null}
      </div>
    </td>
  )
}

/**
 * Small role chip placed in each sub-row of a product block. Reuses existing
 * project chip tokens (`chip-error` for revenue, `chip-warning` for loss) so
 * we do not introduce new global Tailwind classes. Compact size + uppercase
 * tracking matches the dense matrix layout.
 */
function RoleBadge({
  kind,
  children,
}: {
  kind: 'revenue' | 'loss'
  children: ReactNode
}) {
  const chipClass = kind === 'revenue' ? 'chip-error' : 'chip-warning'
  return (
    <span
      className={`chip ${chipClass} text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5`}
    >
      {children}
    </span>
  )
}

function TotalRow({
  label,
  monthly,
  total,
}: {
  label: string
  monthly: number[]
  total: number
}) {
  return (
    <tr className="budget-total-row">
      <td colSpan={2}>{label}</td>
      {monthly.map((v, i) => (
        <td key={i} className="text-right num">
          {formatAmount(v)}
        </td>
      ))}
      <td className="text-right num font-bold">{formatAmount(total)}</td>
    </tr>
  )
}

function LossRatioChip({ value }: { value: number }) {
  const chipClass =
    value <= LOSS_RATIO_OK
      ? 'chip-success'
      : value <= LOSS_RATIO_WARN
        ? 'chip-warning'
        : 'chip-error'
  return (
    <span className={`chip ${chipClass} text-xs`}>
      {formatPercent(value)}
    </span>
  )
}
