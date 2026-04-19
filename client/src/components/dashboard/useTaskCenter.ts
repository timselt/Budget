import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { useAuthStore } from '../../stores/auth'
import type { BudgetVersionStatus } from '../budget-planning/types'
import {
  deriveTasks,
  IN_PROGRESS_STATES,
  type Task,
  type VarianceSummary,
} from './taskCenterDerivation'

export type { Task }

/**
 * Backend VarianceSummaryResult shape (api/v1/variance/{versionId}/summary).
 * Sadece TaskCenter sapma türetmesi için minimal alan kümesi — service
 * interface'i `IVarianceService.GetVarianceSummaryAsync` içinde tanımlı.
 */
interface MonthlyVariance {
  revenueVariancePercent: number
  claimsVariancePercent: number
  revenueAlert: 'Medium' | 'High' | 'Critical' | null
  claimsAlert: 'Medium' | 'High' | 'Critical' | null
}
interface VarianceSummaryResult {
  monthlyVariances: MonthlyVariance[]
  totalBudgetRevenue: number
  totalActualRevenue: number
  totalBudgetClaims: number
  totalActualClaims: number
}

function summarizeVariance(raw: VarianceSummaryResult): VarianceSummary {
  const revPct =
    raw.totalBudgetRevenue !== 0
      ? ((raw.totalActualRevenue - raw.totalBudgetRevenue) /
          raw.totalBudgetRevenue) *
        100
      : 0
  const claimPct =
    raw.totalBudgetClaims !== 0
      ? ((raw.totalActualClaims - raw.totalBudgetClaims) /
          raw.totalBudgetClaims) *
        100
      : 0
  const totalVariancePercent =
    Math.abs(revPct) >= Math.abs(claimPct) ? revPct : claimPct
  const criticalCategoryCount = raw.monthlyVariances.filter(
    (m) => m.revenueAlert === 'Critical' || m.claimsAlert === 'Critical',
  ).length
  return { totalVariancePercent, criticalCategoryCount }
}

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
  const roles = useMemo(() => user?.roles ?? [], [user?.roles])

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

  const versions = useMemo(() => versionsQuery.data ?? [], [versionsQuery.data])
  const activeVersion = useMemo(
    () => versions.find((v) => v.status === 'Active') ?? null,
    [versions],
  )
  const draftLikeIds = versions
    .filter((v) =>
      IN_PROGRESS_STATES.includes(v.status as BudgetVersionStatus),
    )
    .map((v) => v.id)

  // Aktif versiyon varsa sapma özetini çek; sapma uyarısı task'ı için kullanılır.
  const varianceQuery = useQuery({
    queryKey: ['variance-summary', activeVersion?.id],
    queryFn: async () => {
      if (!activeVersion) return null
      const { data } = await api.get<VarianceSummaryResult>(
        `/variance/${activeVersion.id}/summary`,
      )
      return data
    },
    enabled: !!activeVersion,
    staleTime: 60_000,
  })

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

  const varianceByVersion = useMemo(() => {
    if (!activeVersion || !varianceQuery.data) return {}
    return { [activeVersion.id]: summarizeVariance(varianceQuery.data) }
  }, [activeVersion, varianceQuery.data])

  const tasks = useMemo(
    () =>
      deriveTasks({
        versions,
        entriesPerVersion: entriesQueries.data ?? {},
        customerIds,
        roles,
        varianceByVersion,
      }),
    [versions, entriesQueries.data, customerIds, roles, varianceByVersion],
  )

  return {
    tasks,
    isLoading:
      yearsQuery.isLoading || versionsQuery.isLoading || customersQuery.isLoading,
  }
}
