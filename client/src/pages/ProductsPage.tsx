import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

interface ProductCategoryRow {
  id: number
  code: string
  name: string
  description: string | null
  displayOrder: number
  segmentId: number | null
  segmentName: string | null
  isActive: boolean
}

interface ProductRow {
  id: number
  productCategoryId: number
  productCategoryName: string | null
  code: string
  name: string
  description: string | null
  coverageTermsJson: string | null
  defaultCurrencyCode: string | null
  displayOrder: number
  isActive: boolean
}

interface SegmentRow {
  id: number
  code: string
  name: string
}

type ModalState =
  | { kind: 'none' }
  | { kind: 'category'; mode: 'create' } | { kind: 'category'; mode: 'edit'; category: ProductCategoryRow }
  | { kind: 'product'; mode: 'create'; categoryId: number } | { kind: 'product'; mode: 'edit'; product: ProductRow }

const CURRENCY_OPTIONS = ['TRY', 'EUR', 'USD', 'GBP'] as const

async function getCategories(): Promise<ProductCategoryRow[]> {
  const { data } = await api.get<ProductCategoryRow[]>('/product-categories')
  return data
}

async function getProducts(categoryId: number | null): Promise<ProductRow[]> {
  const params = categoryId ? `?categoryId=${categoryId}` : ''
  const { data } = await api.get<ProductRow[]>(`/products${params}`)
  return data
}

async function getSegments(): Promise<SegmentRow[]> {
  const { data } = await api.get<SegmentRow[]>('/segments')
  return data
}

