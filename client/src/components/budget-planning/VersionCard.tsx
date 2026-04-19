import {
  getStatusChipClass,
  getStatusLabel,
  getStatusNextAction,
} from './types'
import type { BudgetVersionStatus } from './types'

export interface VersionCardVersion {
  id: number
  budgetYearId: number
  name: string
  status: string
  isActive: boolean
  rejectionReason: string | null
  createdAt: string
}

export interface VersionCardRoles {
  isAdmin: boolean
  isFinance: boolean
  isCfo: boolean
}

export interface VersionCardHandlers {
  goToPlanning: (versionId: number) => void
  transition: (versionId: number, endpoint: string) => void
  createRevision: (versionId: number) => void
  reject: (versionId: number) => void
  archive: (versionId: number) => void
}

interface VersionCardProps {
  version: VersionCardVersion
  roles: VersionCardRoles
  handlers: VersionCardHandlers
  pending?: boolean
}

const REJECTABLE_STATUSES: ReadonlySet<BudgetVersionStatus> = new Set([
  'PendingFinance',
  'PendingCfo',
])

const STATUS_BORDER: Record<string, string> = {
  Active: 'border-l-success',
  Draft: 'border-l-warning',
  PendingFinance: 'border-l-primary',
  PendingCfo: 'border-l-primary',
  Rejected: 'border-l-error',
  Archived: 'border-l-on-surface-variant',
}

interface PrimaryAction {
  label: string
  onClick: () => void
}

/**
 * Versiyonun statüsü + kullanıcı rolüne göre tek "Ana Aksiyon" butonu döner.
 * Buton yoksa null (kart altında sadece sıradaki adım metni kalır).
 */
function primaryAction(
  v: VersionCardVersion,
  roles: VersionCardRoles,
  handlers: VersionCardHandlers,
): PrimaryAction | null {
  const status = v.status as BudgetVersionStatus
  const { isAdmin, isFinance, isCfo } = roles
  switch (status) {
    case 'Draft':
      return isFinance
        ? { label: 'Devam Et', onClick: () => handlers.goToPlanning(v.id) }
        : null
    case 'Rejected':
      return isFinance
        ? {
            label: 'Düzeltmeye Devam Et',
            onClick: () => handlers.goToPlanning(v.id),
          }
        : null
    case 'PendingFinance':
      return isFinance
        ? {
            label: 'Finans Onayla',
            onClick: () => handlers.transition(v.id, 'approve-finance'),
          }
        : null
    case 'PendingCfo':
      return isCfo
        ? {
            label: 'Onayla ve Yayına Al',
            onClick: () => handlers.transition(v.id, 'approve-cfo-activate'),
          }
        : null
    case 'Active':
      return isFinance || isAdmin
        ? {
            label: 'Revizyon Aç',
            onClick: () => handlers.createRevision(v.id),
          }
        : null
    default:
      return null
  }
}

export function VersionCard({
  version,
  roles,
  handlers,
  pending = false,
}: VersionCardProps) {
  const status = version.status as BudgetVersionStatus
  const action = primaryAction(version, roles, handlers)
  const canReject = REJECTABLE_STATUSES.has(status)
  const canArchive = status === 'Active' && (roles.isFinance || roles.isAdmin)
  const borderClass = STATUS_BORDER[status] ?? 'border-l-on-surface-variant'

  return (
    <div
      id={`version-card-${version.id}`}
      className={`card border-l-4 ${borderClass} flex flex-col gap-3`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-base font-bold text-on-surface truncate">
              {version.name}
            </h4>
            <span className={`chip ${getStatusChipClass(version.status)} text-xs`}>
              {getStatusLabel(version.status)}
            </span>
            {version.isActive && (
              <span className="chip chip-success text-xs">Aktif</span>
            )}
          </div>
          <p className="text-[0.65rem] font-mono text-on-surface-variant mt-1">
            #{version.id} ·{' '}
            {new Date(version.createdAt).toLocaleDateString('tr-TR')}
            {version.rejectionReason ? ` · Red: ${version.rejectionReason}` : ''}
          </p>
        </div>
        {(canReject || canArchive) && (
          <details className="relative shrink-0">
            <summary className="cursor-pointer text-on-surface-variant hover:text-on-surface text-lg list-none px-2">
              ⋯
            </summary>
            <div className="absolute right-0 top-7 bg-surface-container-lowest border border-outline-variant rounded-md shadow-lg p-1 z-10 min-w-[140px]">
              {canReject && (
                <button
                  type="button"
                  onClick={() => handlers.reject(version.id)}
                  className="block w-full text-left px-3 py-1.5 text-sm hover:bg-surface-container-low rounded"
                >
                  Reddet
                </button>
              )}
              {canArchive && (
                <button
                  type="button"
                  onClick={() => handlers.archive(version.id)}
                  className="block w-full text-left px-3 py-1.5 text-sm hover:bg-surface-container-low rounded"
                >
                  Arşivle
                </button>
              )}
            </div>
          </details>
        )}
      </div>

      <div className="border-t border-outline-variant pt-2">
        <p className="text-[0.65rem] font-semibold text-on-surface-variant uppercase tracking-wider">
          Sıradaki adım
        </p>
        <p className="text-sm text-on-surface mt-1">
          {getStatusNextAction(version.status)}
        </p>
      </div>

      {action && (
        <button
          type="button"
          className="btn-primary w-full"
          onClick={action.onClick}
          disabled={pending}
        >
          {pending ? 'İşleniyor…' : action.label}
        </button>
      )}
    </div>
  )
}

/**
 * Kart grid sıralaması: Aktif önce, sonra Archived dışındakiler createdAt
 * DESC, en altta Archived. Stable sort — aynı bucket'ta orijinal sıra korunur.
 */
export function sortVersionsForDisplay<T extends VersionCardVersion>(
  versions: ReadonlyArray<T>,
): T[] {
  const bucket = (v: T): number => {
    if (v.isActive || v.status === 'Active') return 0
    if (v.status === 'Archived') return 2
    return 1
  }
  return [...versions].sort((a, b) => {
    const ba = bucket(a)
    const bb = bucket(b)
    if (ba !== bb) return ba - bb
    // Aynı bucket → createdAt desc (en yeni üstte)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}
