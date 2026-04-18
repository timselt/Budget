import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import './shared/i18n' // initialise i18next once at app entry
import { AuthGuard } from './components/layout/AuthGuard'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { ForbiddenPage } from './shared/ui/ForbiddenPage'

const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const BudgetEntryPage = lazy(() => import('./pages/BudgetEntryPage').then(m => ({ default: m.BudgetEntryPage })))
const ActualsPage = lazy(() => import('./pages/ActualsPage').then(m => ({ default: m.ActualsPage })))
const ForecastPage = lazy(() => import('./pages/ForecastPage').then(m => ({ default: m.ForecastPage })))
const VariancePage = lazy(() => import('./pages/VariancePage').then(m => ({ default: m.VariancePage })))
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })))
const PnlReportPage = lazy(() => import('./pages/PnlReportPage').then(m => ({ default: m.PnlReportPage })))
const MasterDataPage = lazy(() => import('./pages/MasterDataPage').then(m => ({ default: m.MasterDataPage })))
const CustomersPage = lazy(() => import('./pages/CustomersPage').then(m => ({ default: m.CustomersPage })))
const ProductsPage = lazy(() => import('./pages/ProductsPage').then(m => ({ default: m.ProductsPage })))
const SegmentsPage = lazy(() => import('./pages/SegmentsPage').then(m => ({ default: m.SegmentsPage })))
const ConsolidationPage = lazy(() => import('./pages/ConsolidationPage').then(m => ({ default: m.ConsolidationPage })))
const ApprovalsPage = lazy(() => import('./pages/ApprovalsPage').then(m => ({ default: m.ApprovalsPage })))
const AuditLogPage = lazy(() => import('./pages/AuditLogPage').then(m => ({ default: m.AuditLogPage })))

function PageLoader() {
  return (
    <div className="flex h-48 items-center justify-center">
      <p className="text-sm text-on-surface-variant">Yükleniyor...</p>
    </div>
  )
}

export function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* 403 landing sits outside the AuthGuard wrap so a user who has
            just been redirected here does not re-trigger the auth check
            and bounce again. */}
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="budget" element={<Navigate to="/budget/planning" replace />} />
          <Route path="budget/planning" element={<BudgetEntryPage />} />
          <Route path="actuals" element={<ActualsPage />} />
          <Route path="forecast" element={<ForecastPage />} />
          <Route path="variance" element={<VariancePage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="reports/pnl" element={<PnlReportPage />} />
          <Route path="master-data" element={<MasterDataPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="segments" element={<SegmentsPage />} />
          <Route path="consolidation" element={<ConsolidationPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="audit" element={<AuditLogPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
