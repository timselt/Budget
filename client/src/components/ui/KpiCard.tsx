interface KpiCardProps {
  title: string
  value: string
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
}

export function KpiCard({ title, value, subtitle, trend }: KpiCardProps) {
  const accentColor =
    trend === 'up' ? 'bg-sl-on-tertiary-container' :
    trend === 'down' ? 'bg-sl-error' :
    'bg-sl-primary'

  const valueColor =
    trend === 'up' ? 'text-sl-on-tertiary-container' :
    trend === 'down' ? 'text-sl-error' :
    'text-sl-on-surface'

  return (
    <div className="relative flex gap-4 rounded-lg border border-sl-outline-variant/15 bg-sl-surface-lowest py-4 pr-5 pl-0">
      <div className={`w-1 shrink-0 self-stretch rounded-r-full ${accentColor}`} />
      <div className="min-w-0">
        <p className="font-body text-xs uppercase tracking-wider text-sl-on-surface-variant">
          {title}
        </p>
        <p className={`mt-1 font-display text-2xl font-bold tracking-tight ${valueColor}`}>
          {value}
        </p>
        {subtitle && (
          <p className="mt-1 font-body text-xs text-sl-on-surface-variant">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
