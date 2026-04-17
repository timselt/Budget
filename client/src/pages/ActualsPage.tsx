import { useState } from 'react'

type Tab = 'revenue' | 'claims' | 'opex' | 'personnel' | 'reconciliation'

const TABS: { id: Tab; label: string }[] = [
  { id: 'revenue', label: 'Gelirler' },
  { id: 'claims', label: 'Hasar' },
  { id: 'opex', label: 'Operasyonel Giderler' },
  { id: 'personnel', label: 'Personel' },
  { id: 'reconciliation', label: 'Mutabakat' },
]

type Status = 'success' | 'warning'

interface SampleRow {
  date: string
  id: string
  account: string
  segment: string
  product: string
  amount: string
  status: Status
  source: string
}

const SAMPLES: readonly SampleRow[] = [
  {
    date: '17.04.2026',
    id: 'AKT-00842',
    account: '600.01 Oto Asistans',
    segment: 'Oto',
    product: 'Yol Yardım',
    amount: '3.248.500',
    status: 'success',
    source: 'ERP',
  },
  {
    date: '17.04.2026',
    id: 'AKT-00841',
    account: '600.02 Sağlık Asistans',
    segment: 'Sağlık',
    product: 'Telesağlık',
    amount: '1.128.900',
    status: 'success',
    source: 'ERP',
  },
  {
    date: '17.04.2026',
    id: 'AKT-00840',
    account: '620.01 Oto Hasar',
    segment: 'Oto',
    product: 'Çekici',
    amount: '482.300',
    status: 'warning',
    source: 'Manuel',
  },
  {
    date: '16.04.2026',
    id: 'AKT-00839',
    account: '600.03 Konut Asistans',
    segment: 'Konut',
    product: 'Acil Bakım',
    amount: '2.145.600',
    status: 'success',
    source: 'ERP',
  },
  {
    date: '16.04.2026',
    id: 'AKT-00838',
    account: '740.05 Temsil Ağırlama',
    segment: 'Genel',
    product: '—',
    amount: '18.400',
    status: 'warning',
    source: 'Manuel',
  },
  {
    date: '16.04.2026',
    id: 'AKT-00837',
    account: '600.01 Oto Asistans',
    segment: 'Oto',
    product: 'İkame Araç',
    amount: '5.824.100',
    status: 'success',
    source: 'ERP',
  },
  {
    date: '15.04.2026',
    id: 'AKT-00836',
    account: '900.01 SGK Teşvik',
    segment: 'Genel',
    product: '—',
    amount: '412.800',
    status: 'success',
    source: 'Otomatik',
  },
  {
    date: '15.04.2026',
    id: 'AKT-00835',
    account: '620.02 Sağlık Hasar',
    segment: 'Sağlık',
    product: 'Ambulans',
    amount: '298.500',
    status: 'success',
    source: 'ERP',
  },
]

export function ActualsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('revenue')

  return (
    <section>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-[#002366]">
            Gerçekleşen Girişleri
          </h2>
          <p className="text-sm text-on-surface-variant mt-2 max-w-2xl">
            Muhasebe/ERP aktarımı + elle giriş. KKEG ayrımı ve hesap mutabakatı ekranı.
          </p>
        </div>
        <div className="flex gap-3">
          <button type="button" className="btn-secondary">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              sync
            </span>
            ERP Senkronizasyonu
          </button>
          <button type="button" className="btn-primary">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              add
            </span>
            Manuel Kayıt
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-6 bg-surface-container-low rounded-lg p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card">
          <span className="label-sm">Nisan 2026 Kayıt</span>
          <p className="text-2xl font-black num mt-2">186,4M</p>
          <p className="text-xs text-tertiary font-bold mt-1">+%4,2 vs Plan</p>
        </div>
        <div className="card">
          <span className="label-sm">Eşleşen Dosya</span>
          <p className="text-2xl font-black num mt-2">94.218</p>
          <p className="text-xs text-on-surface-variant mt-1">312 bekliyor</p>
        </div>
        <div className="card">
          <span className="label-sm">Mutabakat Durumu</span>
          <p className="text-2xl font-black num mt-2">%98,7</p>
          <div className="progress-track mt-2">
            <div className="progress-fill bg-success" style={{ width: '98.7%' }} />
          </div>
        </div>
        <div className="card">
          <span className="label-sm">Son Senkronizasyon</span>
          <p className="text-sm font-bold mt-2">Bugün 14:28</p>
          <p className="text-xs text-on-surface-variant mt-1">Logo Tiger 3 Enterprise</p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="tbl">
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Kayıt No</th>
              <th>Hesap</th>
              <th>Segment</th>
              <th>Ürün</th>
              <th className="text-right">Tutar (TL)</th>
              <th>Durum</th>
              <th>Kaynak</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLES.map((s) => (
              <tr key={s.id}>
                <td className="font-mono text-xs">{s.date}</td>
                <td className="font-mono text-xs">{s.id}</td>
                <td>{s.account}</td>
                <td>{s.segment}</td>
                <td>{s.product}</td>
                <td className="text-right num">{s.amount}</td>
                <td>
                  <span className={`chip chip-${s.status}`}>
                    {s.status === 'success' ? 'Eşleşti' : 'İnceleme'}
                  </span>
                </td>
                <td className="text-xs">{s.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
