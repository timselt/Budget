import { Routes, Route } from 'react-router-dom'
import { AuthGuard } from './components/layout/AuthGuard'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { BudgetEntryPage } from './pages/BudgetEntryPage'
import { ExpenseEntryPage } from './pages/ExpenseEntryPage'
import { BudgetVersionsPage } from './pages/BudgetVersionsPage'
import { ApprovalsPage } from './pages/ApprovalsPage'
import { CustomerListPage } from './pages/CustomerListPage'
import { CustomerDetailPage } from './pages/CustomerDetailPage'
import { VariancePage } from './pages/VariancePage'
import { ScenarioPage } from './pages/ScenarioPage'
import { FxRatesPage } from './pages/FxRatesPage'
import { AuditLogPage } from './pages/AuditLogPage'
import { AdminPage } from './pages/AdminPage'

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
        <Route path="budget" element={<BudgetEntryPage />} />
        <Route path="budget/versions" element={<BudgetVersionsPage />} />
        <Route path="customers" element={<CustomerListPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="expenses" element={<ExpenseEntryPage />} />
        <Route path="variance" element={<VariancePage />} />
        <Route path="scenarios" element={<ScenarioPage />} />
        <Route path="fx-rates" element={<FxRatesPage />} />
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="admin/audit" element={<AuditLogPage />} />
      </Route>
    </Routes>
  )
}
