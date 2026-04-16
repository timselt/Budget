export function ForecastPage() {
  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-extrabold tracking-[-0.02em] text-sl-on-surface">
            Rolling Forecast
          </h1>
          <p className="mt-2 max-w-2xl font-body text-sm text-sl-on-surface-variant">
            Aylık güncellenen 12-ay forecast. Plan / Gerçekleşen / Tahmin katmanlı görünüm.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select className="h-9 rounded-lg bg-sl-surface-container-high px-3 pr-8 font-body text-sm font-medium text-sl-on-surface outline-none transition-all focus:bg-sl-surface-lowest focus:ring-2 focus:ring-sl-primary/40">
            <option>Yöntem: Moving Average</option>
            <option>Yöntem: Exponential Smoothing</option>
            <option>Yöntem: Linear Regression</option>
          </select>
          <button className="flex items-center gap-2 rounded-md bg-gradient-to-br from-sl-primary to-sl-primary-container px-4 py-2 font-body text-sm font-medium text-white shadow-[0_4px_12px_rgba(181,3,3,0.15)] transition-all duration-200 hover:shadow-[0_8px_20px_rgba(181,3,3,0.25)] hover:brightness-110 active:scale-[0.97]">
            <span className="material-symbols-outlined text-[18px]">calculate</span>
            Yeniden Hesapla
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-sl-surface-lowest p-5 shadow-[var(--sl-shadow-ambient)]">
          <p className="font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Yıl Sonu Gelir Tahmini</p>
          <p className="mt-2 font-headline text-2xl font-black tracking-tighter">2.298,5M</p>
          <p className="mt-1 text-xs font-bold text-sl-success">+2,4% vs Plan</p>
        </div>
        <div className="rounded-xl bg-sl-surface-lowest p-5 shadow-[var(--sl-shadow-ambient)]">
          <p className="font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Yıl Sonu EBITDA Tahmini</p>
          <p className="mt-2 font-headline text-2xl font-black tracking-tighter">378,1M</p>
          <p className="mt-1 text-xs font-bold text-sl-tertiary">+18M vs Plan</p>
        </div>
        <div className="rounded-xl bg-sl-surface-lowest p-5 shadow-[var(--sl-shadow-ambient)]">
          <p className="font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Güven Aralığı</p>
          <p className="mt-2 font-headline text-2xl font-black tracking-tighter">±%3,2</p>
          <p className="mt-1 text-xs text-sl-on-surface-variant">%90 güven düzeyi</p>
        </div>
      </div>

      {/* Plan vs Actual vs Forecast chart placeholder */}
      <div className="mb-6 rounded-xl bg-sl-surface-lowest p-6 shadow-[var(--sl-shadow-ambient)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="-ml-2 font-headline text-base font-bold tracking-tight text-sl-on-surface">
            Plan vs Gerçekleşen vs Forecast
          </h3>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-4 rounded-sm bg-sl-primary/40" />
              Plan
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-4 rounded-sm bg-sl-tertiary" />
              Gerçekleşen
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-4 rounded-sm border-2 border-dashed border-sl-primary" />
              Forecast
            </span>
          </div>
        </div>
        <div className="flex h-64 items-center justify-center text-sl-on-surface-variant">
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-4xl text-sl-on-surface-variant/40">show_chart</span>
            <p className="text-sm">Grafik — backend entegrasyonu sonrası aktif olacak</p>
          </div>
        </div>
      </div>

      {/* Senaryo + Hassasiyet */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Senaryo Analizi */}
        <div className="rounded-xl bg-sl-surface-lowest p-6 shadow-[var(--sl-shadow-ambient)]">
          <h3 className="-ml-2 mb-5 font-headline text-base font-bold tracking-tight text-sl-on-surface">
            Senaryo Analizi
          </h3>
          <div className="flex flex-col gap-4">
            {SCENARIOS.map((s) => (
              <div key={s.label} className="group relative overflow-hidden rounded-lg bg-sl-surface-container-low p-4 pl-6">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.ribbon}`} />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-sl-on-surface">{s.label}</p>
                    <p className="mt-0.5 text-xs text-sl-on-surface-variant">{s.description}</p>
                  </div>
                  <p className="font-headline text-lg font-black tabular-nums tracking-tighter text-sl-on-surface">{s.ebitda}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hassasiyet Analizi */}
        <div className="rounded-xl bg-sl-surface-lowest p-6 shadow-[var(--sl-shadow-ambient)]">
          <h3 className="-ml-2 mb-5 font-headline text-base font-bold tracking-tight text-sl-on-surface">
            Hassasiyet Analizi
          </h3>
          <div className="flex flex-col gap-4">
            {SENSITIVITIES.map((s) => (
              <div key={s.driver} className="flex items-center gap-4">
                <p className="w-36 shrink-0 text-sm text-sl-on-surface">{s.driver}</p>
                <div className="flex-1">
                  <div className="flex h-6 items-center">
                    <div className="relative h-2 w-full rounded-full bg-sl-surface-container-high">
                      <div
                        className="absolute top-0 h-full rounded-full bg-sl-primary/30"
                        style={{ left: `${50 - s.impactPercent / 2}%`, width: `${s.impactPercent}%` }}
                      />
                      <div className="absolute left-1/2 top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-sl-on-surface-variant/40" />
                    </div>
                  </div>
                </div>
                <p className="w-14 shrink-0 text-right text-xs font-bold tabular-nums text-sl-on-surface">±{s.impact}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const SCENARIOS = [
  { label: 'Optimistic', description: 'Büyüme hızlanır, LR iyileşir', ebitda: '415M', ribbon: 'bg-sl-success' },
  { label: 'Base', description: 'Mevcut trendler devam eder', ebitda: '378M', ribbon: 'bg-sl-tertiary' },
  { label: 'Conservative', description: 'Enflasyon + hasar baskısı', ebitda: '312M', ribbon: 'bg-sl-warning' },
] as const

const SENSITIVITIES = [
  { driver: 'Oto dosya maliyeti', impact: '42M', impactPercent: 40 },
  { driver: 'Gelir büyümesi', impact: '28M', impactPercent: 28 },
  { driver: 'Personel kadro', impact: '19M', impactPercent: 18 },
  { driver: 'TL/USD kuru', impact: '11M', impactPercent: 10 },
] as const
