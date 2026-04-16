import { useState } from 'react'

type Tab = 'accounts' | 'segments' | 'products' | 'companies' | 'periods' | 'kkeg'

const TABS: { key: Tab; label: string }[] = [
  { key: 'accounts', label: 'Hesap Planı' },
  { key: 'segments', label: 'Segmentler' },
  { key: 'products', label: 'Ürün Hiyerarşisi' },
  { key: 'companies', label: 'Şirketler' },
  { key: 'periods', label: 'Dönem & Takvim' },
  { key: 'kkeg', label: 'KKEG' },
]

const ACCOUNT_DATA = [
  { code: '600.01', name: 'Oto Asistans Gelir', type: 'Gelir', typeClass: 'bg-sl-success-container text-sl-success', segment: 'Oto', currency: 'TRY', kkeg: false, active: true },
  { code: '600.02', name: 'Sağlık Asistans Gelir', type: 'Gelir', typeClass: 'bg-sl-success-container text-sl-success', segment: 'Sağlık', currency: 'TRY', kkeg: false, active: true },
  { code: '600.03', name: 'Konut Asistans Gelir', type: 'Gelir', typeClass: 'bg-sl-success-container text-sl-success', segment: 'Konut', currency: 'TRY', kkeg: false, active: true },
  { code: '610.01', name: 'Oto Hasar Gideri', type: 'Hasar', typeClass: 'bg-sl-primary/10 text-sl-primary', segment: 'Oto', currency: 'TRY', kkeg: false, active: true },
  { code: '610.02', name: 'Sağlık Hasar Gideri', type: 'Hasar', typeClass: 'bg-sl-primary/10 text-sl-primary', segment: 'Sağlık', currency: 'TRY', kkeg: false, active: true },
  { code: '770.01', name: 'Genel Yönetim Giderleri', type: 'OPEX', typeClass: 'bg-sl-warning-container text-sl-warning', segment: 'Genel', currency: 'TRY', kkeg: true, active: true },
  { code: '900.01', name: 'SGK Teşvik Geliri', type: 'Diğer Gelir', typeClass: 'bg-sl-tertiary/10 text-sl-tertiary', segment: 'Grup', currency: 'TRY', kkeg: false, active: true },
] as const

export function MasterDataPage() {
  const [activeTab, setActiveTab] = useState<Tab>('accounts')

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-extrabold tracking-[-0.02em] text-sl-on-surface">
            Master Data Yönetimi
          </h1>
          <p className="mt-2 max-w-2xl font-body text-sm text-sl-on-surface-variant">
            Hesap planı, segment hiyerarşisi, ürün kırılımı, şirket yapısı ve dönemler.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-md bg-gradient-to-br from-sl-primary to-sl-primary-container px-4 py-2 font-body text-sm font-medium text-white shadow-[0_4px_12px_rgba(181,3,3,0.15)] transition-all duration-200 hover:shadow-[0_8px_20px_rgba(181,3,3,0.25)] hover:brightness-110 active:scale-[0.97]">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Yeni Kayıt
        </button>
      </header>

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

      {activeTab === 'accounts' ? (
        <div className="overflow-x-auto rounded-xl bg-sl-surface-lowest shadow-[var(--sl-shadow-sm)]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-sl-surface-container-low">
                <th className="sticky top-0 px-4 py-3 text-left font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Kod</th>
                <th className="sticky top-0 px-4 py-3 text-left font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Hesap Adı</th>
                <th className="sticky top-0 px-4 py-3 text-left font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Tip</th>
                <th className="sticky top-0 px-4 py-3 text-left font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Segment</th>
                <th className="sticky top-0 px-4 py-3 text-left font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Para Birimi</th>
                <th className="sticky top-0 px-4 py-3 text-left font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">KKEG</th>
                <th className="sticky top-0 px-4 py-3 text-left font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant">Durum</th>
                <th className="sticky top-0 px-4 py-3 text-left font-label text-[0.65rem] font-bold uppercase tracking-[0.05em] text-sl-on-surface-variant" />
              </tr>
            </thead>
            <tbody className="text-[0.8rem]">
              {ACCOUNT_DATA.map((row) => (
                <tr key={row.code} className="transition-colors hover:bg-sl-surface">
                  <td className="px-4 py-2.5 font-mono text-sm font-bold text-sl-on-surface">{row.code}</td>
                  <td className="px-4 py-2.5 font-medium text-sl-on-surface">{row.name}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold ${row.typeClass}`}>
                      {row.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-sl-on-surface">{row.segment}</td>
                  <td className="px-4 py-2.5 text-sl-on-surface-variant">{row.currency}</td>
                  <td className="px-4 py-2.5">
                    {row.kkeg ? (
                      <span className="inline-flex rounded-full bg-sl-warning-container px-2.5 py-0.5 text-[0.7rem] font-bold text-sl-warning">Evet</span>
                    ) : (
                      <span className="text-sl-on-surface-variant">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex rounded-full bg-sl-success-container px-2.5 py-0.5 text-[0.7rem] font-bold text-sl-success">Aktif</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <button className="rounded-md p-1 text-sl-on-surface-variant transition-colors hover:bg-sl-surface-container-high hover:text-sl-on-surface">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl bg-sl-surface-lowest shadow-[var(--sl-shadow-sm)]">
          <span className="material-symbols-outlined text-4xl text-sl-on-surface-variant/40">account_tree</span>
          <p className="font-body text-sm text-sl-on-surface-variant">
            {activeTab === 'segments' && 'Segment tanımları yakında aktif olacak.'}
            {activeTab === 'products' && 'Ürün hiyerarşisi yakında aktif olacak.'}
            {activeTab === 'companies' && 'Şirket yönetimi yakında aktif olacak.'}
            {activeTab === 'periods' && 'Dönem ve takvim yönetimi yakında aktif olacak.'}
            {activeTab === 'kkeg' && 'KKEG tanımları yakında aktif olacak.'}
          </p>
        </div>
      )}
    </div>
  )
}
