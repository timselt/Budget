import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import type { ConsolidatedDashboard } from '../types/collections'

export function useCollectionConsolidated() {
  return useQuery<ConsolidatedDashboard>({
    queryKey: ['collections', 'consolidated'],
    queryFn: async () => {
      const { data } = await api.get('/collections/dashboard/consolidated')
      return data
    },
  })
}
