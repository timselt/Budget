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
  versionId: number
  categoryId: number
  month: number
  amount: number
  currencyCode: string
}

export function useExpenseEntries(versionId: number | null) {
  return useQuery<ExpenseEntry[]>({
    queryKey: ['expense-entries', versionId],
    queryFn: async () => {
      const { data } = await api.get('/expense-entries', {
        params: { versionId },
      })
      return data
    },
    enabled: versionId !== null,
  })
}

export function useCreateExpenseEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (entry: CreateExpenseEntry) => {
      const { data } = await api.post('/expense-entries', entry)
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['expense-entries', variables.versionId],
      })
    },
  })
}

export function useDeleteExpenseEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { id: number; versionId: number }) => {
      await api.delete(`/expense-entries/${params.id}`)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['expense-entries', variables.versionId],
      })
    },
  })
}
