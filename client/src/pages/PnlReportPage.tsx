type PnlBandRow = { kind: 'band-revenue' | 'band-claim' | 'band-opex' | 'band-fin'; label: string }
type PnlValueRow = {
  kind:
    | 'revenue'
    | 'claim'
    | 'opex'
    | 'fin'
    | 'subtotal'
    | 'total-revenue'
    | 'total-claim'
    | 'total-margin'
    | 'total-opex'
    | 'total-tek-kz'
    | 'total-net-kz'
    | 'total-ebitda'
  label: string
  values: string[]
  negative?: boolean
  positive?: boolean
}

const PNL_ROWS: Array<PnlBandRow | PnlValueRow> = [
  { kind: 'band-revenue', label: 'GELIR' },
  { kind: 'revenue', label: 'Kasko Asistans', values: ['68.200', '71.400', '74.800', '76.200', '78.100', '79.500', '81.300', '82.800', '84.200', '86.700', '89.100', '91.600', '963.900'] },
  { kind: 'revenue', label: 'Trafik Asistans', values: ['42.100', '44.200', '46.800', '47.500', '48.900', '49.800', '51.200', '52.400', '53.600', '55.400', '57.100', '58.800', '607.800'] },
  { kind: 'subtotal', label: 'Brut Gelir', values: ['170.000', '177.800', '187.200', '190.400', '195.400', '199.100', '204.000', '208.200', '212.300', '218.900', '225.100', '231.600', '2.420.000'] },
  { kind: 'revenue', label: 'IADE (-)', values: ['(820)', '(860)', '(910)', '(920)', '(940)', '(960)', '(980)', '(1.000)', '(1.020)', '(1.050)', '(1.080)', '(1.110)', '(11.650)'], negative: true },
  { kind: 'total-revenue', label: 'NET GELIR', values: ['161.780', '169.440', '178.590', '181.680', '186.560', '190.140', '194.920', '199.100', '203.180', '209.750', '215.920', '222.290', '2.313.350'] },
  { kind: 'band-claim', label: 'HASAR' },
  { kind: 'claim', label: 'Odenen Hasar', values: ['82.400', '86.200', '91.100', '92.800', '95.200', '97.000', '99.400', '101.400', '103.500', '106.800', '109.900', '113.000', '1.178.700'] },
  { kind: 'claim', label: 'Muallak Kaydi (Donem)', values: ['3.200', '3.350', '3.500', '3.550', '3.650', '3.700', '3.800', '3.870', '3.950', '4.080', '4.200', '4.320', '45.170'] },
  { kind: 'claim', label: 'Rucu/T.Katilim (-)', values: ['(2.100)', '(2.200)', '(2.300)', '(2.350)', '(2.400)', '(2.450)', '(2.500)', '(2.550)', '(2.600)', '(2.680)', '(2.750)', '(2.820)', '(29.700)'], positive: true },
  { kind: 'total-claim', label: 'NET HASAR', values: ['84.280', '88.160', '93.150', '94.870', '97.340', '99.160', '101.630', '103.670', '105.820', '109.200', '112.380', '115.560', '1.205.220'] },
  { kind: 'total-margin', label: 'TEKNIK MARJ', values: ['77.500', '81.280', '85.440', '86.810', '89.220', '90.980', '93.290', '95.430', '97.360', '100.550', '103.540', '106.730', '1.108.130'] },
  { kind: 'band-opex', label: 'GENEL GIDERLER' },
  { kind: 'opex', label: 'Personel', values: ['14.200', '14.300', '14.400', '14.500', '14.600', '14.700', '14.800', '14.900', '15.000', '15.100', '15.200', '15.300', '177.000'] },
  { kind: 'opex', label: 'BT & Altyapi', values: ['4.800', '4.850', '4.900', '4.950', '5.000', '5.050', '5.100', '5.150', '5.200', '5.250', '5.300', '5.350', '60.900'] },
  { kind: 'total-opex', label: 'Toplam Giderler', values: ['28.100', '28.420', '28.750', '29.010', '29.260', '29.520', '29.780', '30.030', '30.300', '30.630', '30.960', '31.290', '356.050'] },
  { kind: 'total-tek-kz', label: 'TEKNIK K/Z', values: ['49.400', '52.860', '56.690', '57.800', '59.960', '61.460', '63.510', '65.400', '67.060', '69.920', '72.580', '75.440', '752.080'] },
  { kind: 'band-fin', label: 'FINANSAL & OLAGANDISI' },
  { kind: 'fin', label: 'Finansal Gelir', values: ['1.200', '1.250', '1.300', '1.320', '1.350', '1.380', '1.400', '1.430', '1.450', '1.490', '1.530', '1.560', '16.660'], positive: true },
  { kind: 'fin', label: 'Finansman Gideri (-)', values: ['(3.200)', '(3.250)', '(3.300)', '(3.330)', '(3.360)', '(3.400)', '(3.430)', '(3.460)', '(3.500)', '(3.550)', '(3.600)', '(3.650)', '(41.030)'], negative: true },
  { kind: 'total-net-kz', label: 'NET K/Z', values: ['45.150', '48.600', '52.420', '53.515', '55.670', '57.155', '59.190', '61.075', '62.710', '65.550', '68.190', '71.020', '700.245'] },
  { kind: 'fin', label: 'Amortisman (+)', values: ['2.400', '2.400', '2.400', '2.400', '2.400', '2.400', '2.400', '2.400', '2.400', '2.400', '2.400', '2.400', '28.800'], positive: true },
  { kind: 'fin', label: 'Yatirim Gideri (-)', values: ['(900)', '(900)', '(900)', '(900)', '(900)', '(900)', '(900)', '(900)', '(900)', '(900)', '(900)', '(900)', '(10.800)'], negative: true },
  { kind: 'total-ebitda', label: 'EBITDA', values: ['46.650', '50.100', '53.920', '55.015', '57.170', '58.655', '60.690', '62.575', '64.210', '67.050', '69.690', '72.520', '718.245'] },
]

