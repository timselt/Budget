import { getStatusChipClass, getStatusLabel } from './types'
import type { BudgetVersionStatus } from './types'

interface Version {
  id: number
  name: string
  status: string
  isActive: boolean
}

interface Props {
  yearLabel: number
  version: Version
  isEditable: boolean
  completedCount: number
  totalCount: number
  currency: string
  scenarioName?: string
  onCreateRevision?: () => void
  createRevisionPending?: boolean
}

/**
 * Sayfa başlığının altına yapışan çalışma bandı: kullanıcının "neredeyim?"
 * sorusunu tek bakışta yanıtlar. Düzenlenebilir versiyon: progress bar +
 * meta. Salt-okunur: lock + Revizyon Aç CTA.
 */
export function WorkContextBar({
  yearLabel,
  version,
  isEditable,
  completedCount,
  totalCount,
  currency,
  scenarioName,
  onCreateRevision,
  createRevisionPending,
}: Props) {
  const status = version.status as BudgetVersionStatus
  const statusLabel = getStatusLabel(version.status)

  if (isEditable) {
    return (
      <div className="card mb-4 border-l-4 border-l-primary">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-sm font-semibold text-on-surface">
            FY {yearLabel} › {version.name}
          </span>
          <span className={`chip ${getStatusChipClass(version.status)}`}>
            {statusLabel}
          </span>
          <span className="text-xs text-success ml-1 inline-flex items-center gap-1">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
            Düzenleyebilirsiniz
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] max-w-md">
            <div className="h-2 bg-surface-container-low rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width:
                    totalCount > 0
                      ? `${(completedCount / totalCount) * 100}%`
                      : '0%',
                }}
              />
            </div>
          </div>
          <span className="text-xs text-on-surface-variant num whitespace-nowrap">
            {completedCount}/{totalCount} müşteri
          </span>
          <span className="text-xs text-on-surface-variant">·</span>
          <span className="text-xs text-on-surface-variant">{currency}</span>
          <span className="text-xs text-on-surface-variant">·</span>
          <span className="text-xs text-on-surface-variant">
            Senaryo: {scenarioName ?? '—'}
          </span>
        </div>
      </div>
    )
  }

  // Salt-okunur (Active/Archived)
  return (
    <div className="card mb-4 flex items-center gap-4 border-l-4 border-l-primary">
      <span
        className="material-symbols-outlined text-primary"
        style={{ fontSize: 24 }}
      >
        lock
      </span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-on-surface">
          FY {yearLabel} › {version.name}
          {' — '}
          <strong>{statusLabel}</strong>
          <span className="text-on-surface-variant"> (salt-okunur)</span>
        </p>
        <p className="text-xs text-on-surface-variant mt-0.5">
          {status === 'Active'
            ? 'Bu sürümde değişiklik yapılamaz. Düzenlemek için revizyon açın; tüm girişler yeni taslağa kopyalanır.'
            : 'Bu sürüm arşivde. Yeni sürüm açmak için Versiyonlar sekmesine geçin.'}
        </p>
      </div>
      {status === 'Active' && onCreateRevision && (
        <button
          type="button"
          className="btn-primary"
          disabled={createRevisionPending}
          onClick={onCreateRevision}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            edit_note
          </span>
          {createRevisionPending ? 'Oluşturuluyor…' : 'Revizyon Aç'}
        </button>
      )}
    </div>
  )
}
