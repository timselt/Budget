import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { formatAmount } from '../lib/number-format'
import { METRIC_LABELS } from '../lib/metric-labels'
import { PageIntro } from '../components/shared/PageIntro'
import { Modal } from '../shared/ui/Modal'

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

interface SpecialItemRow {
  id: number
  versionId: number | null
  budgetYearId: number
  itemType: string
  month: number | null
  amount: number
  currencyCode: string
  notes: string | null
}

const ITEM_TYPES: { value: string; label: string; hint: string }[] = [
  {
    value: 'MUALLAK_HASAR',
    label: 'Muallak Hasar',
    hint: 'Rapor edilmiş fakat henüz ödenmemiş hasar karşılığı',
  },
  {
    value: 'DEMO_FILO',
    label: 'Demo Filo',
    hint: 'Demo/gösterim amaçlı filo giderleri',
  },
  {
    value: 'FINANSAL_GELIR',
    label: METRIC_LABELS.financialIncome,
    hint: 'Faiz, kur farkı, mevduat gelirleri',
  },
  {
    value: 'T_KATILIM',
    label: 'Tur Assist Katılım',
    hint: 'Holding katılım payı',
  },
  {
    value: 'AMORTISMAN',
    label: 'Amortisman',
    hint: 'Demirbaş amortisman gideri',
  },
]

const MONTH_LABELS = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
]
const CURRENCIES = ['TRY', 'USD', 'EUR']

async function getYears(): Promise<BudgetYearRow[]> {
  const { data } = await api.get<BudgetYearRow[]>('/budget/years')
  return data
}

async function getVersions(yearId: number): Promise<BudgetVersionRow[]> {
  const { data } = await api.get<BudgetVersionRow[]>(`/budget/years/${yearId}/versions`)
  return data
}

async function getItems(yearId: number, versionId: number): Promise<SpecialItemRow[]> {
  const { data } = await api.get<SpecialItemRow[]>(
    `/special-items/${yearId}?versionId=${versionId}`,
  )
  return data
}

export function SpecialItemsPage() {
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

  const itemsQuery = useQuery({
    queryKey: ['special-items', yearId, versionId],
    queryFn: () => (yearId && versionId ? getItems(yearId, versionId) : Promise.resolve([])),
    enabled: yearId !== null && versionId !== null,
  })

  const items = itemsQuery.data ?? []

  const setYearId = setYearOverride
  const setVersionId = setVersionOverride

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['special-items', yearId, versionId] })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!yearId) return
      await api.delete(`/special-items/${yearId}/${id}`)
    },
    onSuccess: () => invalidate(),
  })

  const totalByType = (type: string): number =>
    items.filter((i) => i.itemType === type).reduce((sum, i) => sum + i.amount, 0)

  return (
    <section>
      <PageIntro
        title="Özel Kalemler"
        purpose="Normal gider veya gelir akışına girmeyen tek-seferlik / olağandışı kalemler (amortisman düzeltmesi, yasal provizyonlar, one-off kazanç/kayıplar). P&L raporunda ayrı bölümde görünür."
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
            Yeni Kalem
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

      {versionId ? (
        <div className="grid grid-cols-12 gap-6 mb-6">
          {ITEM_TYPES.map((t) => (
            <div key={t.value} className="col-span-12 md:col-span-4 lg:col-span-2 card">
              <span className="label-sm">{t.label}</span>
              <p className="text-lg font-black tracking-display num mt-2">
                {formatAmount(totalByType(t.value))}
              </p>
              <p className="text-xs text-on-surface-variant mt-1">
                {items.filter((i) => i.itemType === t.value).length} kayıt
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="card p-0 overflow-hidden">
        {!versionId ? (
          <p className="p-6 text-sm text-on-surface-variant">
            Özel kalem eklemek için önce yıl ve versiyon seçin.
          </p>
        ) : itemsQuery.isLoading ? (
          <p className="p-6 text-sm text-on-surface-variant">Yükleniyor...</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-on-surface-variant">
            Bu versiyon için henüz özel kalem yok. "Yeni Kalem" ile ekleyin.
          </p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Tip</th>
                <th>Ay</th>
                <th className="text-right">Tutar</th>
                <th>Döviz</th>
                <th>Not</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const typeDef = ITEM_TYPES.find((t) => t.value === i.itemType)
                return (
                  <tr key={i.id}>
                    <td className="font-semibold">{typeDef?.label ?? i.itemType}</td>
                    <td>{i.month ? MONTH_LABELS[i.month - 1] : 'Yıllık'}</td>
                    <td className="text-right num">{formatAmount(i.amount)}</td>
                    <td className="font-mono text-xs">{i.currencyCode}</td>
                    <td className="text-xs text-on-surface-variant">{i.notes ?? '—'}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="p-1 text-on-surface-variant hover:text-error transition-colors"
                        title="Sil"
                        onClick={() => {
                          if (confirm('Bu özel kalem silinecek. Emin misiniz?')) {
                            deleteMutation.mutate(i.id)
                          }
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                          delete
                        </span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && versionId && yearId ? (
        <SpecialItemModal
          yearId={yearId}
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

function SpecialItemModal({
  yearId,
  versionId,
  onClose,
  onSaved,
}: {
  yearId: number
  versionId: number
  onClose: () => void
  onSaved: () => void
}) {
  const [itemType, setItemType] = useState(ITEM_TYPES[0].value)
  const [month, setMonth] = useState<number | ''>('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('TRY')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const activeTypeDef = ITEM_TYPES.find((t) => t.value === itemType)

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = Number(amount)
      if (!Number.isFinite(parsed) || parsed < 0) throw new Error('Tutar 0 veya pozitif olmalı')
      await api.post(`/special-items/${yearId}?versionId=${versionId}`, {
        itemType,
        amount: parsed,
        currencyCode: currency,
        month: month === '' ? null : month,
        notes: notes.trim() || null,
      })
    },
    onSuccess: () => onSaved(),
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Kayıt başarısız'),
  })

  return (
    <Modal
      open
      onClose={onClose}
      title="Yeni Özel Kalem"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Vazgeç
          </button>
          <button
            type="submit"
            form="special-item-form"
            className="btn-primary"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </>
      }
    >
      <form
        id="special-item-form"
        className="grid grid-cols-2 gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          setError(null)
          mutation.mutate()
        }}
      >
          <label className="block col-span-2">
            <span className="label-sm block mb-1.5">Kalem Tipi</span>
            <select
              className="select w-full"
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
            >
              {ITEM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {activeTypeDef ? (
              <p className="text-xs text-on-surface-variant mt-1">{activeTypeDef.hint}</p>
            ) : null}
          </label>
          <label className="block">
            <span className="label-sm block mb-1.5">Ay (opsiyonel)</span>
            <select
              className="select w-full"
              value={month}
              onChange={(e) =>
                setMonth(e.target.value === '' ? '' : Number(e.target.value))
              }
            >
              <option value="">Yıllık (ay yok)</option>
              {MONTH_LABELS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {i + 1} — {m}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label-sm block mb-1.5">Para Birimi</span>
            <select
              className="select w-full"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block col-span-2">
            <span className="label-sm block mb-1.5">Tutar</span>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input w-full"
              value={amount}
              required
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="block col-span-2">
            <span className="label-sm block mb-1.5">Not (opsiyonel)</span>
            <input
              className="input w-full"
              value={notes}
              maxLength={500}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          {error ? <p className="col-span-2 text-sm text-error">{error}</p> : null}
      </form>
    </Modal>
  )
}
