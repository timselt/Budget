import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import type { ImportPeriod } from '../types/collections'

export function useCollectionPeriods() {
  return useQuery<ImportPeriod[]>({
    queryKey: ['collections', 'periods'],
    queryFn: async () => {
      const { data } = await api.get('/collections/periods')
      return data
    },
  })
}
