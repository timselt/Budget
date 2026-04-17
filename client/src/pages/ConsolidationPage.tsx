interface ConsoRow {
  company: string
  soloRevenue: string
  soloEbitda: string
  elim: string
  contribution: string
  ready: boolean
}

const ROWS: readonly ConsoRow[] = [
  { company: 'Tur Assist A.Ş.',    soloRevenue: '1.456,0', soloEbitda: '248,5', elim: '-42,1', contribution: '206,4', ready: true },
  { company: 'OtoKonfor',          soloRevenue: '384,2',   soloEbitda: '58,1',  elim: '-18,3', contribution: '39,8',  ready: true },
  { company: 'TUR Medical',        soloRevenue: '214,6',   soloEbitda: '32,4',  elim: '-8,2',  contribution: '24,2',  ready: true },
  { company: 'KonutKonfor',        soloRevenue: '142,8',   soloEbitda: '18,7',  elim: '-3,1',  contribution: '15,6',  ready: false },
  { company: 'SigortaAcentesi.com', soloRevenue: '68,4',   soloEbitda: '14,2',  elim: '-2,1',  contribution: '12,1',  ready: true },
  { company: 'RS Otomotiv',        soloRevenue: '298,5',   soloEbitda: '38,9',  elim: '-24,8', contribution: '14,1',  ready: true },
]

export function ConsolidationPage() {
  return (
    <section>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-[#002366]">
            Konsolidasyon
          </h2>
          <p className="text-sm text-on-surface-variant mt-2 max-w-2xl">
            Tur Asistans Grubu — şirket içi eliminasyonlar ve konsolide mali tablo.
          </p>
        </div>
        <button type="button" className="btn-primary">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            hub
          </span>
          Konsolidasyonu Çalıştır
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card">
          <span className="label-sm">Şirket Sayısı</span>
          <p className="text-2xl font-black num mt-2">6</p>
          <p className="text-xs text-on-surface-variant mt-1">Aktif konsolidasyon kapsamı</p>
        </div>
        <div className="card">
          <span className="label-sm">Eliminasyon Kayıtları</span>
          <p className="text-2xl font-black num mt-2">142</p>
          <p className="text-xs text-tertiary font-bold mt-1">Nisan 2026</p>
        </div>
        <div className="card">
          <span className="label-sm">Intercompany Fark</span>
          <p className="text-2xl font-black num mt-2 text-success">0,3M</p>
          <p className="text-xs text-success font-bold mt-1">Tolerans içinde</p>
        </div>
        <div className="card">
          <span className="label-sm">Son Kapanış</span>
          <p className="text-sm font-bold mt-2">31 Mart 2026</p>
          <p className="text-xs text-on-surface-variant mt-1">Onaylandı</p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="tbl">
          <thead>
            <tr>
              <th>Şirket</th>
              <th className="text-right">Solo Gelir (M)</th>
              <th className="text-right">Solo EBITDA (M)</th>
              <th className="text-right">Eliminasyon (M)</th>
              <th className="text-right">Konsolide Katkı (M)</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.company}>
                <td className="font-bold">{r.company}</td>
                <td className="text-right num">{r.soloRevenue}</td>
                <td className="text-right num">{r.soloEbitda}</td>
                <td className="text-right num">{r.elim}</td>
                <td className="text-right num">{r.contribution}</td>
                <td>
                  <span className={`chip chip-${r.ready ? 'success' : 'warning'}`}>
                    {r.ready ? 'Hazır' : 'Bekleniyor'}
                  </span>
                </td>
              </tr>
            ))}
            <tr className="total-row">
              <td>GRUP KONSOLİDE</td>
              <td className="text-right num">2.564,5</td>
              <td className="text-right num">410,8</td>
              <td className="text-right num">-98,6</td>
              <td className="text-right num">312,2</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
