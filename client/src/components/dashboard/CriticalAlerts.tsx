type Severity = 'high' | 'medium' | 'info' | 'positive'

interface Alert {
  title: string
  description: string
  severity: Severity
}

const SEVERITY_STYLES: Record<Severity, { ribbon: string; badge: string; label: string }> = {
  high: { ribbon: 'bg-sl-primary', badge: 'bg-sl-primary/10 text-sl-primary', label: 'YÜKSEK' },
  medium: { ribbon: 'bg-sl-warning', badge: 'bg-sl-warning-container text-sl-warning', label: 'ORTA' },
  info: { ribbon: 'bg-sl-tertiary', badge: 'bg-sl-tertiary/10 text-sl-tertiary', label: 'BİLGİ' },
  positive: { ribbon: 'bg-sl-success', badge: 'bg-sl-success-container text-sl-success', label: 'POZİTİF' },
}

const ALERTS: Alert[] = [
  { title: 'Oto hasar dosya maliyeti +9% Q1', description: 'Parça fiyat enflasyonu etkisi — bütçe revizyonu gerekebilir', severity: 'high' },
  { title: 'Sağlık geliri plana göre -6%', description: 'Yeni sözleşme gecikmeleri nedeniyle sapmalar izleniyor', severity: 'medium' },
  { title: 'Konut dosya adedi +21%', description: 'Yeni banka ortaklığı etkisi — kapasite planlaması kontrol edilmeli', severity: 'info' },
  { title: 'EBITDA Q1 hedefin +3% üstünde', description: 'Operasyonel verimlilik iyileşmesi devam ediyor', severity: 'positive' },
]

export function CriticalAlerts() {
  return (
    <div className="rounded-xl bg-sl-surface-lowest p-6 shadow-[var(--sl-shadow-ambient)]">
      <h3 className="-ml-2 mb-5 font-headline text-lg font-bold tracking-tight text-sl-on-surface">
        Kritik Uyarılar
      </h3>
      <div className="flex flex-col gap-3">
        {ALERTS.map((alert) => {
          const style = SEVERITY_STYLES[alert.severity]
          return (
            <div key={alert.title} className="group relative overflow-hidden rounded-lg bg-sl-surface-container-low p-4 pl-6 transition-colors hover:bg-sl-surface-container">
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.ribbon}`} />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-sl-on-surface">{alert.title}</p>
                  <p className="mt-1 text-xs text-sl-on-surface-variant">{alert.description}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-bold ${style.badge}`}>
                  {style.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
