import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

export interface AuditLogDto {
  id: number
  userId: number | null
  userDisplayName: string | null
  entityName: string
  entityKey: string
  action: string
  oldValuesJson: string | null
  newValuesJson: string | null
  ipAddress: string | null
  createdAt: string
}

export interface PagedAuditResult {
  items: AuditLogDto[]
  totalCount: number
  page: number
  limit: number
}

export interface AuditLogFilters {
  userId?: number
  entityType?: string
  from?: string
  to?: string
  page: number
  limit: number
}

export function useAuditLogs(filters: AuditLogFilters) {
  return useQuery<PagedAuditResult>({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page: filters.page,
        limit: filters.limit,
      }
      if (filters.userId) params.userId = filters.userId
      if (filters.entityType) params.entityType = filters.entityType
      if (filters.from) params.from = filters.from
      if (filters.to) params.to = filters.to

      const { data } = await api.get<PagedAuditResult>('/audit-logs', { params })
      return data
    },
  })
}
