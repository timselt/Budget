import { useState, useMemo } from 'react'
import {
  useScenarios,
  useScenarioPnl,
  useCreateScenario,
  useDeleteScenario,
  useCompareScenarios,
} from '../hooks/useScenarios'
import type { ScenarioParameters } from '../hooks/useScenarios'
import { ScenarioForm } from '../components/scenarios/ScenarioForm'
import { ScenarioPnlTable } from '../components/scenarios/ScenarioPnlTable'
import { TornadoChart } from '../components/scenarios/TornadoChart'

export function ScenarioPage() {
  // TODO: version selector — su an hardcoded versionId=1
  const versionId = 1

  const { data: scenarios, isLoading: isScenariosLoading } = useScenarios(versionId)
  const createMutation = useCreateScenario()
  const deleteMutation = useDeleteScenario()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [compareIds, setCompareIds] = useState<number[]>([])

  const { data: pnlData, isLoading: isPnlLoading } = useScenarioPnl(selectedId)
  const { data: comparisonData } = useCompareScenarios(compareIds)

  const scenarioList = scenarios ?? []

  const isCompareMode = compareIds.length >= 2

  function handleCreate(name: string, parameters: ScenarioParameters) {
    createMutation.mutate({ name, versionId, parameters })
  }

  function handleDelete(scenarioId: number) {
    if (selectedId === scenarioId) setSelectedId(null)
    setCompareIds((prev) => prev.filter((id) => id !== scenarioId))
    deleteMutation.mutate(scenarioId)
  }

  function toggleCompare(scenarioId: number) {
    setCompareIds((prev) =>
      prev.includes(scenarioId)
        ? prev.filter((id) => id !== scenarioId)
        : [...prev, scenarioId]
    )
  }

  const selectedScenario = useMemo(
    () => scenarioList.find((s) => s.id === selectedId) ?? null,
    [scenarioList, selectedId]
  )

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Senaryo Simulasyonu</h1>
        <p className="text-sm text-text-muted">
          Gelir, hasar ve gider parametrelerini degistirerek farkli senaryolari karsilastirin.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Sol panel: Form + Liste */}
        <aside className="space-y-5 xl:col-span-4">
          <ScenarioForm
            onSubmit={handleCreate}
            isLoading={createMutation.isPending}
            scenarioCount={scenarioList.length}
          />

          {isScenariosLoading && (
            <p className="text-sm text-text-muted">Senaryolar yukleniyor...</p>
          )}

          {scenarioList.length > 0 && (
            <div className="rounded-xl border border-border bg-surface-raised p-4">
              <h3 className="mb-3 text-base font-semibold tracking-tight">
                Senaryolar ({scenarioList.length}/5)
              </h3>
              <ul className="space-y-2">
                {scenarioList.map((s) => {
                  const isSelected = selectedId === s.id
                  const isInCompare = compareIds.includes(s.id)

                  return (
                    <li
                      key={s.id}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${
                        isSelected
                          ? 'border-accent bg-accent/5'
                          : 'border-border hover:border-accent/40'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(isSelected ? null : s.id)}
                        className="flex-1 text-left"
                      >
                        <span className="text-sm font-medium">{s.name}</span>
                        <span className="ml-2 text-xs text-text-muted">
                          G:{s.parameters.revenueChangePct > 0 ? '+' : ''}
                          {s.parameters.revenueChangePct}%
                          {' '}H:{s.parameters.claimsChangePct > 0 ? '+' : ''}
                          {s.parameters.claimsChangePct}%
                          {' '}Gd:{s.parameters.expenseChangePct > 0 ? '+' : ''}
                          {s.parameters.expenseChangePct}%
                        </span>
                      </button>

                      <div className="ml-2 flex items-center gap-1.5">
                        <label className="flex cursor-pointer items-center gap-1 text-xs text-text-muted">
                          <input
                            type="checkbox"
                            checked={isInCompare}
                            onChange={() => toggleCompare(s.id)}
                            className="accent-accent"
                          />
                          Kiy.
                        </label>
                        <button
                          type="button"
                          onClick={() => handleDelete(s.id)}
                          disabled={deleteMutation.isPending}
                          className="rounded p-1 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                          aria-label={`${s.name} senaryosunu sil`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="h-4 w-4"
                          >
                            <path
                              fillRule="evenodd"
                              d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </aside>

        {/* Sag panel: PnL tablo + Tornado chart */}
        <section className="space-y-6 xl:col-span-8">
          {isPnlLoading && selectedId !== null && (
            <p className="text-sm text-text-muted">PnL hesaplaniyor...</p>
          )}

          {pnlData && selectedScenario && !isCompareMode && (
            <ScenarioPnlTable
              scenarioName={pnlData.scenarioName}
              base={pnlData.base}
              scenario={pnlData.scenario}
              delta={pnlData.delta}
            />
          )}

          {isCompareMode && comparisonData && (
            <TornadoChart scenarios={comparisonData.scenarios} />
          )}

          {isCompareMode && comparisonData && (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-raised">
                    <th className="px-4 py-3 text-left font-semibold">Senaryo</th>
                    <th className="px-4 py-3 text-right font-semibold">Net Kar</th>
                    <th className="px-4 py-3 text-right font-semibold">EBITDA</th>
                    <th className="px-4 py-3 text-right font-semibold">Kar Marji</th>
                    <th className="px-4 py-3 text-right font-semibold">Bilesik Oran</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border bg-surface-raised/30">
                    <td className="px-4 py-2.5 font-semibold">Baz</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {formatCurrency(comparisonData.base.netProfit)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {formatCurrency(comparisonData.base.ebitda)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {formatRatio(comparisonData.base.profitRatio)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {formatRatio(comparisonData.base.combinedRatio)}
                    </td>
                  </tr>
                  {comparisonData.scenarios.map((s) => (
                    <tr key={s.scenarioId} className="border-b border-border/50 last:border-b-0">
                      <td className="px-4 py-2.5 font-medium">{s.scenarioName}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatCurrency(s.pnl.netProfit)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatCurrency(s.pnl.ebitda)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatRatio(s.pnl.profitRatio)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatRatio(s.pnl.combinedRatio)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!selectedId && !isCompareMode && (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border">
              <p className="text-sm text-text-muted">
                Detay gormek icin bir senaryo secin veya karsilastirma icin en az 2 senaryo isaretleyin.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatRatio(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}
