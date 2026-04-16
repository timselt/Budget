import { useAuthStore } from '../../stores/auth'

export function TopNavBar() {
  const { user } = useAuthStore()
  const initials = user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??'

  return (
    <header className="fixed top-0 right-0 left-72 z-50">
      <div className="flex items-center justify-between bg-sl-glass-bg px-8 py-3 backdrop-blur-[20px]">
        <div className="relative">
          <span className="material-symbols-outlined absolute top-1/2 left-3 -translate-y-1/2 text-sl-on-surface-variant text-[20px]">
            search
          </span>
          <input
            type="text"
            placeholder="Ara..."
            className="w-64 rounded-full bg-sl-surface-container-low py-2 pr-4 pl-10 font-body text-sm text-sl-on-surface outline-none transition-colors placeholder:text-sl-on-surface-variant/60 focus:bg-sl-surface-lowest"
          />
        </div>

        <div className="flex items-center gap-2">
          <button className="rounded-full p-2 text-sl-on-surface-variant transition-colors hover:bg-sl-surface-container-low hover:scale-95 duration-200">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
          </button>
          <button className="rounded-full p-2 text-sl-on-surface-variant transition-colors hover:bg-sl-surface-container-low hover:scale-95 duration-200">
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>
          <div className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sl-primary to-sl-primary-container text-xs font-bold text-white">
            {initials}
          </div>
        </div>
      </div>
      <div className="h-px bg-sl-surface-container-highest opacity-50" />
    </header>
  )
}
