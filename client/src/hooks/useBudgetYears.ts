import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

export interface BudgetYear {
  id: number
  year: number
  isLocked: boolean
}

export function useBudgetYears() {
  return useQuery<BudgetYear[]>({
    queryKey: ['budget-years'],
    queryFn: async () => {
      const { data } = await api.get('/budget/years')
      return data
    },
  })
}
