import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

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

interface ScenarioRow {
  id: number
  name: string
  budgetVersionId: number
  parameters: {
    revenueChangePct: number
    claimsChangePct: number
    expenseChangePct: number
  }
  createdAt: string
}

async function getYears(): Promise<BudgetYearRow[]> {
  const { data } = await api.get<BudgetYearRow[]>('/budget/years')
  return data
}

async function getVersions(yearId: number): Promise<BudgetVersionRow[]> {
  const { data } = await api.get<BudgetVersionRow[]>(`/budget/years/${yearId}/versions`)
  return data
}

async function getScenarios(versionId: number): Promise<ScenarioRow[]> {
  const { data } = await api.get<ScenarioRow[]>(`/scenarios?versionId=${versionId}`)
  return data
}

export function ScenariosPage() {
  const [yearOverride, setYearOverride] = useState<number | null>(null)
  const [versionOverride, setVersionOverride] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const queryClient = useQueryClient()

  const yearsQuery = useQuery({ queryKey: ['budget-years'], queryFn: getYears })

  const years = useMemo(() => yearsQuery.data ?? [], [yearsQuery.data])
  const yearId = useMemo(() => {
    if (yearOverride !== null && years.some((y) => y.id === yearOverride)) {
      return yearOverride
    }
    return years[0]?.id ?? null
  }, [yearOverride, years])

  const versionsQuery = useQuery({
    queryKey: ['budget-versions', yearId],
    queryFn: () => (yearId ? getVersions(yearId) : Promise.resolve([])),
    enabled: yearId !== null,
  })

  const versions = useMemo(() => versionsQuery.data ?? [], [versionsQuery.data])
  const versionId = useMemo(() => {
    if (versionOverride !== null && versions.some((v) => v.id === versionOverride)) {
      return versionOverride
    }
    return versions[0]?.id ?? null
  }, [versionOverride, versions])

  const scenariosQuery = useQuery({
    queryKey: ['scenarios', versionId],
    queryFn: () => (versionId ? getScenarios(versionId) : Promise.resolve([])),
    enabled: versionId !== null,
  })

  const scenarios = scenariosQuery.data ?? []

  const setYearId = setYearOverride
  const setVersionId = setVersionOverride

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['scenarios', versionId] })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/scenarios/${id}`)
    },
    onSuccess: () => invalidate(),
  })

  return (
    <section>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-on-surface">
            Senaryolar
          </h2>
        </div>
        <button
          type="button"
          className="btn-primary"
          disabled={!versionId}
          onClick={() => setShowModal(true)}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            add
          </span>
          Yeni Senaryo
        </button>
      </div>

      <div className="card mb-4 flex gap-3 flex-wrap items-center">
        <label className="label-sm">Yıl</label>
        <select
          className="select"
          value={yearId ?? ''}
          onChange={(e) => setYearId(e.target.value === '' ? null : Number(e.target.value))}
        >
          <option value="">—</option>
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.year}
            </option>
          ))}
        </select>
        <label className="label-sm">Versiyon</label>
        <select
          className="select"
          value={versionId ?? ''}
          onChange={(e) => setVersionId(e.target.value === '' ? null : Number(e.target.value))}
          disabled={!yearId}
        >
          <option value="">—</option>
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} — {v.status}
            </option>
          ))}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {!versionId ? (
          <p className="p-6 text-sm text-on-surface-variant">
            Senaryo eklemek için önce yıl ve versiyon seçin.
          </p>
        ) : scenariosQuery.isLoading ? (
          <p className="p-6 text-sm text-on-surface-variant">Yükleniyor...</p>
        ) : scenarios.length === 0 ? (
          <p className="p-6 text-sm text-on-surface-variant">
            Bu versiyon için henüz senaryo yok. "Yeni Senaryo" ile ekleyin.
          </p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Ad</th>
                <th className="text-right">Gelir Δ%</th>
                <th className="text-right">Hasar Δ%</th>
                <th className="text-right">Gider Δ%</th>
                <th>Oluşturuldu</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s) => (
                <tr key={s.id}>
                  <td className="font-semibold">{s.name}</td>
                  <td className="text-right num">
                    {formatPct(s.parameters.revenueChangePct)}
                  </td>
                  <td className="text-right num">
                    {formatPct(s.parameters.claimsChangePct)}
                  </td>
                  <td className="text-right num">
                    {formatPct(s.parameters.expenseChangePct)}
                  </td>
                  <td className="text-xs text-on-surface-variant">
                    {new Date(s.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="p-1 text-on-surface-variant hover:text-error transition-colors"
                      title="Sil"
                      onClick={() => {
                        if (confirm(`"${s.name}" senaryosu silinecek. Emin misiniz?`)) {
                          deleteMutation.mutate(s.id)
                        }
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                        delete
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && versionId ? (
        <ScenarioModal
          versionId={versionId}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            invalidate()
            setShowModal(false)
          }}
        />
      ) : null}
    </section>
  )
}

function formatPct(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

function ScenarioModal({
  versionId,
  onClose,
  onSaved,
}: {
  versionId: number
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [revenue, setRevenue] = useState(0)
  const [claims, setClaims] = useState(0)
  const [expense, setExpense] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/scenarios', {
        name: name.trim(),
        versionId,
        parameters: {
          revenueChangePct: revenue,
          claimsChangePct: claims,
          expenseChangePct: expense,
        },
      })
    },
    onSuccess: () => onSaved(),
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Oluşturulamadı'),
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-lg"
        style={{ padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="text-lg font-bold text-on-surface">Yeni Senaryo</h3>
          <button
            type="button"
            className="p-1 text-on-surface-variant hover:text-primary transition-colors"
            onClick={onClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form
          className="grid grid-cols-3 gap-4 px-6 pb-6"
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            mutation.mutate()
          }}
        >
          <label className="block col-span-3">
            <span className="label-sm block mb-1.5">Senaryo Adı</span>
            <input
              className="input w-full"
              value={name}
              required
              maxLength={100}
              placeholder="Ör: Optimistic, Resesyon, Volatil Kur"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="label-sm block mb-1.5">Gelir Δ%</span>
            <input
              type="number"
              step="0.1"
              className="input w-full"
              value={revenue}
              onChange={(e) => setRevenue(Number(e.target.value))}
            />
          </label>
          <label className="block">
            <span className="label-sm block mb-1.5">Hasar Δ%</span>
            <input
              type="number"
              step="0.1"
              className="input w-full"
              value={claims}
              onChange={(e) => setClaims(Number(e.target.value))}
            />
          </label>
          <label className="block">
            <span className="label-sm block mb-1.5">Gider Δ%</span>
            <input
              type="number"
              step="0.1"
              className="input w-full"
              value={expense}
              onChange={(e) => setExpense(Number(e.target.value))}
            />
          </label>
          <p className="col-span-3 text-xs text-on-surface-variant">
            Gelir +10% = %10 artış, −5% = %5 düşüş. Formül versiyon bazlı; sonuç P&L etkisini
            gösterir (/scenarios/&#123;id&#125;/pnl).
          </p>

          {error ? <p className="col-span-3 text-sm text-error">{error}</p> : null}

          <div className="col-span-3 flex gap-2 justify-end mt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Vazgeç
            </button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Oluşturuluyor…' : 'Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
