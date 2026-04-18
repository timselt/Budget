import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

interface CustomerRow {
  id: number
  code: string
  name: string
  categoryCode: string | null
  subCategory: string | null
  taxId: string | null
  taxOffice: string | null
  segmentId: number
  segmentName: string | null
  startDate: string | null
  endDate: string | null
  isGroupInternal: boolean
  accountManager: string | null
  defaultCurrencyCode: string | null
  isActive: boolean
}

type Tab = 'categories' | 'customers' | 'matrix'

const CATEGORY_ROWS = [
  {
    color: 'bg-primary',
    code: 'INSURANCE',
    name: 'Sigorta Sirketleri',
    subtitle: 'Elementer, hayat, reasurans',
    active: '22',
    passive: '1',
    revenue: '1.392,0',
  },
  {
    color: 'bg-[#005b9f]',
    code: 'AUTOMOTIVE_OEM',
    name: 'Otomotiv OEM & Distributor',
    subtitle: 'Marka asistansi, garanti sonrasi',
    active: '22',
    passive: '2',
    revenue: '471,5',
  },
  {
    color: 'bg-success',
    code: 'FLEET',
    name: 'Filo & Operasyonel Kiralama',
    subtitle: 'Uzun donem kiralama, filo yonetimi',
    active: '22',
    passive: '2',
    revenue: '247,0',
  },
  {
    color: 'bg-warning',
    code: 'ALTERNATIVE',
    name: 'Alternatif Kanallar',
    subtitle: 'Banka, telco, gayrimenkul, grup ici',
    active: '12',
    passive: '5',
    revenue: '134,7',
  },
]

const MATRIX_ROWS = [
  {
    customer: 'Anadolu Sigorta',
    code: 'CUST-0001',
    values: ['%12 kom.', '—', 'Evet', 'Paket', '—', '—', 'Evet'],
    count: '4',
  },
  {
    customer: 'Allianz Sigorta',
    code: 'CUST-0002',
    values: ['%11 kom.', '—', '—', 'Paket', 'Premium', '—', '—'],
    count: '3',
  },
  {
    customer: 'Mercedes-Benz Turk',
    code: 'CUST-0023',
    values: ['OEM Sonrasi', 'Premium', '—', '—', '—', '—', '—'],
    count: '2',
  },
]

async function getCustomers(): Promise<CustomerRow[]> {
  const { data } = await api.get<CustomerRow[]>('/customers')
  return data
}

export function CustomersPage() {
  const [tab, setTab] = useState<Tab>('categories')
  const { data, isLoading, isError } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
  })

  return (
    <section>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-on-surface">
            Musteri Yonetimi
          </h2>
          <p className="text-sm text-on-surface-variant mt-2 max-w-2xl">
            Musteri kategorileri ve musteri katalogu tam dinamik yapidadir. Yeni musteri veya
            kategori eklenebilir, birlestirilebilir, pasiflestirilebilir.
          </p>
        </div>
        <div className="flex gap-3">
          <button type="button" className="btn-secondary">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              upload
            </span>
            Excel Ice Aktar
          </button>
          <button type="button" className="btn-secondary">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              download
            </span>
            Disa Aktar
          </button>
          <button type="button" className="btn-primary">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              person_add
            </span>
            Yeni Musteri
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 mb-6">
        <KpiCard title="Toplam Musteri" value="89" subtitle="78 Aktif • 8 Dormant • 3 Kapali" variant="primary" />
        <KpiCard title="Kategori Sayisi" value="4 / sinirsiz" subtitle="Sigorta • OEM • Filo • Alternatif" variant="tertiary" />
        <KpiCard title="Grup Ici Musteri" value="3" subtitle="Otokonfor • RS Eksper • TUR ASSIST" variant="success" />
        <KpiCard title="Yenileme Yaklasan" value="12" subtitle="Gelecek 90 gun icinde bitisi olan" variant="warning" />
      </div>

      <div className="flex gap-1 mb-6 bg-surface-container-low rounded-lg p-1 w-fit">
        <TabButton active={tab === 'categories'} onClick={() => setTab('categories')} icon="category" label="Kategoriler" />
        <TabButton active={tab === 'customers'} onClick={() => setTab('customers')} icon="business" label="Musteriler" />
        <TabButton active={tab === 'matrix'} onClick={() => setTab('matrix')} icon="grid_view" label="Musteri × Urun Matrisi" />
      </div>

      {tab === 'categories' ? <CategoriesTab /> : null}
      {tab === 'customers' ? <CustomersTab data={data ?? []} isLoading={isLoading} isError={isError} /> : null}
      {tab === 'matrix' ? <MatrixTab /> : null}
    </section>
  )
}

