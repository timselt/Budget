export function TopNavBar() {
  return (
    <header className="fixed top-0 right-0 left-72 z-40">
      <div className="flex h-16 items-center justify-between bg-sl-glass-bg px-8 backdrop-blur-[20px]">
        <div className="flex max-w-md flex-1 items-center rounded-full bg-sl-surface-container-high px-4 py-2 transition-all focus-within:bg-sl-surface-lowest focus-within:ring-2 focus-within:ring-sl-primary/40">
          <span className="material-symbols-outlined mr-2 text-sl-secondary text-[20px]">
            search
          </span>
          <input
            type="text"
            placeholder="Veri ara..."
            className="w-full border-none bg-transparent p-0 font-body text-sm text-sl-on-surface outline-none placeholder:text-sl-secondary focus:ring-0"
          />
        </div>

        <div className="flex items-center gap-6">
          <button className="relative text-sl-on-surface-variant transition-all hover:text-sl-primary">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-sl-primary-container" />
          </button>
          <button className="text-sl-on-surface-variant transition-all hover:text-sl-primary">
            <span className="material-symbols-outlined">help_outline</span>
          </button>
        </div>
      </div>
      <div className="h-px bg-sl-surface-container-highest opacity-50" />
    </header>
  )
}
