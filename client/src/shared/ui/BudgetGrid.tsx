import { useMemo, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, GridReadyEvent, ProcessDataFromClipboardParams } from 'ag-grid-community'
import { toast } from 'sonner'
import { useClipboardRange } from '../hooks/useClipboardRange'
import { parseTrNumber } from '../lib/parseTrNumber'

// AG-Grid 32 Community auto-registers ClientSideRowModel; no explicit
// module registration needed for the basic grid we render here.

interface BudgetRow {
  customer: string
  segment: string
  jan: number | null
  feb: number | null
  mar: number | null
  apr: number | null
  may: number | null
  jun: number | null
  jul: number | null
  aug: number | null
  sep: number | null
  oct: number | null
  nov: number | null
  dec: number | null
  total: number
}

const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const

function formatTr(value: number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return value.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export interface BudgetGridProps {
  rows: BudgetRow[]
  onRowsChange?: (next: BudgetRow[]) => void
}

/**
 * AG-Grid-backed spreadsheet for monthly budget entry (ADR-0009 §2.1 + §2.4).
 *
 * The grid wires `useClipboardRange` into AG-Grid's `processDataFromClipboard`
 * hook so an Excel paste — including a non-contiguous multi-block copy — is
 * collapsed into a single contiguous block starting at the target cell, and
 * the user sees a toast when either the "non-contiguous" or the
 * "payload-too-large" guard fires.
 *
 * TR-locale number formatting is applied at the cell level via
 * `valueFormatter`; parsing is deferred to `parseTrNumber` so edits made
 * directly in a cell accept `1.234,56` without a separate validator.
 */
export function BudgetGrid({ rows, onRowsChange }: BudgetGridProps) {
  const { handlePaste } = useClipboardRange()
  const rowsRef = useRef(rows)
  rowsRef.current = rows

  const columnDefs = useMemo<ColDef<BudgetRow>[]>(
    () => [
      { field: 'customer', headerName: 'Müşteri', pinned: 'left', minWidth: 200, editable: false },
      { field: 'segment', headerName: 'Segment', pinned: 'left', minWidth: 140, editable: false },
      ...MONTH_KEYS.map<ColDef<BudgetRow>>((key, idx) => ({
        field: key,
        headerName: [
          'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
          'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
        ][idx],
        editable: true,
        type: 'numericColumn',
        valueFormatter: (p) => formatTr(p.value as number | null),
        valueParser: (p) => parseTrNumber(String(p.newValue)),
        minWidth: 110,
      })),
      {
        field: 'total',
        headerName: 'Toplam',
        pinned: 'right',
        editable: false,
        type: 'numericColumn',
        valueFormatter: (p) => formatTr(p.value as number),
        cellStyle: { fontWeight: 600, background: '#f5f5f5' },
        minWidth: 120,
      },
    ],
    [],
  )

  const processDataFromClipboard = (
    params: ProcessDataFromClipboardParams<BudgetRow>,
  ): string[][] | null => {
    // AG-Grid hands us a pre-parsed string[][]; we re-join into the raw
    // tab+newline form that useClipboardRange expects so the hook's logic
    // (non-contiguous detection, TR decimal parsing, size guard) is the single
    // source of truth. The returned matrix is what AG-Grid actually pastes.
    const raw = params.data.map((row) => row.join('\t')).join('\n')
    const grid = handlePaste(raw)

    if (grid.warning) {
      toast.warning(grid.warning)
    }

    return grid.values.map((row) => row.map((cell) => (cell === null ? '' : String(cell))))
  }

  const onGridReady = (_event: GridReadyEvent<BudgetRow>) => {
    // No-op for now; reserved for future keyboard-shortcut wiring and
    // single-range copy behaviour when we graduate to AG-Grid Enterprise.
  }

  return (
    <div className="ag-theme-quartz" style={{ width: '100%', height: '60vh' }}>
      <AgGridReact<BudgetRow>
        rowData={rows}
        columnDefs={columnDefs}
        processDataFromClipboard={processDataFromClipboard}
        onGridReady={onGridReady}
        onCellValueChanged={(event) => {
          if (!onRowsChange) return
          const next = rowsRef.current.map((r) =>
            r.customer === event.data.customer ? event.data : r,
          )
          onRowsChange(next)
        }}
        defaultColDef={{
          sortable: true,
          resizable: true,
          filter: true,
        }}
      />
    </div>
  )
}

export type { BudgetRow }
