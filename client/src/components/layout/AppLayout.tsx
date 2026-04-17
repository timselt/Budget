import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopNavBar } from './TopNavBar'

export function AppLayout() {
  return (
    <div className="min-h-screen flex bg-surface">
      <Sidebar />
      <div className="flex-1 ml-[280px] flex flex-col min-h-screen">
        <TopNavBar />
        <main className="flex-1 mt-16 p-8 overflow-y-auto">
          <div className="view">
            <Outlet />
          </div>
        </main>
        {/* Footer — tonal recessed bar (No-Line Rule, no border-t) */}
        <footer className="px-8 py-4 text-xs text-on-surface-variant flex justify-between bg-surface-container-low">
          <span>FinOps Tur v1.0 • Tur Assist — Architectural Precision</span>
          <span>Tur Assist Grubu • KVKK &amp; SOC 2 Type II</span>
        </footer>
      </div>
    </div>
  )
}
