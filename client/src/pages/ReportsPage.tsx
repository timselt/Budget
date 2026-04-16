export function ReportsPage() {
  return (
    <div>
      <header className="mb-10">
        <h1 className="font-headline text-3xl font-extrabold tracking-[-0.02em] text-sl-on-surface">
          Raporlar
        </h1>
        <p className="mt-2 max-w-2xl font-body text-sm text-sl-on-surface-variant">
          Yönetim Kurulu, CFO, Departman ve BDDK/SPK formatlı standart raporlar.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {REPORT_TYPES.map((r) => (
          <div
            key={r.title}
            className="group cursor-pointer rounded-xl bg-sl-surface-lowest p-6 shadow-[var(--sl-shadow-ambient)] transition-shadow hover:shadow-[var(--sl-shadow-hover)]"
          >
            <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${r.iconBg}`}>
              <span className={`material-symbols-outlined ${r.iconColor}`}>{r.icon}</span>
            </div>
            <h3 className="-ml-2 font-headline text-base font-bold text-sl-on-surface">{r.title}</h3>
            <p className="mt-2 text-xs text-sl-on-surface-variant">{r.description}</p>
            <div className="mt-4 flex items-center gap-2">
              {r.tags.map((t) => (
                <span key={t} className="rounded-full bg-sl-surface-container px-2.5 py-0.5 text-[0.65rem] font-bold text-sl-on-surface-variant">
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const REPORT_TYPES = [
  { title: 'Yönetim Kurulu Paketi', description: '12 slayt • EBITDA köprüsü • Segment P&L • Stratejik girişimler', icon: 'slideshow', iconBg: 'bg-sl-primary/10', iconColor: 'text-sl-primary', tags: ['PPTX', 'Aylık'] },
  { title: 'CFO Paketi', description: 'Detaylı P&L • Varyans analizi • Cash flow • KPI scorecard', icon: 'summarize', iconBg: 'bg-sl-tertiary/10', iconColor: 'text-sl-tertiary', tags: ['XLSX + PDF', 'Haftalık'] },
  { title: 'Departman Raporu', description: 'Kendi segmentini ve giderini içeren filtreli görünüm', icon: 'groups', iconBg: 'bg-sl-tertiary/10', iconColor: 'text-sl-tertiary', tags: ['PDF', 'Günlük'] },
  { title: 'BDDK / SPK Şablonu', description: 'Solvency, yükümlülük karşılama, teknik karşılıklar', icon: 'policy', iconBg: 'bg-sl-primary/10', iconColor: 'text-sl-primary', tags: ['XLSX', 'Çeyreklik'] },
  { title: 'Sigorta Şirketi Raporu', description: 'SLA, dosya istatistiği, loss ratio, brand performansı', icon: 'handshake', iconBg: 'bg-sl-tertiary/10', iconColor: 'text-sl-tertiary', tags: ['PDF + Excel', 'Aylık'] },
  { title: 'Özel Rapor Oluştur', description: 'Sürükle-bırak rapor builder; boyut × metrik × zaman', icon: 'tune', iconBg: 'bg-sl-primary/10', iconColor: 'text-sl-primary', tags: ['Ad-hoc'] },
] as const
