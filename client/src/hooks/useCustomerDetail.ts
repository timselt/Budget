import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import type { Customer } from './useCustomers'

export function useCustomerDetail(customerId: number | null) {
  return useQuery<Customer>({
    queryKey: ['customers', customerId],
    queryFn: async () => {
      const { data } = await api.get<Customer>(`/customers/${customerId}`)
      return data
    },
    enabled: customerId !== null,
  })
}
