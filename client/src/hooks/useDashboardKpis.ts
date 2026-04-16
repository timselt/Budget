import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

interface KpiResult {
  totalRevenue: number
  totalClaims: number
  technicalMargin: number
  lossRatio: number
  generalExpenses: number
  technicalExpenses: number
  technicalProfit: number
  financialIncome: number
  financialExpenses: number
  tKatilim: number
  depreciation: number
  netProfit: number
  ebitda: number
  expenseRatio: number
  combinedRatio: number
  ebitdaMargin: number
  technicalProfitRatio: number
  profitRatio: number
  muallakRatio: number
}

export function useDashboardKpis(versionId: number | null) {
  return useQuery<KpiResult>({
    queryKey: ['dashboard', 'kpis', versionId],
    queryFn: async () => {
      const { data } = await api.get(`/dashboard/${versionId}/kpis`)
      return data
    },
    enabled: versionId !== null,
  })
}
