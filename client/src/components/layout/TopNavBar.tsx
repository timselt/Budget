import { useAppContextStore, COMPANIES, YEARS, SCENARIOS } from '../../stores/appContext'

export function TopNavBar() {
  const {
    selectedCompanyId,
    selectedYear,
    selectedScenario,
    setCompany,
    setYear,
    setScenario,
  } = useAppContextStore()

  return (
    <header className="bg-white/80 backdrop-blur-md fixed top-0 right-0 w-[calc(100%-16rem)] z-40 h-16 px-8 flex items-center justify-between shadow-[0_1px_0_rgba(25,28,31,0.04)]">
      <div className="flex-1 flex items-center max-w-md bg-surface-container-high rounded-full px-4 py-2 focus-within:bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary/40 transition-all">
        <span className="material-symbols-outlined text-on-surface-variant mr-2" style={{ fontSize: 20 }}>
          search
        </span>
        <input
          type="text"
          placeholder="Hesap, kalem, şirket ara…"
          className="bg-transparent border-none p-0 w-full text-sm text-on-surface placeholder:text-on-surface-variant focus:ring-0 focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-4 ml-6">
        <select
          className="select"
          value={selectedCompanyId ?? ''}
          onChange={(e) => setCompany(e.target.value || null)}
        >
          <option value="">Tüm Şirketler</option>
          {COMPANIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          className="select"
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
          className="select"
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
        >
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-0 right-0 w-2 h-2 bg-primary-container rounded-full" />
        </button>
        <button
          type="button"
          className="text-on-surface-variant hover:text-primary transition-all"
          title="Yardım"
        >
          <span className="material-symbols-outlined">help_outline</span>
        </button>
      </div>
    </header>
  )
}
