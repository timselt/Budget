import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'

const mainNav = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/budget/planning', label: 'Bütçe Planlama', icon: 'monetization_on' },
  { to: '/actuals', label: 'Gerçekleşen', icon: 'sync' },
  { to: '/forecast', label: 'Forecast', icon: 'trending_up' },
  { to: '/variance', label: 'Sapma Analizi', icon: 'query_stats' },
  { to: '/reports', label: 'Raporlar', icon: 'summarize' },
]

const mgmtNav = [
  { to: '/master-data', label: 'Master Data', icon: 'account_tree' },
  { to: '/consolidation', label: 'Konsolidasyon', icon: 'hub' },
  { to: '/approvals', label: 'Onay Akışı', icon: 'task_alt' },
  { to: '/audit', label: 'Audit Log', icon: 'history' },
]

function NavItem({ to, label, icon, end }: { to: string; label: string; icon: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
          isActive
            ? 'bg-sl-surface-container-low font-bold text-sl-primary'
            : 'font-medium text-sl-on-surface-variant hover:bg-sl-surface-container-low/50'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-sl-primary" />
          )}
          <span
            className={`material-symbols-outlined text-[20px] ${
              isActive ? '' : 'group-hover:text-sl-primary'
            }`}
            style={isActive ? { fontVariationSettings: '"FILL" 1' } : undefined}
          >
            {icon}
          </span>
          {label}
        </>
      )}
    </NavLink>
  )
}

function getInitials(name: string | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function Sidebar() {
  const { user, logout } = useAuthStore()

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-72 flex-col bg-sl-surface-container py-8 px-4">
      <div className="mb-10 flex items-center gap-3 pl-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sl-primary to-sl-primary-container">
          <span className="material-symbols-outlined text-[20px] text-white">finance</span>
        </div>
        <div>
          <h1 className="font-headline text-lg font-black tracking-tighter text-sl-on-surface">
            FinOps<span className="text-sl-primary">Tur</span>
          </h1>
          <p className="font-label text-[0.6rem] font-medium uppercase tracking-[0.08em] text-sl-on-surface-variant">
            Kurumsal Bütçe Platformu
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col font-body text-sm tracking-[-0.02em]">
        <div className="flex flex-col gap-1">
          {mainNav.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>

        <div className="my-4 h-px bg-sl-surface-container-high" />

        <p className="mb-2 pl-3 font-label text-[0.6rem] font-bold uppercase tracking-[0.08em] text-sl-on-surface-variant/60">
          Yönetim
        </p>
        <div className="flex flex-col gap-1">
          {mgmtNav.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>
      </nav>

      <div className="mt-auto pt-6">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sl-primary-container">
            <span className="font-label text-xs font-bold text-sl-on-primary-container">
              {getInitials(user?.displayName)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sl-on-surface">{user?.displayName}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-md p-1.5 text-sl-on-surface-variant transition-colors hover:bg-sl-error-container hover:text-sl-error"
            title="Çıkış Yap"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
