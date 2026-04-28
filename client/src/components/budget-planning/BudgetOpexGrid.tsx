import { Link } from 'react-router-dom'
import type { BudgetTreeOpex } from './types'
import { MONTHS } from './types'
import { formatAmount } from './utils'

interface Props {
  opex: BudgetTreeOpex
}

/**
 * OPEX kategori satırı — salt-okunur görünüm. Düzenleme
 * /expense-entries sayfasından yapılır (ayrı endpoint, ayrı onay akışı).
 */
export function BudgetOpexGrid({ opex }: Props) {
  const total = opex.monthlyTry.reduce((a, b) => a + b, 0)
  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-4 border-b border-surface-container-low flex items-center justify-between">
        <div>
          <span className="chip chip-info mr-2">{opex.classification}</span>
          <span className="text-xs text-on-surface-variant">
            Bu kalem gider girişleri sayfasından düzenlenir.
          </span>
        </div>
        <Link className="btn-secondary" to="/expense-entries">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            edit_note
          </span>
          Gider Girişleri
        </Link>
      </div>

      <div className="max-h-[60vh] overflow-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ minWidth: 220 }}>Kategori</th>
              {MONTHS.map((m) => (
                <th key={m} className="text-right">
                  {m}
                </th>
              ))}
              <th className="text-right tbl-total-cell">Toplam</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-semibold">{opex.categoryName}</td>
              {opex.monthlyTry.map((value, i) => (
                <td key={i} className="text-right num">
                  {formatAmount(value)}
                </td>
              ))}
              <td className="text-right num font-bold">{formatAmount(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
