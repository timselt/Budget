import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

export interface ExpenseDataPoint {
  category: string
  amount: number
  share: number
}

export function useDashboardExpenses(versionId: number | null) {
  return useQuery<ExpenseDataPoint[]>({
    queryKey: ['dashboard', 'expenses', versionId],
    queryFn: async () => {
      const { data } = await api.get<ExpenseDataPoint[]>(
        `/dashboard/${versionId}/expenses`,
      )
      return data
    },
    enabled: versionId !== null,
  })
}
