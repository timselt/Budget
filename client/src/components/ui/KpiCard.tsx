interface KpiCardProps {
  title: string
  value: string
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  icon?: string
  variant?: 'default' | 'gradient'
}

const TREND_CONFIG = {
  up: {
    accent: 'bg-sl-tertiary',
    text: 'text-sl-tertiary',
    icon: 'trending_up',
  },
  down: {
    accent: 'bg-sl-error',
    text: 'text-sl-error',
    icon: 'trending_down',
  },
  neutral: {
    accent: 'bg-sl-primary',
    text: 'text-sl-on-surface',
    icon: 'horizontal_rule',
  },
} as const

export function KpiCard({ title, value, subtitle, trend, icon, variant = 'default' }: KpiCardProps) {
  const config = trend ? TREND_CONFIG[trend] : TREND_CONFIG.neutral

  if (variant === 'gradient') {
    return (
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-sl-primary to-sl-primary-container p-8 shadow-[0_12px_32px_rgba(25,28,31,0.04)]">
        <p className="font-label text-xs font-bold uppercase tracking-widest text-white/80">
          {title}
        </p>
        <p className="mt-3 font-headline text-4xl font-black tracking-tighter text-white">
          {value}
        </p>
        {subtitle && (
          <p className="mt-2 text-sm text-white/70">{subtitle}</p>
        )}
        {icon && (
          <span className="material-symbols-outlined filled absolute -right-8 -bottom-8 text-[120px] text-white/20">
            {icon}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-sl-surface-lowest p-8 shadow-[0_12px_32px_rgba(25,28,31,0.04)]">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.accent}`} />

      <div className="flex items-start justify-between">
        <p className="font-label text-xs font-bold uppercase tracking-widest text-sl-on-surface-variant">
          {title}
        </p>
        {icon && (
          <span className="material-symbols-outlined text-sl-on-surface-variant/60 text-[20px]">
            {icon}
          </span>
        )}
      </div>

      <p className={`mt-3 font-headline text-4xl font-black tracking-tighter ${config.text}`}>
        {value}
      </p>

      {subtitle && (
        <div className="mt-2 flex items-center gap-1">
          {trend && trend !== 'neutral' && (
            <span className={`material-symbols-outlined text-[14px] ${config.text}`}>
              {config.icon}
            </span>
          )}
          <p className={`font-body text-xs font-medium ${config.text}`}>
            {subtitle}
          </p>
        </div>
      )}
    </div>
  )
}
