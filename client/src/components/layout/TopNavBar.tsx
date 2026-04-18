import { useState } from 'react'
import { useAppContextStore, COMPANIES, YEARS, SCENARIOS } from '../../stores/appContext'

export function TopNavBar() {
  const {
    selectedCompanyId,
    selectedYear,
    selectedScenario,
    searchQuery,
    setCompany,
    setYear,
    setScenario,
    setSearchQuery,
  } = useAppContextStore()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)

  return (
    <header className="fixed top-0 left-64 right-0 z-40 h-16 px-6 flex items-center gap-4 bg-white/80 backdrop-blur-md shadow-[0_1px_0_rgba(25,28,31,0.04)]">
      <div className="flex-1 min-w-0 max-w-[32rem] flex items-center bg-surface-container-high rounded-full px-4 py-2 focus-within:bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary/40 transition-all">
        <span className="material-symbols-outlined text-on-surface-variant mr-2" style={{ fontSize: 20 }}>
          search
        </span>
        <input
          type="text"
          placeholder="Hesap, kalem, şirket ara…"
          className="bg-transparent border-none p-0 w-full text-sm text-on-surface placeholder:text-on-surface-variant focus:ring-0 focus:outline-none"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <select
          className="select min-w-[150px]"
          value={selectedCompanyId ?? ''}
          onChange={(e) => setCompany(e.target.value || null)}
        >
          <option value="">Tur Assist A.Ş.</option>
          {COMPANIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          className="select min-w-[96px]"
          value={selectedYear}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              FY {y}
            </option>
          ))}
        </select>

        <select
          className="select min-w-[160px]"
          value={selectedScenario}
          onChange={(e) => setScenario(e.target.value)}
        >
          {SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="text-on-surface-variant hover:text-primary transition-all relative"
          title="Bildirimler"
          onClick={() => {
            setIsNotificationsOpen((value) => !value)
            setIsHelpOpen(false)
          }}
        >
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-0 right-0 w-2 h-2 bg-primary-container rounded-full" />
        </button>
        <button
          type="button"
          className="text-on-surface-variant hover:text-primary transition-all"
          title="Yardım"
          onClick={() => {
            setIsHelpOpen((value) => !value)
            setIsNotificationsOpen(false)
          }}
        >
          <span className="material-symbols-outlined">help_outline</span>
        </button>
      </div>

      {isNotificationsOpen ? (
        <div className="absolute right-20 top-14 w-80 card-floating p-4">
          <p className="label-sm">Bildirimler</p>
          <p className="text-sm font-semibold text-on-surface mt-2">Q4 growth uyarisi bekliyor</p>
          <p className="text-xs text-on-surface-variant mt-1">
            Otomotiv segmentinde conservative senaryoda butce artis limiti asinmis.
          </p>
          <p className="text-sm font-semibold text-on-surface mt-3">Onay bekleyen taslak</p>
          <p className="text-xs text-on-surface-variant mt-1">
            v3 Draft butcesi CFO onayina gonderilmeden once kontrol edilmeli.
          </p>
        </div>
      ) : null}

      {isHelpOpen ? (
        <div className="absolute right-6 top-14 w-80 card-floating p-4">
          <p className="label-sm">Yardim</p>
          <p className="text-sm font-semibold text-on-surface mt-2">Hizli kullanim</p>
          <p className="text-xs text-on-surface-variant mt-1">
            Ust arama, agacta musteri, hesap ve gider kalemi arar. Filtreler tum tabloyu birlikte gunceller.
          </p>
          <p className="text-sm font-semibold text-on-surface mt-3">Kisayollar</p>
          <p className="text-xs text-on-surface-variant mt-1">A = Hiyerarsik planlama, C = Musteri odakli giris.</p>
        </div>
      ) : null}
    </header>
  )
}
