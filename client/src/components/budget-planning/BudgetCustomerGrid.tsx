import { MONTHS } from './types'
import { formatAmount, toNumber } from './utils'

/**
 * Müşteri bazlı bütçe girişi — kontrat başına ayrı satır.
 * ADR-0014: her aktif kontrat (müşteri × ürün) için 12 aylık revenue + claim
 * input'u. Kontrat yoksa tek fallback "Müşteri Toplam" satırı.
 */

export type EntryKind = 'REVENUE' | 'CLAIM'

export interface CellId {
  contractId: number | null // null = fallback "Müşteri Toplam"
  kind: EntryKind
  month: number
}

export interface CellValue {
  id: number | null // BudgetEntry.Id (mevcut kayıt için)
  amount: string
}

export interface ContractRow {
  contractId: number
  productName: string
  productCode: string
  contractCode: string
}

export type GridValues = Record<string, CellValue> // key = `${contractId|fb}:${kind}:${month}`

export function cellKey(c: CellId): string {
  return `${c.contractId ?? 'fb'}:${c.kind}:${c.month}`
}

interface Props {
  contracts: ContractRow[]
  values: GridValues
  disabled: boolean
  onCellChange: (cell: CellId, amount: string) => void
  onCellDelete: (cell: CellId, entryId: number) => void
}

const LOSS_RATIO_OK = 55 // ≤ yeşil
const LOSS_RATIO_WARN = 70 // ≤ sarı; üstü kırmızı

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
              <th style={{ minWidth: 260 }}>HESAP / ÜRÜN</th>
              {MONTHS.map((m) => (
                <th key={m} className="text-right">
                  {m}
                </th>
              ))}
              <th className="text-right bg-[#191c1f] text-white">TOPLAM</th>
            </tr>
          </thead>
          <tbody>
            {/* GELİR */}
            <BandRow label="GELİR" color="bg-[#b50303]" />
            {hasContracts ? (
              rows.map((r) => (
                <EditableContractRow
                  key={`rev-${r.contractId}`}
                  label={r.productName}
                  sublabel={r.contractCode}
                  kind="REVENUE"
                  contractId={r.contractId}
                  values={values}
                  disabled={disabled}
                  onCellChange={onCellChange}
                  onCellDelete={onCellDelete}
                />
              ))
            ) : (
              <EditableContractRow
                label="Müşteri Toplam"
                sublabel="— Kontrat tanımlı değil —"
                kind="REVENUE"
                contractId={null}
                values={values}
                disabled={disabled}
                onCellChange={onCellChange}
                onCellDelete={onCellDelete}
              />
            )}
            <TotalRow
              label="GELİR TOPLAM"
              monthly={monthTotals.map((t) => t.revenueSum)}
              total={totalRevenue}
            />

            {/* HASAR */}
            <BandRow label="HASAR" color="bg-[#8a5300]" />
            {hasContracts ? (
              rows.map((r) => (
                <EditableContractRow
                  key={`cla-${r.contractId}`}
                  label={r.productName}
                  sublabel={r.contractCode}
                  kind="CLAIM"
                  contractId={r.contractId}
                  values={values}
                  disabled={disabled}
                  onCellChange={onCellChange}
                  onCellDelete={onCellDelete}
                />
              ))
            ) : (
              <EditableContractRow
                label="Müşteri Toplam"
                sublabel="— Kontrat tanımlı değil —"
                kind="CLAIM"
                contractId={null}
                values={values}
                disabled={disabled}
                onCellChange={onCellChange}
                onCellDelete={onCellDelete}
              />
            )}
            <TotalRow
              label="HASAR TOPLAM"
              monthly={monthTotals.map((t) => t.claimSum)}
              total={totalClaim}
            />

            {/* TEKNİK MARJ */}
            <tr className="budget-metric-row">
              <td className="font-semibold">TEKNİK MARJ</td>
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

            {/* LOSS RATIO */}
            <tr>
              <td className="font-semibold">Loss Ratio</td>
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

function BandRow({ label, color }: { label: string; color: string }) {
  return (
    <tr>
      <td className="budget-section-row" colSpan={14}>
        <span className={`budget-section-dot ${color}`} />
        {label}
      </td>
    </tr>
  )
}

function EditableContractRow({
  label,
  sublabel,
  kind,
  contractId,
  values,
  disabled,
  onCellChange,
  onCellDelete,
}: {
  label: string
  sublabel: string
  kind: EntryKind
  contractId: number | null
  values: GridValues
  disabled: boolean
  onCellChange: (cell: CellId, amount: string) => void
  onCellDelete: (cell: CellId, entryId: number) => void
}) {
  let total = 0
  for (let m = 1; m <= 12; m += 1) {
    total += toNumber(values[cellKey({ contractId, kind, month: m })]?.amount ?? '')
  }

  const color = kind === 'REVENUE' ? 'text-[#005b9f]' : 'text-[#8a5300]'

  return (
    <tr>
      <td>
        <div className="font-semibold">{label}</div>
        <div className="text-[0.65rem] text-on-surface-variant font-mono">{sublabel}</div>
      </td>
      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
        const key = cellKey({ contractId, kind, month })
        const cell = values[key] ?? { id: null, amount: '' }
        return (
          <td key={month} className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <input
                className={`cell-edit ${color}`}
                value={cell.amount}
                disabled={disabled}
                inputMode="decimal"
                onChange={(e) =>
                  onCellChange({ contractId, kind, month }, e.target.value)
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
      })}
      <td className="text-right num font-bold bg-surface-container-low">
        {formatAmount(total)}
      </td>
    </tr>
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
    <tr className="row-total">
      <td>{label}</td>
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
      %{value.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
    </span>
  )
}
