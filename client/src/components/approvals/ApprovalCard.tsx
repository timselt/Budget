import {
  STATUS_CHIP_CLASS,
  STATUS_LABELS,
  type BudgetVersionStatus,
} from '../budget-planning/types'

export type WorkflowAction =
  | 'submit'
  | 'approve-finance'
  | 'approve-cfo-activate'
  | 'reject'
  | 'archive'

const ACTION_LABELS: Record<WorkflowAction, string> = {
  submit: 'Onaya Gönder',
  'approve-finance': 'Finans Onayla',
  'approve-cfo-activate': 'Onayla ve Yayına Al',
  reject: 'Reddet',
  archive: 'Arşivle',
}

const STATUS_BORDER: Record<string, string> = {
  Active: 'border-l-success',
  Draft: 'border-l-warning',
  PendingFinance: 'border-l-primary',
  PendingCfo: 'border-l-primary',
  Rejected: 'border-l-error',
  Archived: 'border-l-on-surface-variant',
}

const STATUS_NEXT_LINE: Record<string, string> = {
  Draft: 'Onay sürecini başlatın.',
  PendingFinance: 'Finans yöneticisinin onayını bekliyor.',
  PendingCfo: 'CFO onayını bekliyor — yayına alındığında eski aktif arşivlenir.',
  Rejected: 'Reddedildi — düzeltip tekrar onaya gönderebilirsiniz.',
  Active: 'Yürürlükte. Yeni revizyon için Bütçe Planlama → Versiyonlar.',
  Archived: 'Arşivde — sadece görüntüleme.',
}

export interface ApprovalCardVersion {
  id: number
  budgetYearId: number
  year: number
  name: string
  status: string
  isActive: boolean
  rejectionReason: string | null
  createdAt: string
}

interface ApprovalCardProps {
  version: ApprovalCardVersion
  /** Statünün izin verdiği aksiyonlar — ApprovalsPage STATUS_META ile filtrelenir. */
  allowedActions: ReadonlyArray<WorkflowAction>
  /** Kullanıcının rolü bu aksiyona izin veriyor mu? */
  canPerform: (action: WorkflowAction) => boolean
  onAction: (action: WorkflowAction) => void
  onRejectRequest: () => void
  pending: boolean
}

/**
 * Karar kartı — versiyonun statüsüne göre status renk şeridi, "sıradaki adım"
 * prompt'u, izin verilen aksiyonlar (rol bazlı filtreli) tek satırda buton
 * olarak. VersionCard ile aynı görsel dil ama çoklu aksiyon destekler
 * (Onaylar ekranı statüye göre 1-2 buton gösterir; bkz STATUS_META).
 */
export function ApprovalCard({
  version,
  allowedActions,
  canPerform,
  onAction,
  onRejectRequest,
  pending,
}: ApprovalCardProps) {
  const status = version.status as BudgetVersionStatus
  const borderClass = STATUS_BORDER[status] ?? 'border-l-on-surface-variant'
  const nextLine = STATUS_NEXT_LINE[status] ?? '—'
  const visibleActions = allowedActions.filter(canPerform)

  return (
    <div
      id={`approval-card-${version.id}`}
      className={`card border-l-4 ${borderClass} flex flex-col gap-3`}
    >
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-on-surface-variant">
              FY {version.year}
            </span>
            <h4 className="text-base font-bold text-on-surface truncate">
              {version.name}
            </h4>
            <span
              className={`chip ${STATUS_CHIP_CLASS[status] ?? 'chip-neutral'} text-xs`}
            >
              {STATUS_LABELS[status] ?? version.status}
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
      </div>

      <div className="border-t border-outline-variant pt-2">
        <p className="text-[0.65rem] font-semibold text-on-surface-variant uppercase tracking-wider">
          Sıradaki adım
        </p>
        <p className="text-sm text-on-surface mt-1">{nextLine}</p>
      </div>

      {allowedActions.length === 0 ? (
        <p className="text-xs text-on-surface-variant italic">
          Bu durumda alınabilecek aksiyon yok.
        </p>
      ) : visibleActions.length === 0 ? (
        <p className="text-xs text-on-surface-variant italic">
          Sizin rolünüzde bu versiyona aksiyon hakkı yok.
        </p>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {visibleActions.map((action) => {
            const isReject = action === 'reject'
            const isArchive = action === 'archive'
            const isCfoActivate = action === 'approve-cfo-activate'
            const btnClass = isReject
              ? 'btn-ghost text-error'
              : isArchive
                ? 'btn-secondary'
                : 'btn-primary'
            const label = ACTION_LABELS[action]
            return (
              <button
                key={action}
                type="button"
                className={btnClass}
                disabled={pending}
                onClick={() => {
                  if (isReject) {
                    onRejectRequest()
                    return
                  }
                  const confirmMsg = isCfoActivate
                    ? `"${version.name}" CFO onayı ile YAYINA ALINACAK. Mevcut yürürlükteki versiyon arşivlenecek. Emin misiniz?`
                    : `"${version.name}" versiyonu için "${label}" aksiyonunu uygulamak istiyor musunuz?`
                  if (!confirm(confirmMsg)) return
                  onAction(action)
                }}
              >
                {pending ? '…' : label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