function KpiCard({
  title,
  value,
  subtitle,
  variant,
}: {
  title: string
  value: string
  subtitle: string
  variant: 'primary' | 'tertiary' | 'success' | 'warning'
}) {
  const ribbon =
    variant === 'primary'
      ? 'ribbon-primary'
      : variant === 'tertiary'
        ? 'ribbon-tertiary'
        : variant === 'success'
          ? 'ribbon-success'
          : 'ribbon-warning'

  return (
    <div className="col-span-12 md:col-span-3 card relative">
      <div className={ribbon} />
      <span className="label-sm">{title}</span>
      <p className="text-2xl font-black tracking-display num mt-2">{value}</p>
      <p className="text-xs text-on-surface-variant mt-1">{subtitle}</p>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: string
  label: string
}) {
  return (
    <button type="button" className={`tab ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: 16 }}>
        {icon}
      </span>
      {label}
    </button>
  )
}

function CategoriesTab() {
  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 lg:col-span-4 card">
        <h3 className="text-base font-bold text-on-surface mb-2">Yeni Kategori</h3>
        <p className="text-xs text-on-surface-variant mb-4">
          Ornek: Telekom, Banka, Saglik Grubu, Platform, Kamu.
        </p>
        <div className="space-y-3">
          <div>
            <label className="label-sm block mb-1">Kod</label>
            <input className="input w-full" placeholder="TELCO" maxLength={20} />
          </div>
          <div>
            <label className="label-sm block mb-1">Gorunen Ad</label>
            <input className="input w-full" placeholder="Telekom Sirketleri" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-sm block mb-1">Renk</label>
              <div className="flex gap-1.5">
                <div className="w-6 h-6 rounded-full bg-primary ring-2 ring-offset-2 ring-primary cursor-pointer" />
                <div className="w-6 h-6 rounded-full bg-[#005b9f] cursor-pointer" />
                <div className="w-6 h-6 rounded-full bg-success cursor-pointer" />
                <div className="w-6 h-6 rounded-full bg-warning cursor-pointer" />
                <div className="w-6 h-6 rounded-full bg-[#6750a4] cursor-pointer" />
              </div>
            </div>
            <div>
              <label className="label-sm block mb-1">Siralama</label>
              <input className="input w-full num" type="number" defaultValue="5" />
            </div>
          </div>
          <div>
            <label className="label-sm block mb-1">Aciklama</label>
            <textarea className="input w-full" rows={2} placeholder="GSM, fiber, operator kurumsal hizmet anlasmalari" />
          </div>
          <button type="button" className="btn-primary w-full justify-center mt-2">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              add
            </span>
            Kategori Olustur
          </button>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-8 card p-0 overflow-hidden">
        <table className="tbl">
          <thead>
            <tr>
              <th>#</th>
              <th>Kod</th>
              <th>Kategori</th>
              <th className="text-right">Aktif Musteri</th>
              <th className="text-right">Pasif</th>
              <th className="text-right">FY26 Gelir (MTL)</th>
              <th>Durum</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {CATEGORY_ROWS.map((row) => (
              <tr key={row.code}>
                <td><div className={`w-3 h-3 rounded-full ${row.color}`} /></td>
                <td className="font-mono text-xs">{row.code}</td>
                <td>
                  <strong>{row.name}</strong>
                  <p className="text-[0.65rem] text-on-surface-variant">{row.subtitle}</p>
                </td>
                <td className="text-right num font-semibold">{row.active}</td>
                <td className="text-right num">{row.passive}</td>
                <td className="text-right num font-bold">{row.revenue}</td>
                <td><span className="chip chip-success">Aktif</span></td>
                <td>
                  <button type="button" className="btn-tertiary">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      edit
                    </span>
                  </button>
                </td>
              </tr>
            ))}
            <tr className="total-row">
              <td />
              <td />
              <td>TOPLAM</td>
              <td className="text-right num">78</td>
              <td className="text-right num">10</td>
              <td className="text-right num">2.245,2</td>
              <td />
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CustomersTab({
  data,
  isLoading,
  isError,
}: {
  data: CustomerRow[]
  isLoading: boolean
  isError: boolean
}) {
  return (
    <>
      <div className="card mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center bg-surface-container-high rounded-full px-4 py-2 flex-1 min-w-[280px] max-w-md">
          <span className="material-symbols-outlined text-on-surface-variant mr-2" style={{ fontSize: 20 }}>
            search
          </span>
          <input className="bg-transparent border-none p-0 w-full text-sm focus:outline-none" placeholder="Musteri adi, kod, vergi no ara…" />
        </div>
        <select className="select"><option>Tum Kategoriler</option></select>
        <select className="select"><option>Tum Durumlar</option></select>
        <select className="select"><option>Grup: Hepsi</option></select>
        <div className="ml-auto flex gap-2">
          <button type="button" className="btn-secondary">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              merge
            </span>
            Musteri Birlestir
          </button>
          <button type="button" className="btn-primary">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              person_add
            </span>
            Yeni Musteri
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? <div className="p-6 text-sm text-on-surface-variant">Musteriler yukleniyor…</div> : null}
        {isError ? <div className="p-6 text-sm text-error">Musteri verileri alinamadi.</div> : null}
        {!isLoading && !isError ? (
          <table className="tbl">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Musteri Adi</th>
                <th>Kategori</th>
                <th>Alt Kategori</th>
                <th>Vergi</th>
                <th>Grup Ici</th>
                <th>Durum</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((customer) => (
                <tr key={customer.id} style={customer.isGroupInternal ? { background: '#fff3f3' } : undefined}>
                  <td className="font-mono text-xs">{customer.code}</td>
                  <td>
                    <strong>{customer.name}</strong>
                    <p className="text-[0.65rem] text-on-surface-variant">
                      {customer.accountManager ?? customer.segmentName ?? '-'}
                    </p>
                  </td>
                  <td>
                    <span className={`chip ${customer.categoryCode === 'INSURANCE' ? 'chip-error' : customer.categoryCode ? 'chip-info' : 'chip-neutral'}`}>
                      {customer.categoryCode ?? 'Tanimsiz'}
                    </span>
                  </td>
                  <td>{customer.subCategory ?? '-'}</td>
                  <td>
                    <div className="font-mono text-xs">{customer.taxId ?? '-'}</div>
                    <div className="text-[0.65rem] text-on-surface-variant">{customer.taxOffice ?? '-'}</div>
                  </td>
                  <td>
                    {customer.isGroupInternal ? (
                      <span className="chip chip-info">Elimine</span>
                    ) : (
                      <span className="chip chip-neutral">Hayir</span>
                    )}
                  </td>
                  <td>
                    <span className={`chip chip-${customer.isActive ? 'success' : 'warning'}`}>
                      {customer.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="btn-tertiary">
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                        edit
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </>
  )
}

function MatrixTab() {
  return (
    <>
      <div className="card mb-4">
        <h3 className="text-base font-bold text-on-surface">Musteri × Segment × Urun Matrisi</h3>
        <p className="text-xs text-on-surface-variant mt-1">
          Bir musteri birden fazla segmentte, birden fazla urunle calisabilir.
        </p>
      </div>
      <div className="card p-0 overflow-hidden">
        <table className="tbl">
          <thead>
            <tr>
              <th>Musteri</th>
              <th className="text-center">LifeStyle</th>
              <th className="text-center">Warranty</th>
              <th className="text-center">Eksper</th>
              <th className="text-center">Asistans</th>
              <th className="text-center">Second Opinion</th>
              <th className="text-center">Tesisat</th>
              <th className="text-center">Sigorta Ekli</th>
              <th className="text-right">Aktif Hat</th>
              <th>Islem</th>
            </tr>
          </thead>
          <tbody>
            {MATRIX_ROWS.map((row) => (
              <tr key={row.code}>
                <td>
                  <strong>{row.customer}</strong>
                  <p className="text-[0.65rem] text-on-surface-variant">{row.code}</p>
                </td>
                {row.values.map((value, index) => (
                  <td key={index} className="text-center">
                    {value === '—' ? '—' : (
                      <span className="chip chip-success" style={{ fontSize: '.65rem' }}>{value}</span>
                    )}
                  </td>
                ))}
                <td className="text-right num font-bold">{row.count}</td>
                <td>
                  <button type="button" className="btn-tertiary">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      add_link
                    </span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
