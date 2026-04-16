import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

export interface SegmentDataPoint {
  segmentId: number
  segmentName: string
  revenue: number
  revenueShare: number
  claims: number
  lossRatio: number
}

export function useDashboardSegments(versionId: number | null) {
  return useQuery<SegmentDataPoint[]>({
    queryKey: ['dashboard', 'segments', versionId],
    queryFn: async () => {
      const { data } = await api.get<SegmentDataPoint[]>(
        `/dashboard/${versionId}/segments`,
      )
      return data
    },
    enabled: versionId !== null,
  })
}
