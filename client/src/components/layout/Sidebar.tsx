import { useMemo } from 'react'
import { useAuthStore } from '../../stores/auth'
import { SIDEBAR_SECTIONS } from './sidebar-config'
import { SidebarSection } from './SidebarSection'
import { SidebarContextBar } from './SidebarContextBar'

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
  const roleLine = user?.roles?.[0] ?? 'CEO • Tur Assist'
  const displayName = user?.displayName ?? 'Timur Turan'

  // Rol filtresi — pilot/role-gated item'ları yetkisiz kullanıcıdan gizler.
  // Section'ın tüm item'ları gizlendiyse section da kaldırılır (boş header
  // göstermesin); ama section.to (tek-link mod) varsa korunur.
  const visibleSections = useMemo(() => {
    const userRoles = new Set(user?.roles ?? [])
    return SIDEBAR_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          !item.requiresRole || item.requiresRole.some((r) => userRoles.has(r)),
      ),
    })).filter((section) => section.to || section.items.length > 0)
  }, [user?.roles])

  return (
    <aside className="w-64 fixed left-0 top-0 h-screen bg-secondary text-on-secondary flex flex-col py-6 px-3 z-50">
      <div className="px-3 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span
              className="material-symbols-outlined text-white"
              style={{ fontSize: 18 }}
            >
              insights
            </span>
          </div>
          <h1 className="text-xl font-black tracking-display text-white">
            FinOps<span className="text-primary">Tur</span>
          </h1>
        </div>
      </div>

      <SidebarContextBar />

      <nav className="flex-1 overflow-y-auto pr-1 space-y-1">
        {visibleSections.map((section) => (
          <SidebarSection key={section.id} section={section} />
        ))}
      </nav>

      <div className="mt-4 px-2">
        <div className="flex items-center gap-3 pl-1">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
            {getInitials(displayName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {displayName}
            </p>
            <p className="text-[0.65rem] text-white/60 truncate">{roleLine}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="p-1.5 text-white/70 hover:text-white transition-colors rounded-md"
            title="Çıkış"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 18 }}
            >
              logout
            </span>
          </button>
        </div>
      </div>
    </aside>
  )
}
