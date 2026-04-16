import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

export type BudgetType = 'Revenue' | 'Claims'

export interface BudgetEntry {
  id: number
  customerId: number
  customerName: string
  segmentName: string
  month: number
  amountOriginal: number
  currencyCode: string
  amountTryFixed: number
  amountTrySpot: number
}

export interface BudgetEntryRow {
  customerId: number
  customerName: string
  segmentName: string
  month1: number
  month2: number
  month3: number
  month4: number
  month5: number
  month6: number
  month7: number
  month8: number
  month9: number
  month10: number
  month11: number
  month12: number
  yearTotal: number
}

interface BulkSavePayload {
  versionId: number
  type: BudgetType
  entries: {
    customerId: number
    month: number
    amountOriginal: number
    currencyCode: string
  }[]
}

function entriesToRows(entries: BudgetEntry[]): BudgetEntryRow[] {
  const grouped = new Map<number, BudgetEntryRow>()

  for (const entry of entries) {
    let row = grouped.get(entry.customerId)
    if (!row) {
      row = {
        customerId: entry.customerId,
        customerName: entry.customerName,
        segmentName: entry.segmentName,
        month1: 0,
        month2: 0,
        month3: 0,
        month4: 0,
        month5: 0,
        month6: 0,
        month7: 0,
        month8: 0,
        month9: 0,
        month10: 0,
        month11: 0,
        month12: 0,
        yearTotal: 0,
      }
      grouped.set(entry.customerId, row)
    }

    const monthKey = `month${entry.month}` as keyof BudgetEntryRow
    ;(row as unknown as Record<string, unknown>)[monthKey] = entry.amountOriginal
  }

  const rows: BudgetEntryRow[] = []
  for (const row of grouped.values()) {
    const withTotal: BudgetEntryRow = {
      ...row,
      yearTotal:
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
        row.month12,
    }
    rows.push(withTotal)
  }

  return rows
}

export function useBudgetEntries(versionId: number | null, type: BudgetType) {
  return useQuery<BudgetEntryRow[]>({
    queryKey: ['budget-entries', versionId, type],
    queryFn: async () => {
      const { data } = await api.get<BudgetEntry[]>(
        `/budget/versions/${versionId}/entries`,
        { params: { type } },
      )
      return entriesToRows(data)
    },
    enabled: versionId !== null,
  })
}

export function useSaveBudgetEntries() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: BulkSavePayload) => {
      const { data } = await api.put(
        `/budget/versions/${payload.versionId}/entries/bulk`,
        { type: payload.type, entries: payload.entries },
      )
      return data
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['budget-entries', variables.versionId, variables.type],
      })
    },
  })
}
