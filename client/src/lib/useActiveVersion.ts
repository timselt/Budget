import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from './api'

interface BudgetYearRow {
  id: number
  year: number
  isLocked: boolean
}

interface BudgetVersionRow {
  id: number
  budgetYearId: number
  name: string
  status: string
  isActive: boolean
}

/**
 * Dashboard/Variance/vs. sayfalarının bağlanacağı aktif versiyonu auto-seçer:
 * - En yeni yılın ACTIVE versiyonu
 * - Yoksa ACTIVE olan herhangi versiyon
 * - Yoksa DRAFT'ların sonuncusu
 * - Yoksa null (sayfa "veri yok" gösterir)
 */
export function useActiveVersion(): {
  versionId: number | null
  versionName: string | null
  yearId: number | null
  year: number | null
  isLoading: boolean
} {
  const yearsQuery = useQuery({
    queryKey: ['budget-years'],
    queryFn: async () => {
      const { data } = await api.get<BudgetYearRow[]>('/budget/years')
      return data
    },
  })

  const years = useMemo(() => yearsQuery.data ?? [], [yearsQuery.data])
  const latestYear = useMemo(
    () => [...years].sort((a, b) => b.year - a.year)[0] ?? null,
    [years],
  )

  const versionsQuery = useQuery({
    queryKey: ['budget-versions', latestYear?.id],
    queryFn: async () => {
      if (!latestYear) return []
      const { data } = await api.get<BudgetVersionRow[]>(
        `/budget/years/${latestYear.id}/versions`,
      )
      return data
    },
    enabled: latestYear !== null,
  })

  const versions = useMemo(() => versionsQuery.data ?? [], [versionsQuery.data])
  const activeVersion = useMemo(() => {
    if (versions.length === 0) return null
    return (
      versions.find((v) => v.isActive) ??
      versions.find((v) => v.status === 'Active') ??
      versions.find((v) => v.status === 'Draft') ??
      versions[0]
    )
  }, [versions])

  return {
    versionId: activeVersion?.id ?? null,
    versionName: activeVersion?.name ?? null,
    yearId: latestYear?.id ?? null,
    year: latestYear?.year ?? null,
    isLoading: yearsQuery.isLoading || versionsQuery.isLoading,
  }
}
