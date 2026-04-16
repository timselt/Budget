import { useState } from 'react'
import type { ScenarioParameters } from '../../hooks/useScenarios'

interface ScenarioFormProps {
  onSubmit: (name: string, parameters: ScenarioParameters) => void
  isLoading: boolean
  scenarioCount: number
}

const PARAM_CONFIG = [
  { key: 'revenueChangePct' as const, label: 'Gelir Degisimi (%)', min: -50, max: 50 },
  { key: 'claimsChangePct' as const, label: 'Hasar Degisimi (%)', min: -50, max: 50 },
  { key: 'expenseChangePct' as const, label: 'Gider Degisimi (%)', min: -50, max: 50 },
] as const

export function ScenarioForm({ onSubmit, isLoading, scenarioCount }: ScenarioFormProps) {
  const [name, setName] = useState('')
  const [parameters, setParameters] = useState<ScenarioParameters>({
    revenueChangePct: 0,
    claimsChangePct: 0,
    expenseChangePct: 0,
  })

  const isMaxReached = scenarioCount >= 5

  function handleParamChange(key: keyof ScenarioParameters, value: number) {
    setParameters((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || isMaxReached) return
    onSubmit(name.trim(), parameters)
    setName('')
    setParameters({ revenueChangePct: 0, claimsChangePct: 0, expenseChangePct: 0 })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-sl-outline-variant/15 bg-surface-raised p-5">
      <h3 className="mb-4 text-base font-semibold tracking-tight">Yeni Senaryo</h3>

      <div className="mb-4">
        <label htmlFor="scenario-name" className="mb-1 block text-sm font-medium text-text-muted">
          Senaryo Adi
        </label>
        <input
          id="scenario-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="orn. Iyimser Senaryo"
          className="w-full rounded-lg border border-sl-outline-variant/15 bg-surface px-3 py-2 text-sm transition-colors focus:border-accent focus:outline-none"
          required
        />
      </div>

      <div className="space-y-4">
        {PARAM_CONFIG.map(({ key, label, min, max }) => (
          <div key={key}>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor={key} className="text-sm font-medium text-text-muted">
                {label}
              </label>
              <span
                className={`min-w-[3.5rem] text-right text-sm font-semibold tabular-nums ${
                  parameters[key] > 0
                    ? 'text-success'
                    : parameters[key] < 0
                      ? 'text-danger'
                      : 'text-text-muted'
                }`}
              >
                {parameters[key] > 0 ? '+' : ''}
                {parameters[key]}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                id={key}
                type="range"
                min={min}
                max={max}
                step={1}
                value={parameters[key]}
                onChange={(e) => handleParamChange(key, Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-accent"
              />
              <input
                type="number"
                min={min}
                max={max}
                step={0.5}
                value={parameters[key]}
                onChange={(e) => handleParamChange(key, Number(e.target.value))}
                className="w-20 rounded-lg border border-sl-outline-variant/15 bg-surface px-2 py-1 text-center text-sm tabular-nums transition-colors focus:border-accent focus:outline-none"
              />
            </div>
          </div>
        ))}
      </div>

      {isMaxReached && (
        <p className="mt-3 text-xs text-warning">
          Bir versiyon icin en fazla 5 senaryo olusturulabilir.
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading || !name.trim() || isMaxReached}
        className="mt-5 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? 'Olusturuluyor...' : 'Senaryo Olustur'}
      </button>
    </form>
  )
}
