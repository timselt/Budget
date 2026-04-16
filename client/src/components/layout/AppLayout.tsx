import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopNavBar } from './TopNavBar'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-sl-surface-container-low">
      <Sidebar />
      <TopNavBar />
      <main className="ml-72 pt-16 min-h-screen">
        <div className="px-8 py-8 lg:px-12 lg:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
