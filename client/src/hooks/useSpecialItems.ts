import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

export type SpecialItemType =
  | 'MUALLAK_HASAR'
  | 'DEMO_FILO_HASARI'
  | 'FINANSAL_GELIR'
  | 'FINANSAL_GIDER'
  | 'T_KATILIM'
  | 'AMORTISMAN'

export interface SpecialItem {
  id: number
  type: SpecialItemType
  month: number
  amount: number
  currencyCode: string
}

interface CreateSpecialItem {
  versionId: number
  type: SpecialItemType
  month: number
  amount: number
  currencyCode: string
}

export const SPECIAL_ITEM_LABELS: Record<SpecialItemType, string> = {
  MUALLAK_HASAR: 'Muallak Hasar',
  DEMO_FILO_HASARI: 'Demo Filo Hasari',
  FINANSAL_GELIR: 'Finansal Gelir',
  FINANSAL_GIDER: 'Finansal Gider',
  T_KATILIM: 'T.Katilim',
  AMORTISMAN: 'Amortisman',
}

export const SPECIAL_ITEM_TYPES: readonly SpecialItemType[] = [
  'MUALLAK_HASAR',
  'DEMO_FILO_HASARI',
  'FINANSAL_GELIR',
  'FINANSAL_GIDER',
  'T_KATILIM',
  'AMORTISMAN',
] as const

export function useSpecialItems(versionId: number | null) {
  return useQuery<SpecialItem[]>({
    queryKey: ['special-items', versionId],
    queryFn: async () => {
      const { data } = await api.get('/special-items', {
        params: { versionId },
      })
      return data
    },
    enabled: versionId !== null,
  })
}

export function useCreateSpecialItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (item: CreateSpecialItem) => {
      const { data } = await api.post('/special-items', item)
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['special-items', variables.versionId],
      })
    },
  })
}

export function useDeleteSpecialItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { id: number; versionId: number }) => {
      await api.delete(`/special-items/${params.id}`)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['special-items', variables.versionId],
      })
    },
  })
}
