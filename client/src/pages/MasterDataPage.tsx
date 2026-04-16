import { useState } from 'react'

type Tab = 'accounts' | 'segments' | 'products' | 'companies' | 'periods' | 'kkeg'

const TABS: { id: Tab; label: string }[] = [
  { id: 'accounts', label: 'Hesap Planı' },
  { id: 'segments', label: 'Segmentler' },
  { id: 'products', label: 'Ürün Hiyerarşisi' },
  { id: 'companies', label: 'Şirketler' },
  { id: 'periods', label: 'Dönem & Takvim' },
  { id: 'kkeg', label: 'KKEG' },
]

interface AccountRow {
  code: string
  name: string
  type: string
  segment: string
  currency: string
  kkeg: 'yes' | 'no'
  active: boolean
}

const ACCOUNTS: readonly AccountRow[] = [
  { code: '600.01', name: 'Oto Asistans Gelir', type: 'Gelir', segment: 'Oto', currency: 'TRY', kkeg: 'no', active: true },
  { code: '600.02', name: 'Sağlık Asistans Gelir', type: 'Gelir', segment: 'Sağlık', currency: 'TRY', kkeg: 'no', active: true },
  { code: '600.03', name: 'Konut Asistans Gelir', type: 'Gelir', segment: 'Konut', currency: 'TRY', kkeg: 'no', active: true },
  { code: '620.01', name: 'Oto Hasar Tedarikçi', type: 'Hasar', segment: 'Oto', currency: 'TRY', kkeg: 'no', active: true },
  { code: '740.05', name: 'Temsil Ağırlama', type: 'OPEX', segment: 'Genel', currency: 'TRY', kkeg: 'yes', active: true },
  { code: '780.00', name: 'Finansman Gideri', type: 'Finansman', segment: 'Grup', currency: 'TRY', kkeg: 'no', active: true },
  { code: '900.01', name: 'SGK Teşvik Geliri', type: 'Diğer Gelir', segment: 'Genel', currency: 'TRY', kkeg: 'no', active: true },
]

export function MasterDataPage() {
  const [tab, setTab] = useState<Tab>('accounts')

  return (
    <section>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-on-surface">
            Master Data Yönetimi
          </h2>
          <p className="text-sm text-on-surface-variant mt-2 max-w-2xl">
            Hesap planı, segment hiyerarşisi, ürün kırılımı, şirket yapısı ve dönemler.
          </p>
        </div>
        <button type="button" className="btn-primary">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            add
          </span>
          Yeni Kayıt
        </button>
      </div>

      <div className="flex gap-1 mb-6 bg-surface-container-low rounded-lg p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="tbl">
          <thead>
            <tr>
              <th>Kod</th>
              <th>Hesap Adı</th>
              <th>Tip</th>
              <th>Segment</th>
              <th>Para Birimi</th>
              <th>KKEG</th>
              <th>Durum</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {ACCOUNTS.map((a) => (
              <tr key={a.code}>
                <td className="font-mono text-xs">{a.code}</td>
                <td>{a.name}</td>
                <td>{a.type}</td>
                <td>{a.segment}</td>
                <td>{a.currency}</td>
                <td>
                  {a.kkeg === 'yes' ? (
                    <span className="chip chip-warning">Evet</span>
                  ) : (
                    'Hayır'
                  )}
                </td>
                <td>
                  <span className={`chip chip-${a.active ? 'success' : 'neutral'}`}>
                    {a.active ? 'Aktif' : 'Pasif'}
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
      </div>
    </section>
  )
}
