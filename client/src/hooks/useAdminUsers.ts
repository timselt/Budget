import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

export interface AdminUser {
  id: number
  email: string
  displayName: string
  roles: string[]
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
}

export interface AdminCompany {
  id: number
  code: string
  name: string
  baseCurrencyCode: string
  createdAt: string
}

export function useAdminUsers() {
  return useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data } = await api.get<AdminUser[]>('/admin/users')
      return data
    },
  })
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const { data } = await api.put(`/admin/users/${userId}/role`, { role })
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
}

export function useAdminCompanies() {
  return useQuery<AdminCompany[]>({
    queryKey: ['admin-companies'],
    queryFn: async () => {
      const { data } = await api.get<AdminCompany[]>('/admin/companies')
      return data
    },
  })
}

export function useCreateCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { name: string; taxId: string }) => {
      const { data } = await api.post('/admin/companies', payload)
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-companies'] })
    },
  })
}
