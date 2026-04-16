import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthGuard } from './components/layout/AuthGuard'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './pages/LoginPage'

const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const BudgetEntryPage = lazy(() => import('./pages/BudgetEntryPage').then(m => ({ default: m.BudgetEntryPage })))
const ActualsPage = lazy(() => import('./pages/ActualsPage').then(m => ({ default: m.ActualsPage })))
const ForecastPage = lazy(() => import('./pages/ForecastPage').then(m => ({ default: m.ForecastPage })))
const VariancePage = lazy(() => import('./pages/VariancePage').then(m => ({ default: m.VariancePage })))
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })))
const MasterDataPage = lazy(() => import('./pages/MasterDataPage').then(m => ({ default: m.MasterDataPage })))
const ConsolidationPage = lazy(() => import('./pages/ConsolidationPage').then(m => ({ default: m.ConsolidationPage })))
const ApprovalsPage = lazy(() => import('./pages/ApprovalsPage').then(m => ({ default: m.ApprovalsPage })))
const AuditLogPage = lazy(() => import('./pages/AuditLogPage').then(m => ({ default: m.AuditLogPage })))

function PageLoader() {
  return (
    <div className="flex h-48 items-center justify-center">
      <p className="text-sm text-sl-on-surface-variant">Yükleniyor...</p>
    </div>
  )
}

export function App() {
  return (
    <Suspense fallback={<PageLoader />}>
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
          <Route path="budget/planning" element={<BudgetEntryPage />} />
          <Route path="actuals" element={<ActualsPage />} />
          <Route path="forecast" element={<ForecastPage />} />
          <Route path="variance" element={<VariancePage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="master-data" element={<MasterDataPage />} />
          <Route path="consolidation" element={<ConsolidationPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="audit" element={<AuditLogPage />} />

          {/* Eski route'lardan yönlendirmeler */}
          <Route path="budget" element={<Navigate to="/budget/planning" replace />} />
          <Route path="budget/versions" element={<Navigate to="/budget/planning" replace />} />
          <Route path="customers" element={<Navigate to="/" replace />} />
          <Route path="customers/:id" element={<Navigate to="/" replace />} />
          <Route path="expenses" element={<Navigate to="/budget/planning" replace />} />
          <Route path="scenarios" element={<Navigate to="/variance" replace />} />
          <Route path="fx-rates" element={<Navigate to="/master-data" replace />} />
          <Route path="tahsilat" element={<Navigate to="/" replace />} />
          <Route path="tahsilat/*" element={<Navigate to="/" replace />} />
          <Route path="admin" element={<Navigate to="/master-data" replace />} />
          <Route path="admin/audit" element={<Navigate to="/audit" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
