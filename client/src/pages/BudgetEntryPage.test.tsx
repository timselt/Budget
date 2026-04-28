import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * Page-level test for the Hierarchical → Customer-Focused pre-select flow
 * (Task 4.1). The page is large; we mock only the budget-planning api module
 * so the React Query hooks resolve with the data we want, and the zustand
 * store is reset before each test. No new test infrastructure — we follow
 * the same `vi.mock` + QueryClientProvider + MemoryRouter pattern used by
 * `DashboardPage.test.tsx`. fireEvent (not user-event, which isn't installed)
 * matches the project's other interaction tests, e.g. BudgetCellInputs.test.
 */

vi.mock('../components/budget-planning/api', async () => {
  const actual = await vi.importActual<
    typeof import('../components/budget-planning/api')
  >('../components/budget-planning/api')
  return {
    ...actual,
    getYears: vi.fn(),
    getVersions: vi.fn(),
    getCustomers: vi.fn(),
    getTree: vi.fn(),
    getEntries: vi.fn(),
    getExpenseEntries: vi.fn(),
    getCustomerContracts: vi.fn(),
  }
})

import * as api from '../components/budget-planning/api'
import { useAppContextStore } from '../stores/appContext'
import { BudgetEntryPage } from './BudgetEntryPage'

const VERSION_ID = 42
const SOMPO_CUSTOMER_ID = 7
const SIGORTA_SEGMENT_ID = 1
const YOL_YARDIM_CONTRACT_ID = 101

function setupApiMocks() {
  vi.mocked(api.getYears).mockResolvedValue([
    { id: 1, year: 2026, isLocked: false },
  ])
  vi.mocked(api.getVersions).mockResolvedValue([
    {
      id: VERSION_ID,
      budgetYearId: 1,
      name: '2026 V1 Taslak',
      status: 'Draft',
      isActive: false,
    },
  ])
  vi.mocked(api.getCustomers).mockResolvedValue([
    {
      id: SOMPO_CUSTOMER_ID,
      code: 'SMP',
      name: 'Sompo Sigorta',
      segmentId: SIGORTA_SEGMENT_ID,
      segmentName: 'Sigorta',
      defaultCurrencyCode: 'TRY',
      isActive: true,
    },
  ])
  vi.mocked(api.getTree).mockResolvedValue({
    versionId: VERSION_ID,
    versionName: '2026 V1 Taslak',
    versionStatus: 'Draft',
    budgetYear: 2026,
    revenueTotalTry: 0,
    claimTotalTry: 0,
    expenseTotalTry: 0,
    segments: [
      {
        segmentId: SIGORTA_SEGMENT_ID,
        segmentCode: 'SIGORTA',
        segmentName: 'Sigorta',
        revenueTotalTry: 0,
        claimTotalTry: 0,
        customers: [
          {
            customerId: SOMPO_CUSTOMER_ID,
            customerCode: 'SMP',
            customerName: 'Sompo Sigorta',
            segmentId: SIGORTA_SEGMENT_ID,
            activeContractCount: 1,
            revenueTotalTry: 0,
            claimTotalTry: 0,
            lossRatioPercent: 0,
            revenueMonthlyTry: Array(12).fill(0),
            claimMonthlyTry: Array(12).fill(0),
          },
        ],
      },
    ],
    opexCategories: [],
  })
  vi.mocked(api.getEntries).mockResolvedValue([])
  vi.mocked(api.getExpenseEntries).mockResolvedValue([])
  vi.mocked(api.getCustomerContracts).mockResolvedValue([
    {
      id: YOL_YARDIM_CONTRACT_ID,
      customerId: SOMPO_CUSTOMER_ID,
      productId: 11,
      productName: 'Yol Yardım',
      productCode: 'YYM',
      contractCode: 'TA1SGK0B',
      isActive: true,
    },
  ])
}

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <BudgetEntryPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('BudgetEntryPage — Hierarchical → Customer-Focused pre-select (Task 4.1)', () => {
  beforeEach(() => {
    // Reset the zustand store between tests so leftover versionId/state
    // from a previous case can't leak in. Page bootstraps versionId from
    // the versions query via its own useEffect.
    useAppContextStore.setState({
      selectedVersionId: null,
      selectedVersionLabel: null,
      selectedVersionStatus: null,
    })
    setupApiMocks()
  })

  it('pre-selects customer in Customer-Focused tab when arrow_forward is clicked in Hierarchical tab', async () => {
    renderPage()

    // Wait for tree + customer table to populate. The customer Sompo Sigorta
    // appears in both the left tree and SegmentCustomersTable; the arrow_
    // forward icon button only exists in SegmentCustomersTable, identified
    // by its Turkish title attribute.
    const goToCustomerModeButton = await screen.findByTitle(
      /Müşteri Odaklı Giriş'te aç/i,
    )
    fireEvent.click(goToCustomerModeButton)

    // After the fix:
    // 1) The "Müşteri Odaklı Giriş" tab button is active (the project styles
    //    the active tab via the `active` className).
    const customerTabButton = screen.getByRole('button', {
      name: /Müşteri Odaklı Giriş/i,
    })
    expect(customerTabButton.className).toContain('active')

    // 2) The customer-list step is skipped — "Toplu Çalışma Paneli"
    //    (FilteredCustomersTable header) is NOT in the document.
    expect(screen.queryByText(/Toplu Çalışma Paneli/i)).not.toBeInTheDocument()

    // 3) The product matrix is visible — "Yol Yardım" (a contract product
    //    name) + the contract code appear.
    expect(await screen.findByText('Yol Yardım')).toBeInTheDocument()
    expect(screen.getByText(/TA1SGK0B/)).toBeInTheDocument()

    // 4) The "Müşteri Değiştir" back button is rendered so the user can
    //    return to the customer-list view if they want to switch.
    expect(
      screen.getByRole('button', { name: /Müşteri Değiştir/i }),
    ).toBeInTheDocument()
  })

  it('Müşteri Değiştir clears the pre-selection and re-shows the customer list', async () => {
    renderPage()

    const goToCustomerModeButton = await screen.findByTitle(
      /Müşteri Odaklı Giriş'te aç/i,
    )
    fireEvent.click(goToCustomerModeButton)

    const backButton = await screen.findByRole('button', {
      name: /Müşteri Değiştir/i,
    })
    fireEvent.click(backButton)

    // FilteredCustomersTable header is back; matrix is gone.
    expect(
      await screen.findByText(/Toplu Çalışma Paneli/i),
    ).toBeInTheDocument()
    expect(screen.queryByText('Yol Yardım')).not.toBeInTheDocument()
  })
})