export function ProductsPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [modal, setModal] = useState<ModalState>({ kind: 'none' })
  const queryClient = useQueryClient()

  const categoriesQuery = useQuery({ queryKey: ['product-categories'], queryFn: getCategories })
  const productsQuery = useQuery({
    queryKey: ['products', selectedCategoryId],
    queryFn: () => getProducts(selectedCategoryId),
  })
  const segmentsQuery = useQuery({ queryKey: ['segments'], queryFn: getSegments })

  const categories = categoriesQuery.data ?? []
  const products = productsQuery.data ?? []
  const segments = segmentsQuery.data ?? []
  const activeCategoriesCount = categories.filter((c) => c.isActive).length
  const activeProductsCount = products.filter((p) => p.isActive).length
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null

  const invalidateCategories = () => queryClient.invalidateQueries({ queryKey: ['product-categories'] })
  const invalidateProducts = () => queryClient.invalidateQueries({ queryKey: ['products'] })

  return (
    <section>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-on-surface">
            Ürün Yönetimi
          </h2>
          <p className="text-sm text-on-surface-variant mt-2 max-w-2xl">
            Ürün kategorileri ve teminat-bazlı ürün kataloğu. Müşteri-ürün eşleşmesi ve
            bütçe girişinde referans alınan katalog buradan yönetilir (ADR-0013).
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setModal({ kind: 'category', mode: 'create' })}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              category
            </span>
            Yeni Kategori
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!selectedCategoryId}
            onClick={() => selectedCategoryId && setModal({ kind: 'product', mode: 'create', categoryId: selectedCategoryId })}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              add
            </span>
            Yeni Ürün
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 mb-6">
        <KpiCard title="Kategori" value={`${activeCategoriesCount} / ${categories.length}`} subtitle="Aktif / Toplam" />
        <KpiCard
          title="Ürün"
          value={`${activeProductsCount} / ${products.length}`}
          subtitle={selectedCategory ? `Kategori: ${selectedCategory.name}` : 'Tüm kategoriler'}
        />
        <KpiCard title="Teminat Parametreleri" value="JSONB" subtitle="Esnek alan (gün, sefer, limit TL)" />
        <KpiCard title="Müşteri Bağı" value="CustomerProduct" subtitle="Sözleşme tarihleri + notlar" />
      </div>

      <div className="grid grid-cols-12 gap-6">
        <aside className="col-span-12 lg:col-span-4 card p-0 overflow-hidden">
          <div className="p-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-on-surface">Kategoriler</h3>
            <button
              type="button"
              className="chip chip-neutral"
              onClick={() => setSelectedCategoryId(null)}
            >
              Tümü
            </button>
          </div>
          {categoriesQuery.isLoading ? (
            <p className="px-4 pb-4 text-sm text-on-surface-variant">Yükleniyor...</p>
          ) : categoriesQuery.isError ? (
            <p className="px-4 pb-4 text-sm text-error">Kategoriler alınamadı.</p>
          ) : categories.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-on-surface-variant">
              Henüz ürün kategorisi yok. "Yeni Kategori" ile ekleyin.
            </p>
          ) : (
            <ul className="divide-y divide-surface-container-low">
              {categories.map((category) => {
                const isSelected = category.id === selectedCategoryId
                return (
                  <li key={category.id}>
                    <div
                      className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
                        isSelected ? 'bg-surface-container-low' : 'hover:bg-surface-container-low/40'
                      }`}
                    >
                      <button
                        type="button"
                        className="flex-1 text-left"
                        onClick={() => setSelectedCategoryId(category.id)}
                      >
                        <p className="text-sm font-bold text-on-surface">{category.name}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {category.segmentName ?? 'Tüm segmentler'} · {category.code}
                        </p>
                      </button>
                      <div className="flex items-center gap-2">
                        <span className={`chip ${category.isActive ? 'chip-success' : 'chip-neutral'}`}>
                          {category.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                        <button
                          type="button"
                          className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                          title="Düzenle"
                          onClick={(e) => {
                            e.stopPropagation()
                            setModal({ kind: 'category', mode: 'edit', category })
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                            edit
                          </span>
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        <div className="col-span-12 lg:col-span-8 card p-0 overflow-hidden">
          <div className="p-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-on-surface">
                {selectedCategory ? `${selectedCategory.name} — Ürünler` : 'Tüm Ürünler'}
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {selectedCategory
                  ? `Kategori altındaki teminat-bazlı varyasyonlar (${selectedCategory.code}).`
                  : 'Filtre için sol listeden kategori seçin.'}
              </p>
            </div>
          </div>
          {productsQuery.isLoading ? (
            <p className="px-4 pb-4 text-sm text-on-surface-variant">Yükleniyor...</p>
          ) : productsQuery.isError ? (
            <p className="px-4 pb-4 text-sm text-error">Ürünler alınamadı.</p>
          ) : products.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-on-surface-variant">
              {selectedCategory
                ? 'Bu kategoride henüz ürün yok. "Yeni Ürün" ile ekleyin.'
                : 'Henüz ürün yok. Önce kategori seçin, ardından "Yeni Ürün" ile ekleyin.'}
            </p>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Kod</th>
                  <th>Ad</th>
                  <th>Kategori</th>
                  <th>Para Birimi</th>
                  <th>Durum</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="font-mono text-xs">{product.code}</td>
                    <td className="font-semibold">{product.name}</td>
                    <td className="text-on-surface-variant text-sm">
                      {product.productCategoryName ?? '-'}
                    </td>
                    <td className="text-on-surface-variant text-sm">
                      {product.defaultCurrencyCode ?? 'TRY'}
                    </td>
                    <td>
                      <span className={`chip ${product.isActive ? 'chip-success' : 'chip-neutral'}`}>
                        {product.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                        title="Düzenle"
                        onClick={() => setModal({ kind: 'product', mode: 'edit', product })}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                          edit
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal.kind === 'category' ? (
        <CategoryModal
          mode={modal.mode}
          category={modal.mode === 'edit' ? modal.category : null}
          segments={segments}
          onClose={() => setModal({ kind: 'none' })}
          onSaved={() => {
            invalidateCategories()
            setModal({ kind: 'none' })
          }}
        />
      ) : null}

      {modal.kind === 'product' ? (
        <ProductModal
          mode={modal.mode}
          product={modal.mode === 'edit' ? modal.product : null}
          categories={categories}
          defaultCategoryId={modal.mode === 'create' ? modal.categoryId : modal.product.productCategoryId}
          onClose={() => setModal({ kind: 'none' })}
          onSaved={() => {
            invalidateProducts()
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

/* =====================================================================
   Category Modal
   ===================================================================== */
interface CategoryFormState {
  code: string
  name: string
  description: string
  displayOrder: number
  segmentId: number | ''
  isActive: boolean
}

function CategoryModal({
  mode,
  category,
  segments,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit'
  category: ProductCategoryRow | null
  segments: SegmentRow[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<CategoryFormState>({
    code: category?.code ?? '',
    name: category?.name ?? '',
    description: category?.description ?? '',
    displayOrder: category?.displayOrder ?? (mode === 'create' ? 10 : 0),
    segmentId: category?.segmentId ?? '',
    isActive: category?.isActive ?? true,
  })
  const [error, setError] = useState<string | null>(null)

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        displayOrder: Number(form.displayOrder),
        segmentId: form.segmentId === '' ? null : Number(form.segmentId),
      }
      if (mode === 'create') {
        await api.post('/product-categories', payload)
      } else if (category) {
        await api.put(`/product-categories/${category.id}`, {
          ...payload,
          isActive: form.isActive,
        })
      }
    },
    onSuccess: () => onSaved(),
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Kayıt başarısız'
      setError(msg)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!category) return
      await api.delete(`/product-categories/${category.id}`)
    },
    onSuccess: () => onSaved(),
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Silme başarısız'
      setError(msg)
    },
  })

  return (
    <Modal title={mode === 'create' ? 'Yeni Kategori' : `Kategori: ${category?.name}`} onClose={onClose}>
      <form
        className="grid grid-cols-2 gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          setError(null)
          saveMutation.mutate()
        }}
      >
        <Field label="Kod (benzersiz, max 30)">
          <input
            className="input w-full"
            value={form.code}
            maxLength={30}
            required
            disabled={mode === 'edit'}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          />
        </Field>
        <Field label="Görüntülenme Sırası">
          <input
            type="number"
            className="input w-full"
            min={0}
            value={form.displayOrder}
            onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
          />
        </Field>
        <Field label="Ad (max 150)" className="col-span-2">
          <input
            className="input w-full"
            value={form.name}
            maxLength={150}
            required
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Açıklama (opsiyonel)" className="col-span-2">
          <textarea
            className="input w-full"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <Field label="Segment (opsiyonel — boş = tüm segmentler)" className="col-span-2">
          <select
            className="select w-full"
            value={form.segmentId}
            onChange={(e) => setForm({ ...form, segmentId: e.target.value === '' ? '' : Number(e.target.value) })}
          >
            <option value="">— Tüm segmentler —</option>
            {segments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
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

        {error ? (
          <p className="col-span-2 text-sm text-error">{error}</p>
        ) : null}

        <div className="col-span-2 flex items-center justify-between gap-2 mt-2">
          {mode === 'edit' ? (
            <button
              type="button"
              className="btn-tertiary"
              onClick={() => {
                if (confirm('Bu kategori pasifleştirilecek (soft delete). Emin misiniz?')) {
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
    </Modal>
  )
}

/* =====================================================================
   Product Modal
   ===================================================================== */
interface CoverageTermDraft {
  name: string
  description: string
  value: string
}

interface ProductFormState {
  productCategoryId: number
  code: string
  name: string
  description: string
  coverageTerms: CoverageTermDraft[]
  defaultCurrencyCode: string
  displayOrder: number
  isActive: boolean
}

function parseCoverageTermsJson(json: string | null): CoverageTermDraft[] {
  if (!json) return []
  try {
    const parsed = JSON.parse(json) as { coverages?: Array<Partial<CoverageTermDraft>> }
    if (!Array.isArray(parsed.coverages)) return []
    return parsed.coverages.map((term) => ({
      name: term.name ?? '',
      description: term.description ?? '',
      value: term.value ?? '',
    }))
  } catch {
    return []
  }
}

function serializeCoverageTerms(terms: CoverageTermDraft[]): string | null {
  const cleaned = terms
    .map((term) => ({
      name: term.name.trim(),
      description: term.description.trim(),
      value: term.value.trim(),
    }))
    .filter((term) => term.name.length > 0 || term.description.length > 0 || term.value.length > 0)
  if (cleaned.length === 0) return null
  // Value alanı opsiyonel — boşsa JSON'dan çıkar.
  const payload = cleaned.map((term) =>
    term.value ? term : { name: term.name, description: term.description },
  )
  return JSON.stringify({ coverages: payload })
}

function ProductModal({
  mode,
  product,
  categories,
  defaultCategoryId,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit'
  product: ProductRow | null
  categories: ProductCategoryRow[]
  defaultCategoryId: number
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<ProductFormState>({
    productCategoryId: product?.productCategoryId ?? defaultCategoryId,
    code: product?.code ?? '',
    name: product?.name ?? '',
    description: product?.description ?? '',
    coverageTerms: parseCoverageTermsJson(product?.coverageTermsJson ?? null),
    defaultCurrencyCode: product?.defaultCurrencyCode ?? 'TRY',
    displayOrder: product?.displayOrder ?? (mode === 'create' ? 10 : 0),
    isActive: product?.isActive ?? true,
  })
  const [error, setError] = useState<string | null>(null)

  // Her teminat için name + description zorunlu (muhasebe onayı 2026-04-18).
  const coverageValidation = useMemo(() => {
    for (let i = 0; i < form.coverageTerms.length; i++) {
      const term = form.coverageTerms[i]
      if (!term.name.trim()) return { ok: false, message: `Teminat #${i + 1}: ad zorunlu.` }
      if (!term.description.trim())
        return { ok: false, message: `Teminat #${i + 1}: açıklama zorunlu.` }
    }
    return { ok: true as const, message: '' }
  }, [form.coverageTerms])

  const updateCoverage = (index: number, patch: Partial<CoverageTermDraft>) => {
    setForm((prev) => ({
      ...prev,
      coverageTerms: prev.coverageTerms.map((term, i) => (i === index ? { ...term, ...patch } : term)),
    }))
  }

  const addCoverage = () => {
    setForm((prev) => ({
      ...prev,
      coverageTerms: [...prev.coverageTerms, { name: '', description: '', value: '' }],
    }))
  }

  const removeCoverage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      coverageTerms: prev.coverageTerms.filter((_, i) => i !== index),
    }))
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        productCategoryId: form.productCategoryId,
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        coverageTermsJson: serializeCoverageTerms(form.coverageTerms),
        defaultCurrencyCode: form.defaultCurrencyCode,
        displayOrder: Number(form.displayOrder),
      }
      if (mode === 'create') {
        await api.post('/products', payload)
      } else if (product) {
        await api.put(`/products/${product.id}`, { ...payload, isActive: form.isActive })
      }
    },
    onSuccess: () => onSaved(),
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Kayıt başarısız'
      setError(msg)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!product) return
      await api.delete(`/products/${product.id}`)
    },
    onSuccess: () => onSaved(),
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Silme başarısız'
      setError(msg)
    },
  })

  return (
    <Modal title={mode === 'create' ? 'Yeni Ürün' : `Ürün: ${product?.name}`} onClose={onClose}>
      <form
        className="grid grid-cols-2 gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          setError(null)
          if (!coverageValidation.ok) {
            setError(coverageValidation.message)
            return
          }
          saveMutation.mutate()
        }}
      >
        <Field label="Kategori" className="col-span-2">
          <select
            className="select w-full"
            value={form.productCategoryId}
            onChange={(e) => setForm({ ...form, productCategoryId: Number(e.target.value) })}
            required
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Kod (benzersiz, max 30)">
          <input
            className="input w-full"
            value={form.code}
            maxLength={30}
            required
            disabled={mode === 'edit'}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          />
        </Field>
        <Field label="Görüntülenme Sırası">
          <input
            type="number"
            className="input w-full"
            min={0}
            value={form.displayOrder}
            onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
          />
        </Field>
        <Field label="Ad (max 200)" className="col-span-2">
          <input
            className="input w-full"
            value={form.name}
            maxLength={200}
            required
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Açıklama (opsiyonel)" className="col-span-2">
          <textarea
            className="input w-full"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <Field label="Para Birimi">
          <select
            className="select w-full"
            value={form.defaultCurrencyCode}
            onChange={(e) => setForm({ ...form, defaultCurrencyCode: e.target.value })}
          >
            {CURRENCY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        {mode === 'edit' ? (
          <Field label="Durum">
            <label className="flex items-center gap-2 text-sm pt-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Aktif
            </label>
          </Field>
        ) : (
          <span />
        )}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-2">
            <span className="label-sm">Teminatlar (ad ve açıklama zorunlu)</span>
            <button
              type="button"
              className="chip chip-info"
              onClick={addCoverage}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                add
              </span>
              Yeni Teminat
            </button>
          </div>
          {form.coverageTerms.length === 0 ? (
            <p className="text-xs text-on-surface-variant italic">
              Bu ürüne henüz teminat eklenmemiş. "Yeni Teminat" ile ekleyebilirsiniz.
            </p>
          ) : (
            <div className="space-y-3">
              {form.coverageTerms.map((term, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 items-start bg-surface-container-low/40 rounded-lg p-3"
                >
                  <div className="col-span-12 md:col-span-3">
                    <input
                      className="input w-full text-sm"
                      placeholder="Ad *"
                      value={term.name}
                      onChange={(e) => updateCoverage(index, { name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-span-12 md:col-span-5">
                    <input
                      className="input w-full text-sm"
                      placeholder="Açıklama *"
                      value={term.description}
                      onChange={(e) => updateCoverage(index, { description: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-span-10 md:col-span-3">
                    <input
                      className="input w-full text-sm"
                      placeholder="Değer (opsiyonel)"
                      value={term.value}
                      onChange={(e) => updateCoverage(index, { value: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1 flex justify-end">
                    <button
                      type="button"
                      className="p-1 text-on-surface-variant hover:text-error transition-colors"
                      title="Teminatı kaldır"
                      onClick={() => removeCoverage(index)}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                        delete
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!coverageValidation.ok ? (
            <p className="text-xs text-error mt-2">{coverageValidation.message}</p>
          ) : null}
        </div>

        {error ? <p className="col-span-2 text-sm text-error">{error}</p> : null}

        <div className="col-span-2 flex items-center justify-between gap-2 mt-2">
          {mode === 'edit' ? (
            <button
              type="button"
              className="btn-tertiary"
              onClick={() => {
                if (confirm('Bu ürün pasifleştirilecek (soft delete). Emin misiniz?')) {
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
    </Modal>
  )
}

/* =====================================================================
   Generic Modal + Field
   ===================================================================== */
function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-2xl"
        style={{ padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="text-lg font-bold text-on-surface">{title}</h3>
          <button
            type="button"
            className="p-1 text-on-surface-variant hover:text-primary transition-colors"
            onClick={onClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="px-6 pb-6">{children}</div>
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
