import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

export interface FxRate {
  id: number
  currencyCode: string
  rateDate: string
  rateValue: number
  source: string
  isYearStartFixed: boolean
}

interface ManualRatePayload {
  currencyCode: string
  rateDate: string
  rateValue: number
  isYearStartFixed: boolean
}

interface SyncResult {
  date: string
  syncedCount: number
}

export function useFxRates(date?: string, currency?: string) {
  return useQuery<FxRate[]>({
    queryKey: ['fx-rates', date, currency],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (date) params.date = date
      if (currency) params.currency = currency

      const { data } = await api.get<FxRate[]>('/fx/rates', { params })
      return data
    },
  })
}

export function useCreateManualRate() {
  const queryClient = useQueryClient()

  return useMutation<FxRate, Error, ManualRatePayload>({
    mutationFn: async (payload) => {
      const { data } = await api.post<FxRate>('/fx/rates/manual', payload)
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['fx-rates'] })
    },
  })
}

export function useSyncTcmb() {
  const queryClient = useQueryClient()

  return useMutation<SyncResult, Error, string | undefined>({
    mutationFn: async (date) => {
      const params = date ? { date } : {}
      const { data } = await api.post<SyncResult>('/fx/rates/sync', null, { params })
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['fx-rates'] })
    },
  })
}
