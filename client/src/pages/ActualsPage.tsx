import { useState } from 'react'

type Tab = 'revenue' | 'claims' | 'opex' | 'personnel' | 'reconciliation'

const TABS: { key: Tab; label: string }[] = [
  { key: 'revenue', label: 'Gelirler' },
  { key: 'claims', label: 'Hasar' },
  { key: 'opex', label: 'Operasyonel Giderler' },
  { key: 'personnel', label: 'Personel' },
  { key: 'reconciliation', label: 'Mutabakat' },
]

const SAMPLE_ROWS = [
  { date: '2026-04-15', no: 'GRN-2026-04-1842', account: '600.01 - Prim Geliri', segment: 'Oto Asistans', product: 'Kasko Asistans', amount: '2.845.000', status: 'Onaylı', statusClass: 'bg-sl-success-container text-sl-success', source: 'ERP' },
  { date: '2026-04-15', no: 'GRN-2026-04-1843', account: '600.02 - Hizmet Geliri', segment: 'Sağlık Asistans', product: 'Seyahat Sağlık', amount: '1.126.500', status: 'Onaylı', statusClass: 'bg-sl-success-container text-sl-success', source: 'ERP' },
  { date: '2026-04-14', no: 'GRN-2026-04-1838', account: '600.01 - Prim Geliri', segment: 'Konut Asistans', product: 'Konut Paket', amount: '684.200', status: 'Beklemede', statusClass: 'bg-sl-warning-container text-sl-warning', source: 'Manuel' },
  { date: '2026-04-14', no: 'GRN-2026-04-1835', account: '610.01 - Hasar Gideri', segment: 'Oto Asistans', product: 'Trafik Asistans', amount: '1.456.800', status: 'Onaylı', statusClass: 'bg-sl-success-container text-sl-success', source: 'ERP' },
  { date: '2026-04-13', no: 'GRN-2026-04-1830', account: '630.01 - Personel', segment: 'Genel', product: '—', amount: '892.000', status: 'Onaylı', statusClass: 'bg-sl-success-container text-sl-success', source: 'ERP' },
] as const

export function ActualsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('revenue')

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-extrabold tracking-[-0.02em] text-sl-on-surface">
            Gerçekleşen Girişleri
          </h1>
          <p className="mt-2 max-w-2xl font-body text-sm text-sl-on-surface-variant">
            Muhasebe/ERP aktarımı + elle giriş. KKEG ayrımı ve hesap mutabakatı ekranı.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-md bg-sl-surface-container-high px-3 py-2 font-body text-sm font-medium text-sl-on-surface transition-colors hover:bg-sl-surface-container-highest">
            <span className="material-symbols-outlined text-[18px]">sync</span>
            ERP Senkronizasyon
          </button>
          <button className="flex items-center gap-2 rounded-md bg-gradient-to-br from-sl-primary to-sl-primary-container px-4 py-2 font-body text-sm font-medium text-white shadow-[0_4px_12px_rgba(181,3,3,0.15)] transition-all duration-200 hover:shadow-[0_8px_20px_rgba(181,3,3,0.25)] hover:brightness-110 active:scale-[0.97]">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Manuel Giriş
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-sl-surface-lowest p-5 shadow-[var(--sl-shadow-ambient)]">
          <p className="font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Nisan 2026 Kayıt</p>
          <p className="mt-2 font-headline text-2xl font-black tracking-tighter">186,4M</p>
          <p className="mt-1 text-xs font-bold text-sl-success">+4,2% vs Plan</p>
        </div>
        <div className="rounded-xl bg-sl-surface-lowest p-5 shadow-[var(--sl-shadow-ambient)]">
          <p className="font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Eşleşen Dosya</p>
          <p className="mt-2 font-headline text-2xl font-black tracking-tighter">94.218</p>
          <p className="mt-1 text-xs text-sl-warning font-bold">312 beklemede</p>
        </div>
        <div className="rounded-xl bg-sl-surface-lowest p-5 shadow-[var(--sl-shadow-ambient)]">
          <p className="font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Mutabakat Durumu</p>
          <p className="mt-2 font-headline text-2xl font-black tracking-tighter">%98,7</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sl-surface-container-high">
            <div className="h-full w-[98.7%] rounded-full bg-sl-success" />
          </div>
        </div>
        <div className="rounded-xl bg-sl-surface-lowest p-5 shadow-[var(--sl-shadow-ambient)]">
          <p className="font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Son Senkronizasyon</p>
          <p className="mt-2 font-headline text-sm font-bold">Bugün 14:28</p>
          <p className="mt-1 text-xs text-sl-on-surface-variant">ERP bağlantısı aktif</p>
        </div>
      </div>

      {/* Tabs */}
      <nav className="mb-6 flex gap-1 rounded-lg bg-sl-surface-container-low p-1 w-fit" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-4 py-2 font-body text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-sl-surface-lowest text-sl-on-surface shadow-[var(--sl-shadow-sm)]'
                : 'text-sl-on-surface-variant hover:text-sl-on-surface'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Data Table */}
      <div className="overflow-x-auto rounded-xl bg-sl-surface-lowest shadow-[var(--sl-shadow-sm)]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-sl-surface-container-low">
              <th className="sticky top-0 px-4 py-3 text-left font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Tarih</th>
              <th className="sticky top-0 px-4 py-3 text-left font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Kayıt No</th>
              <th className="sticky top-0 px-4 py-3 text-left font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Hesap</th>
              <th className="sticky top-0 px-4 py-3 text-left font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Segment</th>
              <th className="sticky top-0 px-4 py-3 text-left font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Ürün</th>
              <th className="sticky top-0 px-4 py-3 text-right font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Tutar (TL)</th>
              <th className="sticky top-0 px-4 py-3 text-left font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Durum</th>
              <th className="sticky top-0 px-4 py-3 text-left font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Kaynak</th>
            </tr>
          </thead>
          <tbody className="text-[0.8rem]">
            {SAMPLE_ROWS.map((row) => (
              <tr key={row.no} className="transition-colors hover:bg-sl-surface">
                <td className="px-4 py-2.5 tabular-nums text-sl-on-surface-variant">{row.date}</td>
                <td className="px-4 py-2.5 font-medium text-sl-on-surface">{row.no}</td>
                <td className="px-4 py-2.5 text-sl-on-surface">{row.account}</td>
                <td className="px-4 py-2.5 text-sl-on-surface">{row.segment}</td>
                <td className="px-4 py-2.5 text-sl-on-surface-variant">{row.product}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-bold text-sl-on-surface">{row.amount}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold ${row.statusClass}`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-sl-on-surface-variant">{row.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
