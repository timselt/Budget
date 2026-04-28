import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BudgetCustomerGrid } from './BudgetCustomerGrid'
import type { ContractRow, GridValues } from './budget-grid-types'

const sompoYolYardimContracts: ContractRow[] = [
  {
    contractId: 101,
    productName: 'Yol Yardım',
    productCode: 'YYM',
    contractCode: 'TA1SGK0B',
  },
]

const emptyValues: GridValues = {}

const sompoYolYardimProps = {
  contracts: sompoYolYardimContracts,
  values: emptyValues,
  disabled: false,
  onCellChange: vi.fn(),
  onCellDelete: vi.fn(),
}

describe('BudgetCustomerGrid — consolidated revenue/loss layout', () => {
  it('renders each product header once with kontrat kodu (no duplication across Gelir/Hasar)', () => {
    render(<BudgetCustomerGrid {...sompoYolYardimProps} />)
    const productNames = screen.getAllByText('Yol Yardım')
    expect(productNames).toHaveLength(1)
    const codes = screen.getAllByText(/TA1SGK0B/)
    expect(codes).toHaveLength(1)
  })

  it('shows Gelir and Hasar role badges for the same product', () => {
    render(<BudgetCustomerGrid {...sompoYolYardimProps} />)
    expect(screen.getByText('Gelir')).toBeInTheDocument()
    expect(screen.getByText('Hasar')).toBeInTheDocument()
  })

  it('hasar row has only amount inputs (no quantity)', () => {
    render(<BudgetCustomerGrid {...sompoYolYardimProps} />)
    const hasarBadge = screen.getByText('Hasar')
    const hasarRow = hasarBadge.closest('tr')!
    // 12 months → 12 amount inputs, 0 quantity inputs
    const adetInputs = hasarRow.querySelectorAll('input[placeholder="Adet"]')
    expect(adetInputs.length).toBe(0)
    const tutarInputs = hasarRow.querySelectorAll('input[placeholder="Tutar"]')
    expect(tutarInputs.length).toBe(12)
  })

  it('shows formula notes on Teknik Marj and Loss Ratio summary rows', () => {
    render(<BudgetCustomerGrid {...sompoYolYardimProps} />)
    expect(screen.getByText(/Teknik Marj/)).toHaveTextContent(/Gelir\s*[−-]\s*Hasar/)
    expect(screen.getByText(/Loss Ratio/)).toHaveTextContent(/Hasar\s*\/\s*Gelir/)
  })
})
