interface ChartCardProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function ChartCard({ title, children, className = '' }: ChartCardProps) {
  return (
    <div
      className={`rounded-xl border border-border bg-white p-5 shadow-sm ${className}`}
    >
      <h3 className="mb-4 text-sm font-semibold tracking-wide text-text-muted uppercase">
        {title}
      </h3>
      {children}
    </div>
  )
}
