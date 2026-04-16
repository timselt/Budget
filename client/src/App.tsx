import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthGuard } from './components/layout/AuthGuard'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './pages/LoginPage'

const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const BudgetEntryPage = lazy(() => import('./pages/BudgetEntryPage').then(m => ({ default: m.BudgetEntryPage })))
const BudgetVersionsPage = lazy(() => import('./pages/BudgetVersionsPage').then(m => ({ default: m.BudgetVersionsPage })))
const CustomerListPage = lazy(() => import('./pages/CustomerListPage').then(m => ({ default: m.CustomerListPage })))
const CustomerDetailPage = lazy(() => import('./pages/CustomerDetailPage').then(m => ({ default: m.CustomerDetailPage })))
const ExpenseEntryPage = lazy(() => import('./pages/ExpenseEntryPage').then(m => ({ default: m.ExpenseEntryPage })))
const VariancePage = lazy(() => import('./pages/VariancePage').then(m => ({ default: m.VariancePage })))
const ScenarioPage = lazy(() => import('./pages/ScenarioPage').then(m => ({ default: m.ScenarioPage })))
const FxRatesPage = lazy(() => import('./pages/FxRatesPage').then(m => ({ default: m.FxRatesPage })))
const ApprovalsPage = lazy(() => import('./pages/ApprovalsPage').then(m => ({ default: m.ApprovalsPage })))
const AuditLogPage = lazy(() => import('./pages/AuditLogPage').then(m => ({ default: m.AuditLogPage })))
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })))
const CollectionDashboardPage = lazy(() => import('./pages/CollectionDashboardPage').then(m => ({ default: m.CollectionDashboardPage })))
const CollectionSegmentPage = lazy(() => import('./pages/CollectionSegmentPage').then(m => ({ default: m.CollectionSegmentPage })))
const CollectionImportPage = lazy(() => import('./pages/CollectionImportPage').then(m => ({ default: m.CollectionImportPage })))

function PageLoader() {
  return (
    <div className="flex h-48 items-center justify-center">
      <p className="text-sm text-text-muted">Yükleniyor...</p>
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
          <Route path="budget" element={<BudgetEntryPage />} />
          <Route path="budget/versions" element={<BudgetVersionsPage />} />
          <Route path="customers" element={<CustomerListPage />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />
          <Route path="expenses" element={<ExpenseEntryPage />} />
          <Route path="variance" element={<VariancePage />} />
          <Route path="scenarios" element={<ScenarioPage />} />
          <Route path="fx-rates" element={<FxRatesPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="tahsilat" element={<CollectionDashboardPage />} />
          <Route path="tahsilat/segment/:id" element={<CollectionSegmentPage />} />
          <Route path="tahsilat/import" element={<CollectionImportPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="admin/audit" element={<AuditLogPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
