import { useMemo } from 'react'

interface BudgetRow {
  name: string
  type: 'segment' | 'input' | 'total' | 'subtotal'
  base?: number
}

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

const ROWS: readonly BudgetRow[] = [
  { name: '🟥 GELİR', type: 'segment' },
  { name: '  Sigorta Şirketleri — Oto Asistans', type: 'input', base: 68 },
  { name: '  Sigorta Şirketleri — Sağlık', type: 'input', base: 24 },
  { name: '  Sigorta Şirketleri — Konut', type: 'input', base: 12 },
  { name: '  Banka / Kart Programları', type: 'input', base: 18 },
  { name: '  B2B2C — OEM Warranty & Tur Medical', type: 'input', base: 16 },
  { name: '  B2C Direkt', type: 'input', base: 6 },
  { name: '  SGK Teşvik Geliri', type: 'input', base: 3 },
  { name: 'GELİR TOPLAM', type: 'total' },
  { name: '🟧 HASAR', type: 'segment' },
  { name: '  Oto Hasar Tedarikçi', type: 'input', base: 48 },
  { name: '  Sağlık Hasar', type: 'input', base: 21 },
  { name: '  Konut Hasar', type: 'input', base: 9 },
  { name: '  Warranty Hasar', type: 'input', base: 6 },
  { name: '  Reasürans/Sigorta Primi', type: 'input', base: 4 },
  { name: '  Karşılık Artışı', type: 'input', base: 2 },
  { name: 'HASAR TOPLAM', type: 'total' },
  { name: 'TEKNİK MARJ', type: 'subtotal' },
  { name: '🟦 OPEX', type: 'segment' },
  { name: '  Personel Giderleri', type: 'input', base: 20 },
  { name: '  Teknoloji & SaaS', type: 'input', base: 7 },
  { name: '  Operasyon & Çağrı Merkezi', type: 'input', base: 5 },
  { name: '  Pazarlama', type: 'input', base: 3 },
  { name: '  Genel Yönetim', type: 'input', base: 4 },
  { name: '  Amortisman', type: 'input', base: 2 },
  { name: 'OPEX TOPLAM', type: 'total' },
  { name: 'EBITDA', type: 'subtotal' },
]

interface RenderedRow {
  row: BudgetRow
  values: readonly number[]
  total: number
}

function buildRows(): RenderedRow[] {
  let seed = 1
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }

  return ROWS.map((row) => {
    const values: number[] = []
    let total = 0
    for (let i = 0; i < 12; i++) {
      if (row.type === 'input' && row.base !== undefined) {
        const mult = 1 + i * 0.02 + pseudoRandom() * 0.06
        const v = Math.round(row.base * mult * 10) / 10
        values.push(v)
        total += v
      } else if (row.type === 'segment') {
        values.push(Number.NaN)
      } else {
        const v = Math.round((pseudoRandom() * 50 + 80) * 10) / 10
        values.push(v)
        total += v
      }
    }
    return { row, values, total: Math.round(total * 10) / 10 }
  })
}

function fmt(v: number): string {
  return v.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

export function BudgetEntryPage() {
  const rendered = useMemo(() => buildRows(), [])

  return (
    <section>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-on-surface">
            Bütçe Planlama
          </h2>
          <p className="text-sm text-on-surface-variant mt-2 max-w-2xl">
            Segment × Ürün × Ay bazında plan giriş ekranı. Kurumsal kurallar ve formül kontrolleri
            aktif.
          </p>
        </div>
        <div className="flex gap-3">
          <button type="button" className="btn-secondary">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              upload_file
            </span>
            Excel İçe Aktar
          </button>
          <button type="button" className="btn-secondary">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              save
            </span>
            Taslak Kaydet
          </button>
          <button type="button" className="btn-primary">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              verified
            </span>
            Onaya Gönder
          </button>
        </div>
      </div>

      {/* Filter card */}
      <div className="card mb-6 flex flex-wrap items-center gap-3">
        <span className="label-sm">Filtre</span>
        <select className="select">
          <option>Şirket: Tur Assist A.Ş.</option>
        </select>
        <select className="select">
          <option>Yıl: FY 2026</option>
        </select>
        <select className="select">
          <option>Versiyon: v3 Draft</option>
        </select>
        <select className="select">
          <option>Senaryo: Base</option>
          <option>Optimistic</option>
          <option>Conservative</option>
        </select>
        <div className="ml-auto flex items-center gap-2">
          <span className="chip chip-info">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              info
            </span>
            Mavi = kullanıcı girişi
          </span>
          <span className="chip chip-neutral">Gri = formül</span>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="max-h-[70vh] overflow-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ minWidth: 280 }}>Kalem</th>
                {MONTHS.map((m) => (
                  <th key={m} className="text-right">
                    {m}
                  </th>
                ))}
                <th className="text-right" style={{ background: '#191c1f', color: '#fff' }}>
                  Toplam
                </th>
              </tr>
            </thead>
            <tbody>
              {rendered.map(({ row, values, total }) => (
                <tr
                  key={row.name}
                  className={
                    row.type === 'segment'
                      ? 'segment-row'
                      : row.type === 'total'
                        ? 'total-row'
                        : row.type === 'subtotal'
                          ? 'subtotal-row'
                          : undefined
                  }
                >
                  <td>{row.name}</td>
                  {values.map((v, i) => {
                    if (row.type === 'input') {
                      return (
                        <td key={i} className="text-right">
                          <input
                            className="cell-edit"
                            style={{ color: '#005b9f' }}
                            defaultValue={fmt(v)}
                          />
                        </td>
                      )
                    }
                    if (row.type === 'segment') {
                      return <td key={i} />
                    }
                    return (
                      <td key={i} className="text-right num">
                        {fmt(v)}
                      </td>
                    )
                  })}
                  {row.type === 'segment' ? (
                    <td />
                  ) : (
                    <td className="text-right num font-bold">{fmt(total)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="card">
          <span className="label-sm">Formül Kontrolü</span>
          <p className="text-sm text-on-surface mt-2">
            <span className="chip chip-success">OK</span> Gelir Toplam = Σ segmentler
          </p>
          <p className="text-sm text-on-surface mt-2">
            <span className="chip chip-success">OK</span> Hasar Toplam = Σ branşlar
          </p>
          <p className="text-sm text-on-surface mt-2">
            <span className="chip chip-warning">UYARI</span> Q4 growth %28 (limit: %25)
          </p>
        </div>
        <div className="card">
          <span className="label-sm">Onay Akışı</span>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-success" style={{ fontSize: 18 }}>
                check_circle
              </span>
              Departman Müdürü
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary" style={{ fontSize: 18 }}>
                pending
              </span>
              CFO (beklemede)
            </div>
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-on-surface-variant"
                style={{ fontSize: 18 }}
              >
                radio_button_unchecked
              </span>
              CEO
            </div>
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-on-surface-variant"
                style={{ fontSize: 18 }}
              >
                radio_button_unchecked
              </span>
              Yönetim Kurulu
            </div>
          </div>
        </div>
        <div className="card">
          <span className="label-sm">Son Değişiklikler</span>
          <p className="text-xs text-on-surface-variant mt-2">
            T. Turan — 14:23 — Oto segmenti Eki ayı: 98M → 112M
          </p>
          <p className="text-xs text-on-surface-variant mt-2">
            M. Yılmaz — 13:45 — Sağlık marjı yeniden fiyatlandı
          </p>
          <p className="text-xs text-on-surface-variant mt-2">
            A. Çelik — 11:02 — Warranty komisyon oranı güncellendi
          </p>
        </div>
      </div>
    </section>
  )
}
