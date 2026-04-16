import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

export interface MonthlyDataPoint {
  month: number
  monthLabel: string
  revenue: number
  claims: number
  lossRatio: number
  combinedRatio: number
  ebitda: number
  cumulativeRevenue: number
  cumulativeBudgetTarget: number
  technicalProfit: number
  netProfit: number
  expenseRatio: number
  ebitdaMargin: number
  technicalMargin: number
}

export function useDashboardMonthly(versionId: number | null) {
  return useQuery<MonthlyDataPoint[]>({
    queryKey: ['dashboard', 'monthly', versionId],
    queryFn: async () => {
      const { data } = await api.get<MonthlyDataPoint[]>(
        `/dashboard/${versionId}/monthly`,
      )
      return data
    },
    enabled: versionId !== null,
  })
}
