import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { PageIntro } from '../components/shared/PageIntro'

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
  const [yearId, setYearId] = useState<number | null>(null)
  const [versionId, setVersionId] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const queryClient = useQueryClient()

  const yearsQuery = useQuery({ queryKey: ['budget-years'], queryFn: getYears })
  const versionsQuery = useQuery({
    queryKey: ['budget-versions', yearId],
    queryFn: () => (yearId ? getVersions(yearId) : Promise.resolve([])),
    enabled: yearId !== null,
  })
  const scenariosQuery = useQuery({
    queryKey: ['scenarios', versionId],
    queryFn: () => (versionId ? getScenarios(versionId) : Promise.resolve([])),
    enabled: versionId !== null,
  })

  const years = yearsQuery.data ?? []
  const versions = versionsQuery.data ?? []
  const scenarios = scenariosQuery.data ?? []

  useEffect(() => {
    if (yearId === null && years.length > 0) setYearId(years[0].id)
  }, [years, yearId])

  useEffect(() => {
    if (versionId === null && versions.length > 0) setVersionId(versions[0].id)
    if (versions.length === 0) setVersionId(null)
  }, [versions, versionId])

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
      <PageIntro
        title="Senaryolar"
        purpose="Gelir/hasar/gider varsayımlarını % bazında değiştirerek bütçenin hassasiyet analizini yapın. Senaryolar baz bütçeyi değiştirmez — Dashboard ve raporlarda karşılaştırmalı görünür."
        actions={
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
        }
      />

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

interface ScenarioPreset {
  id: 'optimistic' | 'base' | 'pessimistic' | 'custom'
  label: string
  emoji: string
  description: string
  revenue: number
  claims: number
  expense: number
  defaultName: string
}

const SCENARIO_PRESETS: ReadonlyArray<ScenarioPreset> = [
  {
    id: 'optimistic',
    label: 'İyimser',
    emoji: '🟢',
    description: 'Pazar büyümesi + hasar kontrolü + maliyet disiplini',
    revenue: 10,
    claims: -5,
    expense: -3,
    defaultName: 'İyimser Senaryo',
  },
  {
    id: 'base',
    label: 'Baz (Plan)',
    emoji: '🟡',
    description: 'Mevcut plan varsayımları — değişiklik yok',
    revenue: 0,
    claims: 0,
    expense: 0,
    defaultName: 'Baz Senaryo',
  },
  {
    id: 'pessimistic',
    label: 'Kötümser',
    emoji: '🔴',
    description: 'Resesyon + hasar artışı + maliyet baskısı',
    revenue: -10,
    claims: 15,
    expense: 5,
    defaultName: 'Kötümser Senaryo',
  },
  {
    id: 'custom',
    label: 'Özel',
    emoji: '⚙️',
    description: 'Kendi varsayımlarınızı manuel girin',
    revenue: 0,
    claims: 0,
    expense: 0,
    defaultName: '',
  },
]

function ScenarioModal({
  versionId,
  onClose,
  onSaved,
}: {
  versionId: number
  onClose: () => void
  onSaved: () => void
}) {
  const [presetId, setPresetId] = useState<ScenarioPreset['id']>('base')
  const [name, setName] = useState('Baz Senaryo')
  const [revenue, setRevenue] = useState(0)
  const [claims, setClaims] = useState(0)
  const [expense, setExpense] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const selectPreset = (preset: ScenarioPreset) => {
    setPresetId(preset.id)
    setName(preset.defaultName)
    setRevenue(preset.revenue)
    setClaims(preset.claims)
    setExpense(preset.expense)
  }

  // Mini etki özeti — kullanıcı varsayımları değiştirdikçe canlı hesap.
  // Net etki tahmini = gelir - hasar - gider (basitleştirilmiş net marj
  // delta, pp cinsinden). Gerçek backend sonucu /scenarios/{id}/pnl'den.
  const netImpactPp = revenue - claims - expense

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
          <div className="col-span-3">
            <span className="label-sm block mb-2">Hızlı Başlangıç</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {SCENARIO_PRESETS.map((preset) => {
                const selected = presetId === preset.id
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => selectPreset(preset)}
                    className={`text-left p-2 rounded-lg border transition-colors ${
                      selected
                        ? 'border-primary bg-primary/5'
                        : 'border-outline-variant hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="text-sm font-semibold flex items-center gap-1">
                      <span aria-hidden>{preset.emoji}</span>
                      {preset.label}
                    </div>
                    <p className="text-[0.65rem] text-on-surface-variant mt-1">
                      {preset.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

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
              onChange={(e) => {
                setRevenue(Number(e.target.value))
                setPresetId('custom')
              }}
            />
          </label>
          <label className="block">
            <span className="label-sm block mb-1.5">Hasar Δ%</span>
            <input
              type="number"
              step="0.1"
              className="input w-full"
              value={claims}
              onChange={(e) => {
                setClaims(Number(e.target.value))
                setPresetId('custom')
              }}
            />
          </label>
          <label className="block">
            <span className="label-sm block mb-1.5">Gider Δ%</span>
            <input
              type="number"
              step="0.1"
              className="input w-full"
              value={expense}
              onChange={(e) => {
                setExpense(Number(e.target.value))
                setPresetId('custom')
              }}
            />
          </label>

          {/* Mini etki özeti — kullanıcı değişimi anlık görür. */}
          <div
            className={`col-span-3 rounded-lg p-3 border-l-4 ${
              netImpactPp > 5
                ? 'bg-success/5 border-l-success'
                : netImpactPp < -5
                  ? 'bg-error/5 border-l-error'
                  : 'bg-surface-container-low border-l-on-surface-variant'
            }`}
          >
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Tahmini Net Etki (Marj Δpp)
            </p>
            <p className="text-2xl font-black num mt-1">
              {netImpactPp > 0 ? '+' : ''}
              {netImpactPp.toFixed(1)} pp
            </p>
            <p className="text-xs text-on-surface-variant mt-1">
              Gelir Δ − Hasar Δ − Gider Δ. Backend gerçek P&L hesabını
              /scenarios/&#123;id&#125;/pnl'den döner.
            </p>
          </div>

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
