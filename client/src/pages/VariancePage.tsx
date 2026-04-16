import '../lib/chart-config'
import { WaterfallChart } from '../components/variance/WaterfallChart'

interface SegmentRow {
  segment: string
  plan: string
  actual: string
  variance: string
  variancePct: string
  direction: 'good' | 'bad'
  driver: string
  owner: string
}

const SEGMENTS: readonly SegmentRow[] = [
  {
    segment: 'Oto Asistans',
    plan: '396,7',
    actual: '418,2',
    variance: '+21,5',
    variancePct: '+5,4%',
    direction: 'good',
    driver: 'Sigortacı portföy büyümesi',
    owner: 'A. Çelik',
  },
  {
    segment: 'Sağlık Asistans',
    plan: '161,8',
    actual: '152,4',
    variance: '-9,4',
    variancePct: '-5,8%',
    direction: 'bad',
    driver: '2 kontrat yenileme gecikti',
    owner: 'M. Yılmaz',
  },
  {
    segment: 'Konut Asistans',
    plan: '115,4',
    actual: '139,6',
    variance: '+24,2',
    variancePct: '+21,0%',
    direction: 'good',
    driver: 'KonutKonfor kampanya etkisi',
    owner: 'S. Özkan',
  },
  {
    segment: 'Warranty',
    plan: '74,5',
    actual: '80,3',
    variance: '+5,8',
    variancePct: '+7,8%',
    direction: 'good',
    driver: 'Yeni OEM kontrat',
    owner: 'B. Demir',
  },
]

export function VariancePage() {
  return (
    <section>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-on-surface">
            Sapma Analizi
          </h2>
          <p className="text-sm text-on-surface-variant mt-2 max-w-2xl">
            Plan − Gerçekleşen × Segment × Ay. Waterfall + sürücü ayrıştırması.
          </p>
        </div>
        <div className="flex gap-3">
          <select className="select">
            <option>Dönem: YTD (Oca-Nis)</option>
            <option>Aylık</option>
            <option>Çeyreklik</option>
          </select>
          <button type="button" className="btn-primary">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              picture_as_pdf
            </span>
            Varyans Raporu
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card relative">
          <div className="ribbon-tertiary" />
          <span className="label-sm">Gelir Sapması</span>
          <p className="text-2xl font-black num mt-2 text-tertiary">+42,1M</p>
          <p className="text-xs font-bold mt-1">+%5,9 vs Plan</p>
        </div>
        <div className="card relative">
          <div className="ribbon-warning" />
          <span className="label-sm">Hasar Sapması</span>
          <p className="text-2xl font-black num mt-2 text-warning">+38,7M</p>
          <p className="text-xs font-bold mt-1">+%8,2 vs Plan (olumsuz)</p>
        </div>
        <div className="card relative">
          <div className="ribbon-success" />
          <span className="label-sm">Teknik Marj Sapması</span>
          <p className="text-2xl font-black num mt-2 text-success">+3,4M</p>
          <p className="text-xs font-bold mt-1">+%1,1 vs Plan</p>
        </div>
        <div className="card relative">
          <div className="ribbon-primary" />
          <span className="label-sm">EBITDA Sapması</span>
          <p className="text-2xl font-black num mt-2 text-primary">+5,8M</p>
          <p className="text-xs font-bold mt-1">+%4,7 vs Plan</p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-6 pb-3 flex justify-between items-center">
          <h3 className="text-lg font-bold tracking-tight">Segment Bazlı Sapma</h3>
          <span className="chip chip-neutral">YTD Nisan 2026</span>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Segment</th>
              <th className="text-right">Plan (M)</th>
              <th className="text-right">Actual (M)</th>
              <th className="text-right">Sapma (M)</th>
              <th className="text-right">Sapma %</th>
              <th>Ana Sürücü</th>
              <th>Sorumlu</th>
            </tr>
          </thead>
          <tbody>
            {SEGMENTS.map((s) => (
              <tr key={s.segment}>
                <td className="font-bold">{s.segment}</td>
                <td className="text-right num">{s.plan}</td>
                <td className="text-right num">{s.actual}</td>
                <td className={`text-right num var-${s.direction}`}>{s.variance}</td>
                <td className={`text-right num var-${s.direction}`}>{s.variancePct}</td>
                <td className="text-xs">{s.driver}</td>
                <td className="text-xs">{s.owner}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td>TOPLAM GELİR</td>
              <td className="text-right num">748,4</td>
              <td className="text-right num">790,5</td>
              <td className="text-right num">+42,1</td>
              <td className="text-right num">+5,6%</td>
              <td />
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-6">
        <div className="card">
          <h3 className="text-base font-bold tracking-tight mb-4">EBITDA Waterfall (YTD)</h3>
          <div style={{ height: 260 }}>
            <WaterfallChart />
          </div>
        </div>
        <div className="card">
          <h3 className="text-base font-bold tracking-tight mb-4">Yorum &amp; Aksiyon</h3>
          <div className="space-y-3 text-sm">
            <div className="relative bg-surface-container-low rounded-lg p-4 pl-5">
              <div className="ribbon-tertiary" />
              <p className="font-bold">Oto gelirlerindeki +%5,4 sapma sürdürülebilir mi?</p>
              <p className="text-xs text-on-surface-variant mt-1">
                → M. Yılmaz, CFO ofisine 15 Mayıs'a kadar trend teyidi gönderecek.
              </p>
            </div>
            <div className="relative bg-surface-container-low rounded-lg p-4 pl-5">
              <div className="ribbon-warning" />
              <p className="font-bold">Sağlık gelir kaybı kontrat yenileme riski</p>
              <p className="text-xs text-on-surface-variant mt-1">
                → Mayıs sonuna kadar re-negosiasyon; risk senaryosu 45M TL.
              </p>
            </div>
            <div className="relative bg-surface-container-low rounded-lg p-4 pl-5">
              <div className="ribbon-primary" />
              <p className="font-bold">Hasar sapmasında ikame araç başlıca kalem</p>
              <p className="text-xs text-on-surface-variant mt-1">
                → RS Otomotiv filo kapasitesi artırılacak, maliyet optimizasyonu.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
