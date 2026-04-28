import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BudgetCellInputs } from './BudgetCellInputs'

describe('BudgetCellInputs', () => {
  it('shows placeholders when both fields empty', () => {
    render(
      <BudgetCellInputs
        quantity={null}
        amount=""
        onChange={vi.fn()}
        showQuantity={true}
      />,
    )
    expect(screen.getByPlaceholderText('Adet')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Tutar')).toBeInTheDocument()
  })

  it('renders quantity when provided', () => {
    render(
      <BudgetCellInputs
        quantity={10}
        amount=""
        onChange={vi.fn()}
        showQuantity={true}
      />,
    )
    expect(screen.getByDisplayValue('10')).toBeInTheDocument()
  })

  it('emits onChange with new quantity when user types in quantity field', () => {
    const onChange = vi.fn()
    render(
      <BudgetCellInputs
        quantity={null}
        amount=""
        onChange={onChange}
        showQuantity={true}
      />,
    )
    fireEvent.change(screen.getByPlaceholderText('Adet'), { target: { value: '15' } })
    expect(onChange).toHaveBeenCalledWith({ quantity: 15, amount: '' })
  })

  it('emits onChange with new amount when user types in amount field', () => {
    const onChange = vi.fn()
    render(
      <BudgetCellInputs
        quantity={null}
        amount=""
        onChange={onChange}
        showQuantity={true}
      />,
    )
    fireEvent.change(screen.getByPlaceholderText('Tutar'), { target: { value: '5500' } })
    expect(onChange).toHaveBeenCalledWith({ quantity: null, amount: '5500' })
  })

  it('hides quantity field when showQuantity=false (loss row)', () => {
    render(
      <BudgetCellInputs
        quantity={null}
        amount="3200"
        onChange={vi.fn()}
        showQuantity={false}
      />,
    )
    expect(screen.queryByPlaceholderText('Adet')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Tutar')).toBeInTheDocument()
  })

  it('clears quantity when user empties the field', () => {
    const onChange = vi.fn()
    render(
      <BudgetCellInputs
        quantity={10}
        amount="5500"
        onChange={onChange}
        showQuantity={true}
      />,
    )
    fireEvent.change(screen.getByDisplayValue('10'), { target: { value: '' } })
    expect(onChange).toHaveBeenCalledWith({ quantity: null, amount: '5500' })
  })

  it('forwards disabled prop to both inputs', () => {
    render(
      <BudgetCellInputs
        quantity={10}
        amount="5500"
        onChange={vi.fn()}
        showQuantity={true}
        disabled={true}
      />,
    )
    expect(screen.getByDisplayValue('10')).toBeDisabled()
    expect(screen.getByDisplayValue('5500')).toBeDisabled()
  })

  it('exposes aria-label on both inputs (a11y)', () => {
    render(
      <BudgetCellInputs
        quantity={null}
        amount=""
        onChange={vi.fn()}
        showQuantity={true}
      />,
    )
    expect(screen.getByLabelText('Adet')).toBeInTheDocument()
    expect(screen.getByLabelText('Tutar')).toBeInTheDocument()
  })

  it('ignores decimal input on quantity (backend is int?)', () => {
    const onChange = vi.fn()
    render(
      <BudgetCellInputs
        quantity={null}
        amount=""
        onChange={onChange}
        showQuantity={true}
      />,
    )
    fireEvent.change(screen.getByPlaceholderText('Adet'), {
      target: { value: '15.5' },
    })
    expect(onChange).not.toHaveBeenCalled()
  })
})
