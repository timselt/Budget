import '../lib/chart-config'
import { ForecastChart } from '../components/forecast/ForecastChart'

interface Scenario {
  ribbon: 'success' | 'tertiary' | 'warning'
  title: string
  value: string
  valueClass: string
  description: string
}

const SCENARIOS: readonly Scenario[] = [
  {
    ribbon: 'success',
    title: 'Optimistic',
    value: '415M EBITDA',
    valueClass: 'text-success',
    description: 'Oto pazarında +%5, hasar artışı sınırlı',
  },
  {
    ribbon: 'tertiary',
    title: 'Base (Plan)',
    value: '378M EBITDA',
    valueClass: 'text-tertiary',
    description: 'Mevcut kontrat yenileme varsayımı',
  },
  {
    ribbon: 'warning',
    title: 'Conservative',
    value: '312M EBITDA',
    valueClass: 'text-warning',
    description: '2 büyük sigorta kontrat kaybı, maliyet +%12',
  },
]

interface Sensitivity {
  label: string
  impact: string
  width: number
  color: 'bg-primary' | 'bg-tertiary'
}

const SENSITIVITIES: readonly Sensitivity[] = [
  { label: 'Oto dosya maliyeti ±%10', impact: '±42M', width: 85, color: 'bg-primary' },
  { label: 'Gelir büyüme ±%5', impact: '±28M', width: 62, color: 'bg-primary' },
  { label: 'Personel artışı ±%8', impact: '±19M', width: 45, color: 'bg-tertiary' },
  { label: 'TL/USD kuru ±%10', impact: '±11M', width: 28, color: 'bg-tertiary' },
]

export function ForecastPage() {
  return (
    <section>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-on-surface">
            Rolling Forecast
          </h2>
          <p className="text-sm text-on-surface-variant mt-2 max-w-2xl">
            Aylık güncellenen 12-ay forecast. Plan / Gerçekleşen / Tahmin katmanlı görünüm.
          </p>
        </div>
        <div className="flex gap-3">
          <select className="select">
            <option>Yöntem: Trend + Uzman</option>
            <option>Istatistik (ARIMA)</option>
            <option>Makine Öğrenmesi</option>
          </select>
          <button type="button" className="btn-primary">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              auto_awesome
            </span>
            Yeniden Hesapla
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card relative">
          <div className="ribbon-primary" />
          <span className="label-sm">Yıl Sonu Gelir Tahmini</span>
          <p className="text-2xl font-black num mt-2">2.298,5M</p>
          <p className="text-xs text-tertiary font-bold mt-1">+%2,4 vs Plan</p>
        </div>
        <div className="card relative">
          <div className="ribbon-tertiary" />
          <span className="label-sm">Yıl Sonu EBITDA Tahmini</span>
          <p className="text-2xl font-black num mt-2">378,1M</p>
          <p className="text-xs text-tertiary font-bold mt-1">+18M vs Plan</p>
        </div>
        <div className="card relative">
          <div className="ribbon-warning" />
          <span className="label-sm">Güven Aralığı</span>
          <p className="text-2xl font-black num mt-2">±%3,2</p>
          <p className="text-xs text-on-surface-variant mt-1">%90 güven seviyesi</p>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold tracking-tight">Plan vs Gerçekleşen vs Forecast</h3>
          <div className="flex gap-2">
            <span className="chip chip-neutral">Plan</span>
            <span className="chip chip-success">Actual</span>
            <span className="chip chip-info">Forecast</span>
          </div>
        </div>
        <div style={{ height: 280 }}>
          <ForecastChart />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-base font-bold tracking-tight mb-4">Senaryo Analizi</h3>
          <div className="space-y-4">
            {SCENARIOS.map((s) => (
              <div key={s.title} className="relative bg-surface-container-low rounded-lg p-4 pl-5">
                <div className={`ribbon-${s.ribbon}`} />
                <div className="flex justify-between">
                  <p className="text-sm font-bold">{s.title}</p>
                  <p className={`text-sm font-black num ${s.valueClass}`}>{s.value}</p>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">{s.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-base font-bold tracking-tight mb-4">
            Hassasiyet Analizi (EBITDA TL etki)
          </h3>
          <div className="space-y-3">
            {SENSITIVITIES.map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{s.label}</span>
                  <span className="font-bold num">{s.impact}</span>
                </div>
                <div className="progress-track">
                  <div className={`progress-fill ${s.color}`} style={{ width: `${s.width}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
