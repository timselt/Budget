import { useCallback, useMemo, useRef, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  AllCommunityModule,
  type ColDef,
  type CellValueChangedEvent,
  type ValueFormatterParams,
  type GridReadyEvent,
  type GridApi,
} from 'ag-grid-community'
import type { BudgetEntryRow } from '../../hooks/useBudgetEntries'

const MONTH_LABELS = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
] as const

const TR_NUMBER_FORMAT = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function turkishNumberFormatter(params: ValueFormatterParams): string {
  if (params.value == null) return ''
  return TR_NUMBER_FORMAT.format(params.value as number)
}

function numberParser(params: { newValue: string }): number {
  const cleaned = params.newValue.replace(/\./g, '').replace(',', '.')
  const parsed = Number(cleaned)
  return Number.isNaN(parsed) ? 0 : parsed
}

function recalcYearTotal(row: BudgetEntryRow): number {
  return (
    row.month1 +
    row.month2 +
    row.month3 +
    row.month4 +
    row.month5 +
    row.month6 +
    row.month7 +
    row.month8 +
    row.month9 +
    row.month10 +
    row.month11 +
    row.month12
  )
}

interface BudgetGridProps {
  rows: BudgetEntryRow[]
  isLoading: boolean
  onDirtyChange: (dirtyEntries: Map<string, { customerId: number; month: number; amount: number }>) => void
}

export function BudgetGrid({ rows, isLoading, onDirtyChange }: BudgetGridProps) {
  const gridApiRef = useRef<GridApi | null>(null)
  const [dirtyKeys] = useState<Set<string>>(() => new Set())
  const dirtyEntriesRef = useRef<Map<string, { customerId: number; month: number; amount: number }>>(new Map())

  const onGridReady = useCallback((params: GridReadyEvent) => {
    gridApiRef.current = params.api
    params.api.sizeColumnsToFit()
  }, [])

  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent<BudgetEntryRow>) => {
      if (!event.colDef.field || !event.data) return

      const field = event.colDef.field
      const monthMatch = /^month(\d+)$/.exec(field)
      if (!monthMatch) return

      const monthNum = Number(monthMatch[1])
      const customerId = event.data.customerId
      const cellKey = `${customerId}-${monthNum}`

      dirtyKeys.add(cellKey)
      dirtyEntriesRef.current.set(cellKey, {
        customerId,
        month: monthNum,
        amount: event.newValue as number,
      })

      const updatedRow: BudgetEntryRow = {
        ...event.data,
        yearTotal: recalcYearTotal(event.data),
      }
      event.api.applyTransaction({ update: [updatedRow] })

      const colId = `${event.colDef.field}-dirty`
      event.api.refreshCells({
        rowNodes: [event.node],
        columns: [event.colDef.field ?? '', 'yearTotal'],
        force: true,
      })

      void colId

      onDirtyChange(new Map(dirtyEntriesRef.current))
    },
    [dirtyKeys, onDirtyChange],
  )

  const monthColDefs: ColDef<BudgetEntryRow>[] = useMemo(
    () =>
      MONTH_LABELS.map((label, i) => {
        const field = `month${i + 1}` as keyof BudgetEntryRow
        return {
          headerName: label,
          field,
          editable: true,
          valueFormatter: turkishNumberFormatter,
          valueParser: numberParser,
          cellStyle: (params) => {
            const cellKey = `${params.data?.customerId}-${i + 1}`
            if (dirtyKeys.has(cellKey)) {
              return { backgroundColor: 'oklch(92% 0.12 85)' }
            }
            return undefined
          },
          type: 'numericColumn',
          width: 110,
        } satisfies ColDef<BudgetEntryRow>
      }),
    [dirtyKeys],
  )

  const columnDefs: ColDef<BudgetEntryRow>[] = useMemo(
    () => [
      {
        headerName: 'Segment',
        field: 'segmentName',
        rowGroup: true,
        hide: true,
        width: 160,
      },
      {
        headerName: 'Müşteri',
        field: 'customerName',
        pinned: 'left',
        width: 200,
        editable: false,
      },
      ...monthColDefs,
      {
        headerName: 'Yıl Toplamı',
        field: 'yearTotal',
        pinned: 'right',
        editable: false,
        valueFormatter: turkishNumberFormatter,
        type: 'numericColumn',
        width: 140,
        cellStyle: {
          fontWeight: 600,
          backgroundColor: 'oklch(96% 0.01 250)',
        },
        aggFunc: 'sum',
      },
    ],
    [monthColDefs],
  )

  const defaultColDef: ColDef<BudgetEntryRow> = useMemo(
    () => ({
      sortable: true,
      resizable: true,
      suppressMovable: true,
    }),
    [],
  )

  const autoGroupColumnDef: ColDef<BudgetEntryRow> = useMemo(
    () => ({
      headerName: 'Segment / Müşteri',
      minWidth: 220,
      pinned: 'left',
      cellRendererParams: {
        suppressCount: false,
      },
    }),
    [],
  )

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="ag-theme-alpine w-full" style={{ height: 'calc(100vh - 220px)' }}>
      <AgGridReact<BudgetEntryRow>
        modules={[AllCommunityModule]}
        rowData={rows}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        autoGroupColumnDef={autoGroupColumnDef}
        groupDefaultExpanded={1}
        onGridReady={onGridReady}
        onCellValueChanged={onCellValueChanged}
        animateRows={false}
        getRowId={(params) => String(params.data.customerId)}
        grandTotalRow="bottom"
        suppressAggFuncInHeader
      />
    </div>
  )
}