const MONTHS = ['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara', 'FY 2026']

export function PnlReportPage() {
  return (
    <section>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-on-surface">
            P&L Raporu — Butce 2026
          </h2>
        </div>
        <div className="flex gap-3">
          <select className="select"><option>Tur Assist (Ana)</option></select>
          <select className="select"><option>Butce 2026 v1.2</option></select>
          <button type="button" className="btn-secondary">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              download
            </span>
            Excel
          </button>
          <button type="button" className="btn-primary">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              picture_as_pdf
            </span>
            YK PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        <PnlKpi title="Net Gelir" value="2.432M" note="▲ %18,2 vs 2025" noteClass="text-success" />
        <PnlKpi title="Teknik Marj" value="612M" note="T.M. Rasyosu %25,2" />
        <PnlKpi title="Hasar (LR)" value="%58,3" note="▲ 1,8pp vs hedef" noteClass="text-error" />
        <PnlKpi title="Gider Rasyosu" value="%14,6" note="▼ 0,9pp vs 2025" noteClass="text-success" />
        <div className="card p-4 bg-primary-fixed">
          <div className="text-xs text-primary font-semibold">EBITDA</div>
          <div className="text-2xl font-extrabold tracking-display mt-1 text-primary">378M</div>
          <div className="text-xs text-primary mt-1 font-semibold">%15,5 EBITDA marji</div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden mb-6">
        <div className="px-6 py-4 flex justify-between items-center bg-surface-container-low">
          <h3 className="text-lg font-bold">P&L Zinciri — Aylik Bazda</h3>
          <div className="flex gap-2 text-xs">
            <span className="chip chip-neutral">Bin TL</span>
            <span className="chip chip-info">Konsolide</span>
          </div>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th className="text-left">P&L Kalemi</th>
              {MONTHS.map((month) => (
                <th key={month} className="num">{month}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PNL_ROWS.map((row) => {
              if (!('values' in row)) {
                return (
                  <tr key={row.label}>
                    <td className={`pnl-${row.kind}`} colSpan={14}>
                      {row.label}
                    </td>
                  </tr>
                )
              }

              return (
                <tr key={row.label} className={`pnl-row-${row.kind}`}>
                  <td className="pl-4">{row.label}</td>
                  {row.values.map((value, index) => (
                    <td
                      key={`${row.label}-${index}`}
                      className={`num ${index === row.values.length - 1 ? 'pnl-fy' : ''} ${row.negative ? 'pnl-neg' : ''} ${row.positive ? 'pnl-pos' : ''}`}
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="text-xs text-on-surface-variant font-semibold mb-2">VERI KAYNAGI</div>
          <div className="text-sm">
            <InfoRow left="Gelir Butce" right="GELIR_BUTCE sheet" />
            <InfoRow left="Hasar Butce" right="HASAR_BUTCE sheet" />
            <InfoRow left="Muallak" right="TEKNIK_REZERV sheet" />
            <InfoRow left="Finansal/Holding/EBITDA" right="PNL_KAPSAM sheet" />
            <InfoRow left="Gerceklesen" right="ERP (Logo/Mikro)" last />
          </div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-on-surface-variant font-semibold mb-2">HESAPLAMA KURALLARI</div>
          <div className="text-sm space-y-2">
            <div><b>Net Gelir</b> = Brut Gelir − Iade − IC Elimination</div>
            <div><b>Net Hasar</b> = Odenen + Muallak Farki − Rucu</div>
            <div><b>Muallak Farki</b> = Kapanis[m] − Kapanis[m−1]</div>
            <div><b>Teknik Marj</b> = Net Gelir − Net Hasar</div>
            <div><b>Teknik K/Z</b> = Teknik Marj − Giderler</div>
            <div><b>EBITDA</b> = Net K/Z + Amortisman − Yatirim Gideri</div>
          </div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-on-surface-variant font-semibold mb-2">VERSIYON & ONAY</div>
          <div className="text-sm space-y-2">
            <div className="flex justify-between"><span>Versiyon</span><span className="chip chip-info">v1.2</span></div>
            <div className="flex justify-between"><span>Durum</span><span className="chip chip-success">Onayli</span></div>
            <div className="flex justify-between"><span>Onaylayan</span><span className="font-medium">T. Turan (CEO)</span></div>
            <div className="flex justify-between"><span>Onay Tarihi</span><span className="font-mono text-xs">12.04.2026</span></div>
            <div className="flex justify-between"><span>Sonraki Revizyon</span><span className="font-mono text-xs">Q2 Forecast</span></div>
          </div>
        </div>
      </div>
    </section>
  )
}

function PnlKpi({
  title,
  value,
  note,
  noteClass = 'text-on-surface-variant',
}: {
  title: string
  value: string
  note: string
  noteClass?: string
}) {
  return (
    <div className="card p-4">
      <div className="text-xs text-on-surface-variant font-medium">{title}</div>
      <div className="text-2xl font-extrabold tracking-display mt-1">{value}</div>
      <div className={`text-xs mt-1 font-semibold ${noteClass}`}>{note}</div>
    </div>
  )
}

function InfoRow({ left, right, last = false }: { left: string; right: string; last?: boolean }) {
  return (
    <div className={`flex justify-between py-1 ${last ? '' : 'border-b border-surface-container'}`}>
      <span>{left}</span>
      <span className="font-mono text-xs">{right}</span>
    </div>
  )
}
