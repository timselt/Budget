import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import './shared/i18n' // initialise i18next once at app entry
import { AuthGuard } from './components/layout/AuthGuard'
import { AppLayout } from './components/layout/AppLayout'
import { RoleGuard } from './components/auth/RoleGuard'
import { LoginPage } from './pages/LoginPage'
import { ForbiddenPage } from './shared/ui/ForbiddenPage'
import { ToastContainer } from './components/shared/Toast'

const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const BudgetEntryPage = lazy(() => import('./pages/BudgetEntryPage').then(m => ({ default: m.BudgetEntryPage })))
const ActualsPage = lazy(() => import('./pages/ActualsPage').then(m => ({ default: m.ActualsPage })))
const ForecastPage = lazy(() => import('./pages/ForecastPage').then(m => ({ default: m.ForecastPage })))
const VariancePage = lazy(() => import('./pages/VariancePage').then(m => ({ default: m.VariancePage })))
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })))
const PnlReportPage = lazy(() => import('./pages/PnlReportPage').then(m => ({ default: m.PnlReportPage })))
const CustomersPage = lazy(() => import('./pages/CustomersPage').then(m => ({ default: m.CustomersPage })))
const ProductsPage = lazy(() => import('./pages/ProductsPage').then(m => ({ default: m.ProductsPage })))
const ContractsPage = lazy(() => import('./pages/ContractsPage').then(m => ({ default: m.ContractsPage })))
const ContractPriceBooksPage = lazy(() => import('./pages/ContractPriceBooksPage').then(m => ({ default: m.ContractPriceBooksPage })))
const PriceBookEditorPage = lazy(() => import('./pages/PriceBookEditorPage').then(m => ({ default: m.PriceBookEditorPage })))
const PriceLookupPage = lazy(() => import('./pages/PriceLookupPage').then(m => ({ default: m.PriceLookupPage })))
const ReconciliationBatchesPage = lazy(() => import('./pages/ReconciliationBatchesPage').then(m => ({ default: m.ReconciliationBatchesPage })))
const ReconciliationBatchDetailPage = lazy(() => import('./pages/ReconciliationBatchDetailPage').then(m => ({ default: m.ReconciliationBatchDetailPage })))
const ReconciliationCasesPage = lazy(() => import('./pages/ReconciliationCasesPage').then(m => ({ default: m.ReconciliationCasesPage })))
const SegmentsPage = lazy(() => import('./pages/SegmentsPage').then(m => ({ default: m.SegmentsPage })))
// BudgetPeriodsPage Bütçe Planlama sayfasının "Versiyonlar" tab'ı içine
// gömüldü; ayrı route artık kaldırıldı (sol menüden de çıkarıldı).
const ExpenseCategoriesPage = lazy(() => import('./pages/ExpenseCategoriesPage').then(m => ({ default: m.ExpenseCategoriesPage })))
const ExpenseEntriesPage = lazy(() => import('./pages/ExpenseEntriesPage').then(m => ({ default: m.ExpenseEntriesPage })))
const SpecialItemsPage = lazy(() => import('./pages/SpecialItemsPage').then(m => ({ default: m.SpecialItemsPage })))
const CollectionsPage = lazy(() => import('./pages/CollectionsPage').then(m => ({ default: m.CollectionsPage })))
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })))
const ScenariosPage = lazy(() => import('./pages/ScenariosPage').then(m => ({ default: m.ScenariosPage })))
const ConsolidationPage = lazy(() => import('./pages/ConsolidationPage').then(m => ({ default: m.ConsolidationPage })))
const ApprovalsPage = lazy(() => import('./pages/ApprovalsPage').then(m => ({ default: m.ApprovalsPage })))
const RevisionsPage = lazy(() => import('./pages/RevisionsPage').then(m => ({ default: m.RevisionsPage })))
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
    <>
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
          <Route
            path="forecast"
            element={
              <RoleGuard allow={['Admin', 'CFO', 'FinanceManager']}>
                <ForecastPage />
              </RoleGuard>
            }
          />
          <Route path="variance" element={<VariancePage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route
            path="reports/pnl"
            element={
              <RoleGuard allow={['Admin', 'CFO', 'FinanceManager']}>
                <PnlReportPage />
              </RoleGuard>
            }
          />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="contracts" element={<ContractsPage />} />
          <Route path="contracts/:contractId/price-books" element={<ContractPriceBooksPage />} />
          <Route path="price-books/:id" element={<PriceBookEditorPage />} />
          <Route path="pricing/lookup" element={<PriceLookupPage />} />
          <Route path="mutabakat" element={<Navigate to="/mutabakat/batches" replace />} />
          <Route path="mutabakat/batches" element={<ReconciliationBatchesPage />} />
          <Route path="mutabakat/batches/:id" element={<ReconciliationBatchDetailPage />} />
          <Route path="mutabakat/cases" element={<ReconciliationCasesPage />} />
          <Route path="segments" element={<SegmentsPage />} />
          {/* Eski /budget/periods URL'i Bütçe Planlama Versiyonlar tab'ına yönlendir. */}
          <Route path="budget/periods" element={<Navigate to="/budget/planning" replace />} />
          <Route path="expense-categories" element={<ExpenseCategoriesPage />} />
          <Route path="expenses" element={<ExpenseEntriesPage />} />
          <Route path="special-items" element={<SpecialItemsPage />} />
          <Route path="collections" element={<CollectionsPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="scenarios" element={<ScenariosPage />} />
          <Route
            path="consolidation"
            element={
              <RoleGuard allow={['Admin', 'CFO', 'FinanceManager']}>
                <ConsolidationPage />
              </RoleGuard>
            }
          />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="revisions" element={<RevisionsPage />} />
          <Route path="audit" element={<AuditLogPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
    <ToastContainer />
    </>
  )
}
