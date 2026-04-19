import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { translateApiError } from '../lib/api-error'
import { formatAmount } from '../lib/number-format'
import { isEditableStatus, getStatusLabel } from '../components/budget-planning/types'
import { Stepper } from '../components/budget-planning/Stepper'
import { showToast } from '../components/shared/toast-bus'
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

interface ExpenseCategoryRow {
  id: number
  code: string
  name: string
  classification: string
  isActive: boolean
}

interface ExpenseEntryRow {
  id: number
  versionId: number | null
  budgetYearId: number
  categoryId: number
  categoryName: string | null
  month: number
  entryType: 'BUDGET' | 'ACTUAL'
  amountOriginal: number
  currencyCode: string
  amountTryFixed: number
  amountTrySpot: number
}

type EntryType = 'BUDGET' | 'ACTUAL'

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

async function getCategories(): Promise<ExpenseCategoryRow[]> {
  const { data } = await api.get<ExpenseCategoryRow[]>('/expense-categories')
  return data
}

async function getEntries(yearId: number, versionId: number): Promise<ExpenseEntryRow[]> {
  const { data } = await api.get<ExpenseEntryRow[]>(
    `/expenses/${yearId}/entries?versionId=${versionId}`,
  )
  return data
}

export function ExpenseEntriesPage() {
  const [yearOverride, setYearOverride] = useState<number | null>(null)
  const [versionOverride, setVersionOverride] = useState<number | null>(null)
  const [entryType, setEntryType] = useState<EntryType>('BUDGET')
  const [showModal, setShowModal] = useState(false)
  const queryClient = useQueryClient()

  const yearsQuery = useQuery({ queryKey: ['budget-years'], queryFn: getYears })
  const years = useMemo(() => yearsQuery.data ?? [], [yearsQuery.data])
  const yearId = useMemo<number | null>(() => {
    if (yearOverride !== null && years.some((y) => y.id === yearOverride)) {
      return yearOverride
    }
    if (years.length === 0) return null
    const now = new Date().getFullYear()
    return (years.find((y) => y.year === now) ?? years[0]).id
  }, [yearOverride, years])

  const versionsQuery = useQuery({
    queryKey: ['budget-versions', yearId],
    queryFn: () => (yearId ? getVersions(yearId) : Promise.resolve([])),
    enabled: yearId !== null,
  })
  const versions = useMemo(() => versionsQuery.data ?? [], [versionsQuery.data])
  // Önce düzenlenebilir versiyon (Draft/Rejected), yoksa Active, yoksa ilk
  const versionId = useMemo<number | null>(() => {
    if (versions.length === 0) return null
    if (versionOverride !== null && versions.some((v) => v.id === versionOverride)) {
      return versionOverride
    }
    const editable = versions.find((v) => isEditableStatus(v.status))
    if (editable) return editable.id
    const active = versions.find((v) => v.isActive)
    return (active ?? versions[0]).id
  }, [versionOverride, versions])

  const categoriesQuery = useQuery({ queryKey: ['expense-categories'], queryFn: getCategories })
  const entriesQuery = useQuery({
    queryKey: ['expense-entries', yearId, versionId],
    queryFn: () =>
      yearId && versionId ? getEntries(yearId, versionId) : Promise.resolve([]),
    enabled: yearId !== null && versionId !== null,
  })

  const categories = (categoriesQuery.data ?? []).filter((c) => c.isActive)
  const allEntries = entriesQuery.data ?? []
  const entries = allEntries.filter((e) => e.entryType === entryType)

  const setYearId = setYearOverride
  const setVersionId = setVersionOverride

  const currentVersion = versions.find((v) => v.id === versionId) ?? null
  const isEditable = isEditableStatus(currentVersion?.status)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['expense-entries', yearId, versionId] })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!yearId) return
      await api.delete(`/expenses/${yearId}/entries/${id}`)
    },
    onSuccess: () => invalidate(),
  })

  const monthlyTotal = (month: number): number =>
    entries.filter((e) => e.month === month).reduce((sum, e) => sum + e.amountTryFixed, 0)

  const grandTotal = entries.reduce((sum, e) => sum + e.amountTryFixed, 0)

  return (
    <section>
      <PageIntro
        title="Gider Girişi"
        purpose="OPEX kategorileri için aylık bütçe gider planı — Personel, Kira, BT/Altyapı vb. Tutarlar yıllık toplam KPI'lara ve P&L raporuna dahil olur. Sadece Taslak / Reddedildi versiyonlarda düzenlenebilir."
        actions={
          <button
            type="button"
            className="btn-primary"
            disabled={!versionId || !isEditable || categories.length === 0}
            title={
              !isEditable && currentVersion
                ? `Bu versiyon (${currentVersion.status}) düzenlenemez. Yeni gider eklemek için Taslak veya Reddedilen versiyon seçin.`
                : undefined
            }
            onClick={() => setShowModal(true)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              add
            </span>
            Yeni Gider
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
              {v.name} — {getStatusLabel(v.status)}
            </option>
          ))}
        </select>
        <label className="label-sm">Tip</label>
        <div className="inline-flex rounded-md overflow-hidden border border-outline-variant">
          {(['BUDGET', 'ACTUAL'] as EntryType[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                entryType === t ? 'bg-primary text-white' : 'bg-surface text-on-surface-variant'
              }`}
              onClick={() => setEntryType(t)}
            >
              {t === 'BUDGET' ? 'Bütçe' : 'Gerçekleşen'}
            </button>
          ))}
        </div>
      </div>

      {currentVersion && !isEditable ? (
        <div className="card mb-4 flex items-center gap-3 border-l-4 border-primary text-sm">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>
            lock
          </span>
          <div>
            <strong>{currentVersion.name}</strong> versiyonu{' '}
            <strong>{getStatusLabel(currentVersion.status)}</strong> — gider girişi
            yapılamaz.
            <br />
            <span className="text-xs text-on-surface-variant">
              Yeni gider eklemek için Bütçe Versiyonları sayfasından bir Taslak versiyon
              oluştur veya Reddedilen bir versiyon seç.
            </span>
          </div>
        </div>
      ) : null}

      <div className="card p-0 overflow-hidden">
        {!versionId ? (
          <p className="p-6 text-sm text-on-surface-variant">
            Gider girmek için önce yıl ve versiyon seçin.
          </p>
        ) : entriesQuery.isLoading ? (
          <p className="p-6 text-sm text-on-surface-variant">Yükleniyor...</p>
        ) : entries.length === 0 ? (
          <p className="p-6 text-sm text-on-surface-variant">
            Bu versiyon için henüz {entryType === 'BUDGET' ? 'bütçe' : 'gerçekleşen'} gider kaydı
            yok. "Yeni Gider" ile ekleyin.
          </p>
        ) : (
          <>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Kategori</th>
                  <th>Ay</th>
                  <th className="text-right">Tutar</th>
                  <th>Para Birimi</th>
                  <th className="text-right">TRY (Sabit)</th>
                  <th className="text-right">TRY (Spot)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="font-semibold">
                      {e.categoryName ?? `#${e.categoryId}`}
                    </td>
                    <td>{MONTH_LABELS[e.month - 1]}</td>
                    <td className="text-right num">{formatAmount(e.amountOriginal)}</td>
                    <td className="font-mono text-xs">{e.currencyCode}</td>
                    <td className="text-right num">{formatAmount(e.amountTryFixed)}</td>
                    <td className="text-right num text-on-surface-variant">
                      {formatAmount(e.amountTrySpot)}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="p-1 text-on-surface-variant hover:text-error transition-colors"
                        title="Sil"
                        onClick={() => {
                          if (confirm('Bu gider kaydı silinecek. Emin misiniz?')) {
                            deleteMutation.mutate(e.id)
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
            <div className="px-6 py-3 border-t border-outline-variant grid grid-cols-13 gap-2 text-xs">
              <span className="col-span-1 label-sm">Aylık:</span>
              {MONTH_LABELS.map((m, i) => (
                <div key={m} className="text-right">
                  <div className="text-on-surface-variant">{m}</div>
                  <div className="num font-semibold">{formatAmount(monthlyTotal(i + 1))}</div>
                </div>
              ))}
            </div>
            <div className="px-6 py-3 border-t border-outline-variant flex justify-between text-sm">
              <span className="label-sm">Toplam ({entries.length} kayıt)</span>
              <span className="num font-bold">{formatAmount(grandTotal)} TRY</span>
            </div>
          </>
        )}
      </div>

      {showModal && versionId && yearId ? (
        <ExpenseEntryModal
          yearId={yearId}
          versionId={versionId}
          entryType={entryType}
          categories={categories}
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

function ExpenseEntryModal({
  yearId,
  versionId,
  entryType,
  categories,
  onClose,
  onSaved,
}: {
  yearId: number
  versionId: number
  entryType: EntryType
  categories: ExpenseCategoryRow[]
  onClose: () => void
  onSaved: () => void
}) {
  const [categoryId, setCategoryId] = useState<number | ''>(categories[0]?.id ?? '')
  const [month, setMonth] = useState(1)
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('TRY')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Visual stepper — alanlar tamamlandıkça current adım ilerler
  const currentStep =
    categoryId === '' ? 1 : !month ? 2 : Number(amount) <= 0 ? 3 : 4

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const mutation = useMutation({
    mutationFn: async () => {
      if (categoryId === '') throw new Error('Kategori seçiniz')
      const parsed = Number(amount)
      if (!Number.isFinite(parsed) || parsed < 0) throw new Error('Tutar 0 veya pozitif olmalı')
      await api.post(`/expenses/${yearId}/entries?versionId=${versionId}`, {
        categoryId,
        month,
        entryType,
        amountOriginal: parsed,
        currencyCode: currency,
        notes: notes.trim() || null,
      })
    },
    onSuccess: () => {
      const catName = categories.find((c) => c.id === categoryId)?.name ?? 'Kayıt'
      const ay = MONTH_LABELS[month - 1] ?? '?'
      showToast(`✓ "${catName} — ${ay}" gideri eklendi.`)
      onSaved()
    },
    onError: (e: unknown) => setError(translateApiError(e, { resource: 'expense' })),
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
        <div className="flex items-center justify-between px-6 pt-4 pb-2">
          <h3 className="text-lg font-bold text-on-surface">
            Yeni Gider ({entryType === 'BUDGET' ? 'Bütçe' : 'Gerçekleşen'})
          </h3>
          <button
            type="button"
            className="p-1 text-on-surface-variant hover:text-primary transition-colors"
            onClick={onClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="px-6 pb-2">
          <Stepper
            steps={[
              { label: 'Kategori' },
              { label: 'Ay' },
              { label: 'Tutar' },
              { label: 'Onay' },
            ]}
            current={currentStep}
          />
        </div>
        <form
          className="grid grid-cols-2 gap-4 px-6 pb-6"
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            mutation.mutate()
          }}
        >
          <label className="block col-span-2">
            <span className="label-sm block mb-1.5">Gider Kategorisi</span>
            <select
              className="select w-full"
              value={categoryId}
              required
              onChange={(e) =>
                setCategoryId(e.target.value === '' ? '' : Number(e.target.value))
              }
            >
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label-sm block mb-1.5">Ay</span>
            <select
              className="select w-full"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
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
            <span className="label-sm block mb-1.5">Tutar (Orijinal Döviz)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input w-full"
              value={amount}
              required
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ör: 12500.00"
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

          <div className="col-span-2 flex gap-2 justify-end mt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Vazgeç
            </button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
