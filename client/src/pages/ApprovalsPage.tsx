interface PendingItem {
  ribbon: 'primary' | 'warning' | 'tertiary'
  title: string
  chip: 'error' | 'warning' | 'info'
  chipLabel: string
  meta: string
  actions?: boolean
}

const PENDING: readonly PendingItem[] = [
  {
    ribbon: 'primary',
    title: 'FY26 Bütçe v3 — Sağlık Segmenti',
    chip: 'error',
    chipLabel: 'YÜKSEK',
    meta: 'M. Yılmaz • 14 Nis 2026 • 485M TL gelir, 81M teknik marj',
    actions: true,
  },
  {
    ribbon: 'warning',
    title: 'Q2 Forecast Revizyonu',
    chip: 'warning',
    chipLabel: 'ORTA',
    meta: 'S. Öz • 12 Nis 2026 • EBITDA +18M revize',
  },
  {
    ribbon: 'tertiary',
    title: 'Konut Segmenti Sermaye Talebi',
    chip: 'info',
    chipLabel: 'BİLGİ',
    meta: 'S. Özkan • 10 Nis 2026 • KonutKonfor operasyon ek yatırım',
  },
]

interface TimelineStep {
  dotClass: string
  title: string
  titleClass?: string
  meta: string
}

const TIMELINE: readonly TimelineStep[] = [
  {
    dotClass: 'bg-success',
    title: 'Departman Müdürü',
    meta: 'M. Yılmaz • 10 Nis 14:23 • "Kontrat varsayımları güncellendi"',
  },
  {
    dotClass: 'bg-success',
    title: 'Finans Kontrol',
    meta: 'A. Koç • 11 Nis 09:15 • Gerçekleşen sapma kontrolü: tamam',
  },
  {
    dotClass: 'bg-warning animate-pulse',
    title: 'CFO Onayı (Beklemede)',
    titleClass: 'text-tertiary',
    meta: "B. Ayhan • Beklemede — 14 Nis'ten beri",
  },
  {
    dotClass: 'bg-surface-container-high',
    title: 'CEO Onayı',
    titleClass: 'text-on-surface-variant',
    meta: 'T. Turan',
  },
]

export function ApprovalsPage() {
  return (
    <section>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-on-surface">Onay Akışı</h2>
          <p className="text-sm text-on-surface-variant mt-2 max-w-2xl">
            Bütçe ve forecast versiyonlarının çok seviyeli onay sistemi (Departman → CFO → CEO →
            YK).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold tracking-tight">Bekleyen Onaylar (3)</h3>
            <span className="chip chip-warning">Aksiyon Gerekli</span>
          </div>
          <div className="space-y-4">
            {PENDING.map((p) => (
              <div
                key={p.title}
                className="relative bg-surface-container-low rounded-lg p-4 pl-5"
              >
                <div className={`ribbon-${p.ribbon}`} />
                <div className="flex items-start justify-between mb-2">
                  <p className="font-bold text-sm">{p.title}</p>
                  <span className={`chip chip-${p.chip}`}>{p.chipLabel}</span>
                </div>
                <p className="text-xs text-on-surface-variant">{p.meta}</p>
                {p.actions && (
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ padding: '.4rem .75rem', fontSize: '.75rem' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                        check
                      </span>
                      Onayla
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '.4rem .75rem', fontSize: '.75rem' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                        edit
                      </span>
                      Yorum Ekle
                    </button>
                    <button
                      type="button"
                      className="btn-tertiary"
                      style={{ padding: '.4rem .5rem', fontSize: '.75rem' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                        close
                      </span>
                      Reddet
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-base font-bold tracking-tight mb-4">Onay Akışı Görünümü</h3>
          <div className="space-y-4">
            {TIMELINE.map((t) => (
              <div key={t.title} className="relative pl-6">
                <div className="absolute left-0 top-0 bottom-0 w-px bg-surface-container-high" />
                <div
                  className={`absolute -left-1 top-1 w-2.5 h-2.5 rounded-full ${t.dotClass}`}
                />
                <p className={`text-sm font-bold ${t.titleClass ?? ''}`}>{t.title}</p>
                <p className="text-xs text-on-surface-variant">{t.meta}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
