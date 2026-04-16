import type { AlertSeverity } from '../../hooks/useVariance'

interface AlertBadgeProps {
  severity: AlertSeverity | null
}

const SEVERITY_CONFIG: Record<AlertSeverity, { label: string; className: string }> = {
  medium: {
    label: 'Orta',
    className: 'border-amber-400/40 bg-amber-50 text-amber-700',
  },
  high: {
    label: 'Yuksek',
    className: 'border-orange-400/40 bg-orange-50 text-orange-700',
  },
  critical: {
    label: 'Kritik',
    className: 'border-red-400/40 bg-red-50 text-red-700',
  },
}

export function AlertBadge({ severity }: AlertBadgeProps) {
  if (severity === null) return null

  const config = SEVERITY_CONFIG[severity]

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  )
}
