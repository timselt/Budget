import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopNavBar } from './TopNavBar'

export function AppLayout() {
  return (
    <div className="min-h-screen flex bg-surface">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <TopNavBar />
        <main className="flex-1 mt-16 px-8 pt-10 pb-8 overflow-y-auto">
          <div className="view">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
