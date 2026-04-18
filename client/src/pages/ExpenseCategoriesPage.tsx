import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

type Classification = 'Technical' | 'General' | 'Financial' | 'Extraordinary'

interface ExpenseCategoryRow {
  id: number
  code: string
  name: string
  classification: Classification
  displayOrder: number
  isActive: boolean
}

const CLASSIFICATIONS: { value: Classification; label: string; chip: string }[] = [
  { value: 'Technical', label: 'Teknik (doğrudan operasyonel)', chip: 'chip-error' },
  { value: 'General', label: 'Genel (ofis + yönetim)', chip: 'chip-neutral' },
  { value: 'Financial', label: 'Finansal (faiz, kur)', chip: 'chip-info' },
  { value: 'Extraordinary', label: 'Olağandışı (tek seferlik)', chip: 'chip-warning' },
]

type ModalState = { kind: 'none' } | { kind: 'create' } | { kind: 'edit'; category: ExpenseCategoryRow }

async function getCategories(): Promise<ExpenseCategoryRow[]> {
  const { data } = await api.get<ExpenseCategoryRow[]>('/expense-categories')
  return data
}

export function ExpenseCategoriesPage() {
  const [modal, setModal] = useState<ModalState>({ kind: 'none' })
  const queryClient = useQueryClient()

  const query = useQuery({ queryKey: ['expense-categories'], queryFn: getCategories })
  const categories = query.data ?? []
  const activeCount = categories.filter((c) => c.isActive).length

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['expense-categories'] })

  return (
    <section>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-on-surface">
            Gider Kategorileri
          </h2>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setModal({ kind: 'create' })}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            add
          </span>
          Yeni Kategori
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6 mb-6">
        <KpiCard title="Toplam" value={`${categories.length}`} subtitle={`${activeCount} aktif`} />
        {CLASSIFICATIONS.map((c) => (
          <KpiCard
            key={c.value}
            title={c.label.split(' (')[0]}
            value={`${categories.filter((cat) => cat.classification === c.value).length}`}
            subtitle={c.label}
          />
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        {query.isLoading ? (
          <p className="p-6 text-sm text-on-surface-variant">Yükleniyor...</p>
        ) : query.isError ? (
          <p className="p-6 text-sm text-error">Kategoriler alınamadı.</p>
        ) : categories.length === 0 ? (
          <p className="p-6 text-sm text-on-surface-variant">
            Henüz kategori yok. "Yeni Kategori" ile ekleyin.
          </p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Ad</th>
                <th>Sınıflandırma</th>
                <th>Sıra</th>
                <th>Durum</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => {
                const cls = CLASSIFICATIONS.find((c) => c.value === category.classification)
                return (
                  <tr key={category.id}>
                    <td className="font-mono text-xs">{category.code}</td>
                    <td className="font-semibold">{category.name}</td>
                    <td>
                      <span className={`chip ${cls?.chip ?? 'chip-neutral'}`}>
                        {cls?.label.split(' (')[0] ?? category.classification}
                      </span>
                    </td>
                    <td className="text-on-surface-variant text-sm">{category.displayOrder}</td>
                    <td>
                      <span className={`chip ${category.isActive ? 'chip-success' : 'chip-neutral'}`}>
                        {category.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                        title="Düzenle"
                        onClick={() => setModal({ kind: 'edit', category })}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                          edit
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

      {modal.kind !== 'none' ? (
        <CategoryModal
          mode={modal.kind === 'create' ? 'create' : 'edit'}
          category={modal.kind === 'edit' ? modal.category : null}
          onClose={() => setModal({ kind: 'none' })}
          onSaved={() => {
            invalidate()
            setModal({ kind: 'none' })
          }}
        />
      ) : null}
    </section>
  )
}

function KpiCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="col-span-12 md:col-span-3 card">
      <span className="label-sm">{title}</span>
      <p className="text-2xl font-black tracking-display num mt-2">{value}</p>
      <p className="text-xs text-on-surface-variant mt-1">{subtitle}</p>
    </div>
  )
}

interface CategoryFormState {
  code: string
  name: string
  classification: Classification
  displayOrder: number
  isActive: boolean
}

function CategoryModal({
  mode,
  category,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit'
  category: ExpenseCategoryRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<CategoryFormState>({
    code: category?.code ?? '',
    name: category?.name ?? '',
    classification: category?.classification ?? 'General',
    displayOrder: category?.displayOrder ?? (mode === 'create' ? 10 : 0),
    isActive: category?.isActive ?? true,
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        classification: form.classification,
        displayOrder: Number(form.displayOrder),
      }
      if (mode === 'create') {
        await api.post('/expense-categories', payload)
      } else if (category) {
        await api.put(`/expense-categories/${category.id}`, {
          ...payload,
          isActive: form.isActive,
        })
      }
    },
    onSuccess: () => onSaved(),
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Kayıt başarısız'),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!category) return
      await api.delete(`/expense-categories/${category.id}`)
    },
    onSuccess: () => onSaved(),
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Silme başarısız'),
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div className="card w-full max-w-xl" style={{ padding: 0 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="text-lg font-bold text-on-surface">
            {mode === 'create' ? 'Yeni Gider Kategorisi' : `Kategori: ${category?.name}`}
          </h3>
          <button
            type="button"
            className="p-1 text-on-surface-variant hover:text-primary transition-colors"
            onClick={onClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form
          className="grid grid-cols-2 gap-4 px-6 pb-6"
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            saveMutation.mutate()
          }}
        >
          <Field label="Kod (benzersiz, max 32)">
            <input
              className="input w-full"
              value={form.code}
              maxLength={32}
              required
              disabled={mode === 'edit'}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            />
          </Field>
          <Field label="Sıra">
            <input
              type="number"
              className="input w-full"
              min={0}
              value={form.displayOrder}
              onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
            />
          </Field>
          <Field label="Ad (max 128)" className="col-span-2">
            <input
              className="input w-full"
              value={form.name}
              maxLength={128}
              required
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Sınıflandırma" className="col-span-2">
            <select
              className="select w-full"
              value={form.classification}
              onChange={(e) => setForm({ ...form, classification: e.target.value as Classification })}
            >
              {CLASSIFICATIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          {mode === 'edit' ? (
            <Field label="Durum" className="col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Aktif
              </label>
            </Field>
          ) : null}

          {error ? <p className="col-span-2 text-sm text-error">{error}</p> : null}

          <div className="col-span-2 flex items-center justify-between gap-2 mt-2">
            {mode === 'edit' ? (
              <button
                type="button"
                className="btn-tertiary"
                onClick={() => {
                  if (confirm('Bu kategori pasifleştirilecek. Emin misiniz?')) {
                    deleteMutation.mutate()
                  }
                }}
                disabled={deleteMutation.isPending}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  delete
                </span>
                Pasifleştir
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Vazgeç
              </button>
              <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="label-sm block mb-1.5">{label}</span>
      {children}
    </label>
  )
}
