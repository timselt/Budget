import { getStatusChipClass, getStatusLabel } from './types'
import type { BudgetVersionStatus } from './types'
import type { NextStep } from './useNextStepNavigator'

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
  onCreateRevision?: () => void
  createRevisionPending?: boolean
  /** Çalışma bandı altında "sıradaki adım" satırı + Düzelt → CTA. */
  nextStep?: NextStep | null
  onJumpToNextStep?: () => void
}

const LEVEL_ICON_COLOR: Record<NextStep['level'], string> = {
  fail: 'text-error',
  warn: 'text-warning',
  pass: 'text-success',
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
  onCreateRevision,
  createRevisionPending,
  nextStep,
  onJumpToNextStep,
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
        </div>
        {nextStep && (
          <div className="border-t border-outline-variant pt-2 mt-2 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span
                className={`material-symbols-outlined ${LEVEL_ICON_COLOR[nextStep.level]}`}
                style={{ fontSize: 18 }}
                aria-hidden
              >
                {nextStep.level === 'pass' ? 'check_circle' : 'flag'}
              </span>
              <p className="text-sm text-on-surface truncate">
                <span className="font-semibold">Sıradaki adım: </span>
                {nextStep.message}
              </p>
            </div>
            {nextStep.action.kind !== 'none' && onJumpToNextStep && (
              <button
                type="button"
                className="btn-primary whitespace-nowrap"
                style={{ padding: '.4rem .75rem', fontSize: '.75rem' }}
                onClick={onJumpToNextStep}
              >
                {nextStep.ctaLabel}
              </button>
            )}
          </div>
        )}
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
