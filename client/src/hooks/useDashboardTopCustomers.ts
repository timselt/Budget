import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

export interface TopCustomerDataPoint {
  customerId: number
  customerName: string
  revenue: number
  revenueShare: number
}

export function useDashboardTopCustomers(versionId: number | null) {
  return useQuery<TopCustomerDataPoint[]>({
    queryKey: ['dashboard', 'top-customers', versionId],
    queryFn: async () => {
      const { data } = await api.get<TopCustomerDataPoint[]>(
        `/dashboard/${versionId}/top-customers`,
      )
      return data
    },
    enabled: versionId !== null,
  })
}
