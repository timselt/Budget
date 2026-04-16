import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopNavBar } from './TopNavBar'

export function AppLayout() {
  return (
    <div className="min-h-screen flex bg-surface">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <TopNavBar />
        <main className="flex-1 mt-16 p-8 overflow-y-auto">
          <div className="view">
            <Outlet />
          </div>
        </main>
        <footer className="px-8 py-4 text-xs text-on-surface-variant flex justify-between border-t border-surface-container">
          <span>FinOps Tur v1.0 Prototip • Design System: Precision Editorial</span>
          <span>Tur Assist Grubu • KVKK &amp; SOC 2 Type II</span>
        </footer>
      </div>
    </div>
  )
}
