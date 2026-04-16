export function ConsolidationPage() {
  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-extrabold tracking-[-0.02em] text-sl-on-surface">
            Konsolidasyon
          </h1>
          <p className="mt-2 max-w-2xl font-body text-sm text-sl-on-surface-variant">
            Tur Assist Grubu — şirket içi eliminasyonlar ve konsolide mali tablo.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-md bg-gradient-to-br from-sl-primary to-sl-primary-container px-4 py-2 font-body text-sm font-medium text-white shadow-[0_4px_12px_rgba(181,3,3,0.15)] transition-all duration-200 hover:shadow-[0_8px_20px_rgba(181,3,3,0.25)] hover:brightness-110 active:scale-[0.97]">
          <span className="material-symbols-outlined text-[18px]">hub</span>
          Konsolidasyonu Çalıştır
        </button>
      </header>

      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-sl-surface-lowest p-6 shadow-[var(--sl-shadow-ambient)]">
          <p className="font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Şirket Sayısı</p>
          <p className="mt-2 font-headline text-2xl font-black tracking-tighter">6</p>
          <p className="mt-1 text-xs text-sl-on-surface-variant">Aktif konsolidasyon kapsamı</p>
        </div>
        <div className="rounded-xl bg-sl-surface-lowest p-6 shadow-[var(--sl-shadow-ambient)]">
          <p className="font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Eliminasyon Kayıtları</p>
          <p className="mt-2 font-headline text-2xl font-black tracking-tighter">142</p>
          <p className="mt-1 text-xs font-bold text-sl-tertiary">Nisan 2026</p>
        </div>
        <div className="rounded-xl bg-sl-surface-lowest p-6 shadow-[var(--sl-shadow-ambient)]">
          <p className="font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Intercompany Fark</p>
          <p className="mt-2 font-headline text-2xl font-black tracking-tighter text-sl-success">0,3M</p>
          <p className="mt-1 text-xs font-bold text-sl-success">Tolerans içinde</p>
        </div>
        <div className="rounded-xl bg-sl-surface-lowest p-6 shadow-[var(--sl-shadow-ambient)]">
          <p className="font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Son Kapanış</p>
          <p className="mt-2 font-headline text-sm font-bold">31 Mart 2026</p>
          <p className="mt-1 text-xs text-sl-on-surface-variant">Onaylandı</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl bg-sl-surface-lowest shadow-[var(--sl-shadow-sm)]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-sl-surface-container-low">
              <th className="sticky top-0 px-4 py-3 text-left font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Şirket</th>
              <th className="sticky top-0 px-4 py-3 text-right font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Solo Gelir (M)</th>
              <th className="sticky top-0 px-4 py-3 text-right font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Solo EBITDA (M)</th>
              <th className="sticky top-0 px-4 py-3 text-right font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Eliminasyon (M)</th>
              <th className="sticky top-0 px-4 py-3 text-right font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Konsolide Katkı (M)</th>
              <th className="sticky top-0 px-4 py-3 text-left font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Durum</th>
            </tr>
          </thead>
          <tbody className="text-[0.8rem]">
            {CONSOLIDATION_DATA.map((row) => (
              <tr key={row.company} className={`transition-colors ${row.isTotal ? 'bg-sl-inverse-surface text-sl-inverse-on-surface' : 'hover:bg-sl-surface'}`}>
                <td className={`px-4 py-2.5 font-bold ${row.isTotal ? '' : 'text-sl-on-surface'}`}>{row.company}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{row.revenue}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{row.ebitda}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{row.elimination}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-bold">{row.consolidated}</td>
                <td className="px-4 py-2.5">{row.status && <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold ${row.statusClass}`}>{row.status}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const CONSOLIDATION_DATA = [
  { company: 'Tur Assist A.Ş.', revenue: '1.456,0', ebitda: '248,5', elimination: '-42,1', consolidated: '206,4', status: 'Hazır', statusClass: 'bg-sl-success-container text-sl-success', isTotal: false },
  { company: 'OtoKonfor', revenue: '384,2', ebitda: '58,1', elimination: '-18,3', consolidated: '39,8', status: 'Hazır', statusClass: 'bg-sl-success-container text-sl-success', isTotal: false },
  { company: 'TUR Medical', revenue: '214,6', ebitda: '32,4', elimination: '-8,2', consolidated: '24,2', status: 'Hazır', statusClass: 'bg-sl-success-container text-sl-success', isTotal: false },
  { company: 'KonutKonfor', revenue: '142,8', ebitda: '18,7', elimination: '-3,1', consolidated: '15,6', status: 'Bekleniyor', statusClass: 'bg-sl-warning-container text-sl-warning', isTotal: false },
  { company: 'SigortaAcentesi.com', revenue: '68,4', ebitda: '14,2', elimination: '-2,1', consolidated: '12,1', status: 'Hazır', statusClass: 'bg-sl-success-container text-sl-success', isTotal: false },
  { company: 'RS Otomotiv', revenue: '298,5', ebitda: '38,9', elimination: '-24,8', consolidated: '14,1', status: 'Hazır', statusClass: 'bg-sl-success-container text-sl-success', isTotal: false },
  { company: 'GRUP KONSOLİDE', revenue: '2.564,5', ebitda: '410,8', elimination: '-98,6', consolidated: '312,2', status: '', statusClass: '', isTotal: true },
] as const
