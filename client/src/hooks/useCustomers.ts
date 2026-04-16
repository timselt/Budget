import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

export interface CustomerMonthly {
  month: string
  revenue: number
  claims: number
  lossRatio: number
}

export interface Customer {
  id: number
  name: string
  segment: string
  revenue: number
  claims: number
  lossRatio: number
  profit: number
  monthlyTrend: CustomerMonthly[]
}

export interface SegmentPerformance {
  segmentId: number
  segmentName: string
  revenue: number
  claims: number
  lossRatio: number
  expenseRatio: number
  profitMargin: number
}

export interface Segment {
  id: number
  name: string
}

export function useCustomers() {
  return useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data } = await api.get<Customer[]>('/customers')
      return data
    },
  })
}

export function useSegments() {
  return useQuery<Segment[]>({
    queryKey: ['segments'],
    queryFn: async () => {
      const { data } = await api.get<Segment[]>('/segments')
      return data
    },
  })
}

export function useSegmentPerformance(segmentId: number | null, versionId: number | null) {
  return useQuery<SegmentPerformance>({
    queryKey: ['segments', segmentId, 'performance', versionId],
    queryFn: async () => {
      const { data } = await api.get<SegmentPerformance>(
        `/segments/${segmentId}/performance`,
        { params: { versionId } },
      )
      return data
    },
    enabled: segmentId !== null && versionId !== null,
  })
}
