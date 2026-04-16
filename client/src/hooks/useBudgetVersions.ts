import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import type { TimelineEntry } from '../components/approvals/ApprovalTimeline'

export interface BudgetVersion {
  id: number
  budgetYearId: number
  name: string
  status: string
  isActive: boolean
  rejectionReason?: string | null
  createdAt: string
  statusHistory?: readonly TimelineEntry[]
}

interface CreateVersionPayload {
  yearId: number
  name: string
}

interface RejectPayload {
  id: number
  reason: string
}

export function useBudgetVersions(yearId: number | null) {
  return useQuery<BudgetVersion[]>({
    queryKey: ['budget-versions', yearId],
    queryFn: async () => {
      const { data } = await api.get(`/budget/years/${yearId}/versions`)
      return data
    },
    enabled: yearId !== null,
  })
}

export function useBudgetVersion(id: number | null) {
  return useQuery<BudgetVersion>({
    queryKey: ['budget-versions', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get(`/budget/versions/${id}`)
      return data
    },
    enabled: id !== null,
  })
}

export function useCreateVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateVersionPayload) => {
      const { data } = await api.post(`/budget/years/${payload.yearId}/versions`, {
        name: payload.name,
      })
      return data as BudgetVersion
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['budget-versions', variables.yearId],
      })
    },
  })
}

export function useSubmitVersion(yearId: number | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post(`/budget/versions/${id}/submit`)
      return data as BudgetVersion
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['budget-versions', yearId],
      })
    },
  })
}

export function useApproveVersion(yearId: number | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, level }: { id: number; level: 'dept' | 'finance' | 'cfo' }) => {
      const { data } = await api.post(`/budget/versions/${id}/approve/${level}`)
      return data as BudgetVersion
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['budget-versions', yearId],
      })
    },
  })
}

export function useActivateVersion(yearId: number | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post(`/budget/versions/${id}/activate`)
      return data as BudgetVersion
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['budget-versions', yearId],
      })
    },
  })
}

export function useRejectVersion(yearId: number | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, reason }: RejectPayload) => {
      const { data } = await api.post(`/budget/versions/${id}/reject`, { reason })
      return data as BudgetVersion
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['budget-versions', yearId],
      })
    },
  })
}

export function useArchiveVersion(yearId: number | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post(`/budget/versions/${id}/archive`)
      return data as BudgetVersion
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['budget-versions', yearId],
      })
    },
  })
}

export function getApprovalLevel(
  status: string,
): 'dept' | 'finance' | 'cfo' | null {
  switch (status) {
    case 'SUBMITTED':
      return 'dept'
    case 'DEPT_APPROVED':
      return 'finance'
    case 'FINANCE_APPROVED':
      return 'cfo'
    default:
      return null
  }
}
