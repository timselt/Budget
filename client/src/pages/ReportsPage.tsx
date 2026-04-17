interface ReportCard {
  icon: string
  title: string
  description: string
  tags: readonly { label: string; variant?: 'neutral' | 'info' }[]
  accent: 'primary' | 'tertiary'
}

const REPORTS: readonly ReportCard[] = [
  {
    icon: 'slideshow',
    title: 'Yönetim Kurulu Paketi',
    description: '12 slayt • EBITDA köprüsü • Segment P&L • Stratejik girişimler',
    tags: [{ label: 'PPTX' }, { label: 'Aylık' }],
    accent: 'primary',
  },
  {
    icon: 'summarize',
    title: 'CFO Paketi',
    description: 'Detaylı P&L • Varyans analizi • Cash flow • KPI scorecard',
    tags: [{ label: 'XLSX + PDF' }, { label: 'Haftalık' }],
    accent: 'tertiary',
  },
  {
    icon: 'groups',
    title: 'Departman Raporu',
    description: 'Kendi segmentini ve giderini içeren filtreli görünüm',
    tags: [{ label: 'PDF' }, { label: 'Günlük' }],
    accent: 'tertiary',
  },
  {
    icon: 'policy',
    title: 'BDDK / SPK Şablonu',
    description: 'Solvency, yükümlülük karşılama, teknik karşılıklar',
    tags: [{ label: 'XLSX' }, { label: 'Çeyreklik' }],
    accent: 'primary',
  },
  {
    icon: 'handshake',
    title: 'Sigorta Şirketi Raporu',
    description: 'SLA, dosya istatistiği, loss ratio, brand performansı',
    tags: [{ label: 'PDF + Excel' }, { label: 'Aylık' }],
    accent: 'tertiary',
  },
  {
    icon: 'tune',
    title: 'Özel Rapor Oluştur',
    description: 'Sürükle-bırak rapor builder; boyut × metrik × zaman',
    tags: [{ label: 'Ad-hoc', variant: 'info' }],
    accent: 'primary',
  },
]

export function ReportsPage() {
  return (
    <section>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-[#002366]">Raporlar</h2>
          <p className="text-sm text-on-surface-variant mt-2 max-w-2xl">
            Yönetim Kurulu, CFO, Departman ve BDDK/SPK formatlı standart raporlar.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {REPORTS.map((r) => (
          <button
            key={r.title}
            type="button"
            className="card hover:shadow-lg transition-all cursor-pointer text-left"
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${
                r.accent === 'primary' ? 'bg-primary/10 text-primary' : 'bg-tertiary/10 text-tertiary'
              }`}
            >
              <span className="material-symbols-outlined">{r.icon}</span>
            </div>
            <h3 className="font-bold text-on-surface">{r.title}</h3>
            <p className="text-xs text-on-surface-variant mt-2">{r.description}</p>
            <div className="flex items-center gap-2 mt-4">
              {r.tags.map((t) => (
                <span key={t.label} className={`chip chip-${t.variant ?? 'neutral'}`}>
                  {t.label}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
