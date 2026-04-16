import { Routes, Route } from 'react-router-dom'
import { AuthGuard } from './components/layout/AuthGuard'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <AuthGuard>
            <AppLayout />
          </AuthGuard>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="budget" element={<Placeholder title="Bütçe" />} />
        <Route path="customers" element={<Placeholder title="Müşteriler" />} />
        <Route path="expenses" element={<Placeholder title="Giderler" />} />
        <Route path="fx-rates" element={<Placeholder title="Döviz Kurları" />} />
      </Route>
    </Routes>
  )
}

function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-text-muted">Bu sayfa henüz hazırlanmadı.</p>
    </div>
  )
}
