const SERVICE_LINES = [
  { name: 'Oto Asistans', revenue: '1.190,2M', percent: 53, icon: 'directions_car', color: 'bg-sl-primary' },
  { name: 'Sağlık Asistans', revenue: '485,4M', percent: 22, icon: 'health_and_safety', color: 'bg-sl-tertiary' },
  { name: 'Konut Asistans', revenue: '346,1M', percent: 15, icon: 'home', color: 'bg-sl-secondary' },
  { name: 'Warranty & SGK Teşvik', revenue: '223,5M', percent: 10, icon: 'shield', color: 'bg-sl-on-surface-variant' },
] as const

export function ServiceLinePerformance() {
  return (
    <div className="rounded-xl bg-sl-surface-lowest p-6 shadow-[var(--sl-shadow-ambient)]">
      <h3 className="-ml-2 mb-5 font-headline text-lg font-bold tracking-tight text-sl-on-surface">
        Hizmet Hattı Performansı
      </h3>
      <div className="flex flex-col gap-4">
        {SERVICE_LINES.map((line) => (
          <div key={line.name} className="group flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sl-surface-container">
              <span className="material-symbols-outlined text-[20px] text-sl-on-surface-variant">{line.icon}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-bold text-sl-on-surface">{line.name}</p>
                <p className="font-headline text-sm font-black tabular-nums text-sl-on-surface">{line.revenue}</p>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sl-surface-container-high">
                  <div
                    className={`h-full rounded-full ${line.color} transition-all duration-500`}
                    style={{ width: `${line.percent}%` }}
                  />
                </div>
                <span className="w-8 text-right font-label text-[0.65rem] font-bold text-sl-on-surface-variant">
                  %{line.percent}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
