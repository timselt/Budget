import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

export type ExpenseClassification = 'GENERAL' | 'TECHNICAL' | 'EXTRAORDINARY'

export interface ExpenseEntry {
  id: number
  categoryId: number
  categoryName: string
  classification: ExpenseClassification
  month: number
  amount: number
  currencyCode: string
}

interface CreateExpenseEntry {
  yearId: number
  versionId: number
  categoryId: number
  month: number
  amount: number
  currencyCode: string
}

export function useExpenseEntries(yearId: number | null, versionId: number | null) {
  return useQuery<ExpenseEntry[]>({
    queryKey: ['expense-entries', yearId, versionId],
    queryFn: async () => {
      const { data } = await api.get(`/expenses/${yearId}/entries`, {
        params: { versionId },
      })
      return data
    },
    enabled: yearId !== null && versionId !== null,
  })
}

export function useCreateExpenseEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (entry: CreateExpenseEntry) => {
      const { data } = await api.post(`/expenses/${entry.yearId}/entries`, {
        versionId: entry.versionId,
        categoryId: entry.categoryId,
        month: entry.month,
        amount: entry.amount,
        currencyCode: entry.currencyCode,
      })
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['expense-entries', variables.yearId, variables.versionId],
      })
    },
  })
}

export function useDeleteExpenseEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { id: number; yearId: number; versionId: number }) => {
      await api.delete(`/expenses/${params.yearId}/entries/${params.id}`)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['expense-entries', variables.yearId, variables.versionId],
      })
    },
  })
}
