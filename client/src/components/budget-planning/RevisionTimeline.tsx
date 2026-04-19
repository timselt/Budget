import type { BudgetVersionStatus } from './types'
import { getStatusChipClass, getStatusLabel } from './types'

interface VersionRow {
  id: number
  name: string
  status: string
  isActive: boolean
  createdAt: string
}

interface Props {
  versions: VersionRow[]
  yearLabel: number
  onSelect?: (versionId: number) => void
}

const DOT_COLOR: Record<string, string> = {
  Draft: 'bg-warning',
  PendingFinance: 'bg-warning',
  PendingCfo: 'bg-warning',
  Active: 'bg-success',
  Rejected: 'bg-error',
  Archived: 'bg-on-surface-variant',
}

export function RevisionTimeline({ versions, yearLabel, onSelect }: Props) {
  if (versions.length === 0) return null

  // Kronolojik sıraya göre soldan sağa (eski → yeni)
  const sorted = [...versions].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )

  return (
    <div className="card mb-4">
      <p className="label-sm mb-2">Revizyon Zinciri (FY {yearLabel})</p>
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {sorted.map((v, i) => {
          const status = v.status as BudgetVersionStatus
          const dotClass = DOT_COLOR[status] ?? 'bg-on-surface-variant'
          return (
            <div key={v.id} className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
                onClick={() => onSelect?.(v.id)}
                title={`${v.name} — ${getStatusLabel(v.status)}`}
              >
                <span className={`w-3 h-3 rounded-full ${dotClass}`} />
                <span className="text-xs font-semibold text-on-surface whitespace-nowrap">
                  {v.name}
                </span>
                <span className={`chip ${getStatusChipClass(v.status)} text-xs`}>
                  {getStatusLabel(v.status)}
                </span>
              </button>
              {i < sorted.length - 1 && (
                <span className="text-on-surface-variant text-lg shrink-0">→</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
