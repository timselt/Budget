import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { useAuthStore } from '../../stores/auth'
import type { BudgetVersionStatus } from '../budget-planning/types'
import { deriveTasks, IN_PROGRESS_STATES, type Task } from './taskCenterDerivation'

export type { Task }

interface VersionRow {
  id: number
  budgetYearId: number
  name: string
  status: string
  isActive: boolean
  rejectionReason: string | null
  createdAt: string
}
interface YearRow { id: number; year: number; isLocked: boolean }
interface CustomerRow { id: number; isActive: boolean }

/**
 * Görev Merkezi hook — mevcut TanStack Query cache'inden derivation yapar.
 * Yeni network call yok; aktif yıldaki versions + customers + entries'i
 * birleştirip rol-aware Task[] döner.
 */
export function useTaskCenter(): { tasks: Task[]; isLoading: boolean } {
  const { user } = useAuthStore()
  const roles = user?.roles ?? []

  const yearsQuery = useQuery({
    queryKey: ['budget-years'],
    queryFn: async () => (await api.get<YearRow[]>('/budget/years')).data,
  })
  const years = yearsQuery.data ?? []
  const currentYear =
    years.find((y) => y.year === new Date().getFullYear()) ?? years[0]

  const versionsQuery = useQuery({
    queryKey: ['budget-versions', currentYear?.id],
    queryFn: async () =>
      currentYear
        ? (await api.get<VersionRow[]>(`/budget/years/${currentYear.id}/versions`)).data
        : [],
    enabled: !!currentYear,
  })

  const customersQuery = useQuery({
    queryKey: ['customers'],
    queryFn: async () => (await api.get<CustomerRow[]>('/customers')).data,
  })

  const versions = versionsQuery.data ?? []
  const draftLikeIds = versions
    .filter((v) =>
      IN_PROGRESS_STATES.includes(v.status as BudgetVersionStatus),
    )
    .map((v) => v.id)

  const entriesQueries = useQuery({
    queryKey: ['budget-entries-multi', draftLikeIds.join(',')],
    queryFn: async () => {
      const out: Record<number, { customerId: number }[]> = {}
      for (const id of draftLikeIds) {
        try {
          const { data } = await api.get<{ customerId: number }[]>(
            `/budget/versions/${id}/entries`,
          )
          out[id] = data
        } catch {
          out[id] = []
        }
      }
      return out
    },
    enabled: draftLikeIds.length > 0,
  })

  const customerIds = (customersQuery.data ?? [])
    .filter((c) => c.isActive)
    .map((c) => c.id)

  const tasks = useMemo(
    () =>
      deriveTasks({
        versions,
        entriesPerVersion: entriesQueries.data ?? {},
        customerIds,
        roles,
      }),
    [versions, entriesQueries.data, customerIds, roles],
  )

  return {
    tasks,
    isLoading:
      yearsQuery.isLoading || versionsQuery.isLoading || customersQuery.isLoading,
  }
}
