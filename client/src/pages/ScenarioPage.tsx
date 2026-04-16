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
      <header className="mb-12">
        <h1 className="font-headline text-4xl font-bold tracking-[-0.02em] text-sl-on-surface">
          Senaryo Simulasyonu
        </h1>
        <p className="font-body text-lg text-sl-on-surface-variant mt-2 max-w-2xl">
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
            <p className="font-body text-sm text-sl-on-surface-variant">
              Senaryolar yukleniyor...
            </p>
          )}

          {scenarioList.length > 0 && (
            <div className="rounded-xl bg-sl-surface-lowest p-8 shadow-[0_12px_32px_rgba(25,28,31,0.04)]">
              <h3 className="mb-3 font-headline text-base font-semibold tracking-tight text-sl-on-surface">
                Senaryolar ({scenarioList.length}/5)
              </h3>
              <ul className="space-y-2">
                {scenarioList.map((s) => {
                  const isSelected = selectedId === s.id
                  const isInCompare = compareIds.includes(s.id)

                  return (
                    <li
                      key={s.id}
                      className={`flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors ${
                        isSelected
                          ? 'bg-sl-primary-fixed/30'
                          : 'hover:bg-sl-surface-low'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(isSelected ? null : s.id)}
                        className="flex-1 text-left"
                      >
                        <span className="font-body text-sm font-medium text-sl-on-surface">
                          {s.name}
                        </span>
                        <span className="ml-2 font-body text-xs text-sl-on-surface-variant">
                          G:{s.parameters.revenueChangePct > 0 ? '+' : ''}
                          {s.parameters.revenueChangePct}%
                          {' '}H:{s.parameters.claimsChangePct > 0 ? '+' : ''}
                          {s.parameters.claimsChangePct}%
                          {' '}Gd:{s.parameters.expenseChangePct > 0 ? '+' : ''}
                          {s.parameters.expenseChangePct}%
                        </span>
                      </button>

                      <div className="ml-2 flex items-center gap-1.5">
                        <label className="flex cursor-pointer items-center gap-1 font-body text-xs text-sl-on-surface-variant">
                          <input
                            type="checkbox"
                            checked={isInCompare}
                            onChange={() => toggleCompare(s.id)}
                            className="accent-sl-primary"
                          />
                          Kiy.
                        </label>
                        <button
                          type="button"
                          onClick={() => handleDelete(s.id)}
                          disabled={deleteMutation.isPending}
                          className="rounded p-1 text-sl-on-surface-variant transition-colors hover:bg-sl-error-container/30 hover:text-sl-error"
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
            <p className="font-body text-sm text-sl-on-surface-variant">
              PnL hesaplaniyor...
            </p>
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
            <div className="overflow-x-auto rounded-xl bg-sl-surface-lowest shadow-[0_12px_32px_rgba(25,28,31,0.04)]">
              <table className="w-full font-body text-sm">
                <thead>
                  <tr className="bg-sl-surface-low">
                    <th className="px-4 py-3 text-left font-semibold text-sl-on-surface">
                      Senaryo
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-sl-on-surface">
                      Net Kar
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-sl-on-surface">
                      EBITDA
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-sl-on-surface">
                      Kar Marji
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-sl-on-surface">
                      Bilesik Oran
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-sl-surface-low/40">
                    <td className="px-4 py-2.5 font-semibold text-sl-on-surface">Baz</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-sl-on-surface">
                      {formatCurrency(comparisonData.base.netProfit)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-sl-on-surface">
                      {formatCurrency(comparisonData.base.ebitda)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-sl-on-surface">
                      {formatRatio(comparisonData.base.profitRatio)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-sl-on-surface">
                      {formatRatio(comparisonData.base.combinedRatio)}
                    </td>
                  </tr>
                  {comparisonData.scenarios.map((s) => (
                    <tr key={s.scenarioId}>
                      <td className="px-4 py-2.5 font-medium text-sl-on-surface">
                        {s.scenarioName}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-sl-on-surface-variant">
                        {formatCurrency(s.pnl.netProfit)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-sl-on-surface-variant">
                        {formatCurrency(s.pnl.ebitda)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-sl-on-surface-variant">
                        {formatRatio(s.pnl.profitRatio)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-sl-on-surface-variant">
                        {formatRatio(s.pnl.combinedRatio)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!selectedId && !isCompareMode && (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-sl-outline-variant/15 bg-sl-surface-low">
              <p className="font-body text-sm text-sl-on-surface-variant">
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
