import { useAppContextStore, COMPANIES, YEARS, SCENARIOS } from '../../stores/appContext'

export function TopNavBar() {
  const { selectedCompanyId, selectedYear, selectedScenario, setCompany, setYear, setScenario } =
    useAppContextStore()

  return (
    <header className="fixed top-0 right-0 left-72 z-40">
      <div className="flex h-16 items-center justify-between bg-sl-glass-bg px-8 backdrop-blur-[20px]">
        <div className="flex items-center gap-3">
          <select
            value={selectedCompanyId ?? ''}
            onChange={(e) => setCompany(e.target.value || null)}
            className="rounded-lg border-none bg-sl-surface-container-high px-3 py-1.5 font-body text-sm font-medium text-sl-on-surface outline-none transition-all focus:bg-sl-surface-lowest focus:ring-2 focus:ring-sl-primary/40"
          >
            <option value="">Tüm Şirketler</option>
            {COMPANIES.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border-none bg-sl-surface-container-high px-3 py-1.5 font-body text-sm font-medium text-sl-on-surface outline-none transition-all focus:bg-sl-surface-lowest focus:ring-2 focus:ring-sl-primary/40"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <select
            value={selectedScenario}
            onChange={(e) => setScenario(e.target.value)}
            className="rounded-lg border-none bg-sl-surface-container-high px-3 py-1.5 font-body text-sm font-medium text-sl-on-surface outline-none transition-all focus:bg-sl-surface-lowest focus:ring-2 focus:ring-sl-primary/40"
          >
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex max-w-xs flex-1 items-center rounded-full bg-sl-surface-container-high px-4 py-2 transition-all focus-within:bg-sl-surface-lowest focus-within:ring-2 focus-within:ring-sl-primary/40">
            <span className="material-symbols-outlined mr-2 text-sl-secondary text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder="Ara..."
              className="w-full border-none bg-transparent p-0 font-body text-sm text-sl-on-surface outline-none placeholder:text-sl-secondary focus:ring-0"
            />
          </div>

          <button className="relative text-sl-on-surface-variant transition-all hover:text-sl-primary">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-sl-primary-container" />
          </button>
        </div>
      </div>
      <div className="h-px bg-sl-surface-container-highest opacity-50" />
    </header>
  )
}
