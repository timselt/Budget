interface PilotBannerProps {
  feature: string
  description: string
  releaseTarget?: string
}

/**
 * Pilot/demo veriyle çalışan sayfaların üstünde gösterilen kalıcı uyarı.
 * Audit Sprint 1: demo ekran üretim ekranı gibi görünmesin. Dismiss yok —
 * kullanıcı her ziyarette bağlamı yeniden hatırlasın.
 */
export function PilotBanner({
  feature,
  description,
  releaseTarget,
}: PilotBannerProps) {
  return (
    <div className="card mb-6 border-l-4 border-l-warning bg-warning/5">
      <div className="flex items-start gap-3">
        <span
          className="material-symbols-outlined text-warning"
          style={{ fontSize: 24 }}
          aria-hidden
        >
          science
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-on-surface">{feature}</h3>
            <span className="chip chip-warning text-xs">Pilot — Demo Veri</span>
          </div>
          <p className="text-sm text-on-surface-variant mt-1">{description}</p>
          {releaseTarget && (
            <p className="text-xs text-on-surface-variant mt-1">
              Hedef yayın: <strong>{releaseTarget}</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
