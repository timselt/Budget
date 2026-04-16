interface ChartCardProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function ChartCard({ title, children, className = '' }: ChartCardProps) {
  return (
    <div
      className={`rounded-xl bg-sl-surface-lowest p-6 shadow-[var(--sl-shadow-ambient)] transition-shadow hover:shadow-[var(--sl-shadow-hover)] ${className}`}
    >
      <h3 className="-ml-2 mb-4 font-display text-base font-semibold text-sl-on-surface">
        {title}
      </h3>
      {children}
    </div>
  )
}
