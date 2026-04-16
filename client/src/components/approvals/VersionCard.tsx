import { StatusBadge } from './StatusBadge'

interface VersionCardProps {
  id: number
  name: string
  status: string
  isActive: boolean
  createdAt: string
  onSubmit?: () => void
  onDelete?: () => void
  onApprove?: () => void
  onReject?: () => void
  onActivate?: () => void
  onArchive?: () => void
  isActionLoading?: boolean
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

function ActionButton({
  label,
  onClick,
  variant = 'default',
  disabled = false,
}: {
  label: string
  onClick?: () => void
  variant?: 'default' | 'danger' | 'success'
  disabled?: boolean
}) {
  const variantClasses = {
    default:
      'border-border text-text hover:bg-surface-alt',
    danger:
      'border-red-200 text-red-600 hover:bg-red-50',
    success:
      'border-green-200 text-green-700 hover:bg-green-50',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${variantClasses[variant]}`}
    >
      {label}
    </button>
  )
}

export function VersionCard({
  name,
  status,
  isActive,
  createdAt,
  onSubmit,
  onDelete,
  onApprove,
  onReject,
  onActivate,
  onArchive,
  isActionLoading = false,
}: VersionCardProps) {
  const showSubmit = status === 'DRAFT' && onSubmit
  const showDelete = status === 'DRAFT' && onDelete
  const showApprove =
    (status === 'SUBMITTED' ||
      status === 'DEPT_APPROVED' ||
      status === 'FINANCE_APPROVED') &&
    onApprove
  const showReject =
    (status === 'SUBMITTED' ||
      status === 'DEPT_APPROVED' ||
      status === 'FINANCE_APPROVED') &&
    onReject
  const showActivate = status === 'CFO_APPROVED' && onActivate
  const showArchive = status === 'ACTIVE' && !isActive && onArchive

  return (
    <div className="group rounded-xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h3 className="truncate text-sm font-semibold text-text">
              {name}
            </h3>
            <StatusBadge status={status} />
            {isActive && (
              <span className="inline-flex items-center rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                Aktif
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Oluşturulma: {formatDate(createdAt)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {showSubmit && (
          <ActionButton
            label="Onaya Gönder"
            onClick={onSubmit}
            variant="success"
            disabled={isActionLoading}
          />
        )}
        {showApprove && (
          <ActionButton
            label="Onayla"
            onClick={onApprove}
            variant="success"
            disabled={isActionLoading}
          />
        )}
        {showActivate && (
          <ActionButton
            label="Aktifleştir"
            onClick={onActivate}
            variant="success"
            disabled={isActionLoading}
          />
        )}
        {showArchive && (
          <ActionButton
            label="Arşivle"
            onClick={onArchive}
            disabled={isActionLoading}
          />
        )}
        {showReject && (
          <ActionButton
            label="Reddet"
            onClick={onReject}
            variant="danger"
            disabled={isActionLoading}
          />
        )}
        {showDelete && (
          <ActionButton
            label="Sil"
            onClick={onDelete}
            variant="danger"
            disabled={isActionLoading}
          />
        )}
      </div>
    </div>
  )
}
