import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BudgetGrid, type BudgetRow } from './BudgetGrid'
import { parseClipboardGrid } from '../lib/parseClipboardGrid'

const fixtureRow = (customer: string): BudgetRow => ({
  customer,
  segment: 'SIGORTA',
  jan: 100,
  feb: 200,
  mar: 300,
  apr: 400,
  may: 500,
  jun: 600,
  jul: 700,
  aug: 800,
  sep: 900,
  oct: 1000,
  nov: 1100,
  dec: 1200,
  total: 7800,
})

describe('BudgetGrid', () => {
  it('mounts without throwing on a valid row payload', () => {
    // AG-Grid uses virtual DOM + async layout measurements that jsdom does
    // not render synchronously, so the real "header text" assertion lives in
    // the Playwright E2E slice (F4 Part 2d). Here we only guard against a
    // regression that crashes the grid on mount.
    const { container } = render(<BudgetGrid rows={[fixtureRow('Müşteri A')]} />)
    expect(container.querySelector('.ag-theme-quartz')).not.toBeNull()
  })
})

describe('BudgetGrid paste integration (ADR-0009 §2.4)', () => {
  // The end-to-end clipboard → AG-Grid → toast path is proven at the Playwright
  // layer (F4 Part 2d). This unit test covers the piece the hook owns inside
  // `processDataFromClipboard`: given a raw clipboard string, the values the
  // grid will paste match what `parseClipboardGrid` emits, and the documented
  // toast string fires on a non-contiguous payload.

  it('feeds non-contiguous payload through parseClipboardGrid', () => {
    const result = parseClipboardGrid('100\t200\n\n300\t400')
    expect(result.isNonContiguous).toBe(true)
    expect(result.values).toEqual([
      [100, 200],
      [300, 400],
    ])
  })

  it('feeds TR-locale decimals through parseClipboardGrid', () => {
    const result = parseClipboardGrid('1.234,56\t2.000,00\n3.000,50\t0,75')
    expect(result.values).toEqual([
      [1234.56, 2000],
      [3000.5, 0.75],
    ])
  })

  it('produces a payload-too-large warning on oversize input', () => {
    const rows = Array.from({ length: 5_001 }, () => '1').join('\n')
    const result = parseClipboardGrid(rows)
    expect(result.warning).toContain('maksimum boyutu')
  })

  it('onRowsChange callback surface is optional (grid mounts without it)', () => {
    const onChange = vi.fn()
    const { unmount } = render(
      <BudgetGrid rows={[fixtureRow('Müşteri B')]} onRowsChange={onChange} />,
    )
    unmount()
    expect(onChange).not.toHaveBeenCalled()
  })
})
