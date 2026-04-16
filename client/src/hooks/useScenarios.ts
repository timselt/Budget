import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

export interface ScenarioParameters {
  revenueChangePct: number
  claimsChangePct: number
  expenseChangePct: number
}

export interface ScenarioDto {
  id: number
  name: string
  budgetVersionId: number
  parameters: ScenarioParameters
  createdAt: string
}

export interface PnlLineItems {
  totalRevenue: number
  totalClaims: number
  technicalMargin: number
  generalExpenses: number
  technicalExpenses: number
  technicalProfit: number
  financialIncome: number
  financialExpenses: number
  netProfit: number
  ebitda: number
  lossRatio: number
  combinedRatio: number
  profitRatio: number
}

export interface ScenarioPnlResult {
  scenarioId: number
  scenarioName: string
  base: PnlLineItems
  scenario: PnlLineItems
  delta: PnlLineItems
}

export interface ScenarioComparisonItem {
  scenarioId: number
  scenarioName: string
  parameters: ScenarioParameters
  pnl: PnlLineItems
  delta: PnlLineItems
}

export interface ScenarioComparisonResult {
  base: PnlLineItems
  scenarios: ScenarioComparisonItem[]
}

export function useScenarios(versionId: number | null) {
  return useQuery<ScenarioDto[]>({
    queryKey: ['scenarios', versionId],
    queryFn: async () => {
      const { data } = await api.get<ScenarioDto[]>('/scenarios', {
        params: { versionId },
      })
      return data
    },
    enabled: versionId !== null,
  })
}

export function useScenarioPnl(scenarioId: number | null) {
  return useQuery<ScenarioPnlResult>({
    queryKey: ['scenarios', scenarioId, 'pnl'],
    queryFn: async () => {
      const { data } = await api.get<ScenarioPnlResult>(
        `/scenarios/${scenarioId}/pnl`
      )
      return data
    },
    enabled: scenarioId !== null,
  })
}

export function useCreateScenario() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      name: string
      versionId: number
      parameters: ScenarioParameters
    }) => {
      const { data } = await api.post<ScenarioDto>('/scenarios', payload)
      return data
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['scenarios', variables.versionId],
      })
    },
  })
}

export function useDeleteScenario() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (scenarioId: number) => {
      await api.delete(`/scenarios/${scenarioId}`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['scenarios'] })
    },
  })
}

export function useCompareScenarios(scenarioIds: number[]) {
  return useQuery<ScenarioComparisonResult>({
    queryKey: ['scenarios', 'compare', scenarioIds],
    queryFn: async () => {
      const { data } = await api.post<ScenarioComparisonResult>(
        '/scenarios/compare',
        { scenarioIds }
      )
      return data
    },
    enabled: scenarioIds.length >= 2,
  })
}
