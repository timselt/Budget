import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import type { CustomerInvoiceDetail } from '../types/collections'

export function useCollectionCustomerInvoices(customerId: number | null) {
  return useQuery<CustomerInvoiceDetail[]>({
    queryKey: ['collections', 'customer-invoices', customerId],
    queryFn: async () => {
      const { data } = await api.get(`/collections/customers/${customerId}/invoices`)
      return data
    },
    enabled: customerId !== null,
  })
}
