type VersionStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'DEPT_APPROVED'
  | 'FINANCE_APPROVED'
  | 'CFO_APPROVED'
  | 'ACTIVE'
  | 'ARCHIVED'
  | 'REJECTED'

interface StatusBadgeProps {
  status: string
}

const STATUS_CONFIG: Record<VersionStatus, { label: string; className: string }> = {
  DRAFT: {
    label: 'Taslak',
    className: 'bg-gray-100 text-gray-700',
  },
  SUBMITTED: {
    label: 'Gönderildi',
    className: 'bg-blue-100 text-blue-700',
  },
  DEPT_APPROVED: {
    label: 'Departman Onayı',
    className: 'bg-yellow-100 text-yellow-700',
  },
  FINANCE_APPROVED: {
    label: 'Finans Onayı',
    className: 'bg-orange-100 text-orange-700',
  },
  CFO_APPROVED: {
    label: 'CFO Onayı',
    className: 'bg-purple-100 text-purple-700',
  },
  ACTIVE: {
    label: 'Aktif',
    className: 'bg-green-100 text-green-700',
  },
  ARCHIVED: {
    label: 'Arşiv',
    className: 'bg-gray-100 text-gray-400',
  },
  REJECTED: {
    label: 'Reddedildi',
    className: 'bg-red-100 text-red-700',
  },
}

function isVersionStatus(status: string): status is VersionStatus {
  return status in STATUS_CONFIG
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = isVersionStatus(status)
    ? STATUS_CONFIG[status]
    : { label: status, className: 'bg-gray-100 text-gray-700' }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  )
}
