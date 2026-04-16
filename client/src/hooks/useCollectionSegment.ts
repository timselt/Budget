import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import type { SegmentDashboard } from '../types/collections'

export function useCollectionSegment(segmentId: number | null) {
  return useQuery<SegmentDashboard>({
    queryKey: ['collections', 'segment', segmentId],
    queryFn: async () => {
      const { data } = await api.get(`/collections/dashboard/segment/${segmentId}`)
      return data
    },
    enabled: segmentId !== null,
  })
}
