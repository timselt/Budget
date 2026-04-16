interface ChartCardProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function ChartCard({ title, children, className = '' }: ChartCardProps) {
  return (
    <div
      className={`rounded-lg border border-sl-outline-variant/15 bg-sl-surface-lowest p-5 ${className}`}
    >
      <h3 className="mb-4 font-display text-base font-semibold text-sl-on-surface">
        {title}
      </h3>
      {children}
    </div>
  )
}
