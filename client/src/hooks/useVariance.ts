import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

export interface MonthlyVarianceDto {
  month: number
  budgetRevenue: number
  actualRevenue: number
  revenueVariance: number
  revenueVariancePercent: number
  budgetClaims: number
  actualClaims: number
  claimsVariance: number
  claimsVariancePercent: number
  revenueAlert: AlertSeverity | null
  claimsAlert: AlertSeverity | null
}

export interface VarianceSummaryResult {
  monthlyVariances: MonthlyVarianceDto[]
  totalBudgetRevenue: number
  totalActualRevenue: number
  totalBudgetClaims: number
  totalActualClaims: number
}

export interface CustomerVarianceDto {
  customerId: number
  customerName: string
  customerCode: string
  budgetRevenue: number
  actualRevenue: number
  revenueVariance: number
  revenueVariancePercent: number
  budgetClaims: number
  actualClaims: number
  claimsVariance: number
  claimsVariancePercent: number
  lossRatio: number
  alert: AlertSeverity | null
}

export interface HeatmapCell {
  customerId: number
  customerName: string
  month: number
  variancePercent: number
  alert: AlertSeverity | null
}

export type AlertSeverity = 'medium' | 'high' | 'critical'

export function useVarianceSummary(versionId: number | null) {
  return useQuery<VarianceSummaryResult>({
    queryKey: ['variance', 'summary', versionId],
    queryFn: async () => {
      const { data } = await api.get(`/variance/${versionId}/summary`)
      return data
    },
    enabled: versionId !== null,
  })
}

export function useCustomerVariance(versionId: number | null) {
  return useQuery<CustomerVarianceDto[]>({
    queryKey: ['variance', 'customers', versionId],
    queryFn: async () => {
      const { data } = await api.get(`/variance/${versionId}/customers`)
      return data
    },
    enabled: versionId !== null,
  })
}

export function useVarianceHeatmap(versionId: number | null) {
  return useQuery<HeatmapCell[]>({
    queryKey: ['variance', 'heatmap', versionId],
    queryFn: async () => {
      const { data } = await api.get(`/variance/${versionId}/heatmap`)
      return data
    },
    enabled: versionId !== null,
  })
}
