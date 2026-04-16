interface KpiCardProps {
  title: string
  value: string
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
}

export function KpiCard({ title, value, subtitle, trend }: KpiCardProps) {
  const trendColor =
    trend === 'up' ? 'text-success' :
    trend === 'down' ? 'text-danger' :
    'text-text-muted'

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <p className="text-sm font-medium text-text-muted">{title}</p>
      <p className={`mt-1 text-2xl font-semibold tracking-tight ${trendColor}`}>
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 text-xs text-text-muted">{subtitle}</p>
      )}
    </div>
  )
}
