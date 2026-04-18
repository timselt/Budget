import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

interface CustomerRow {
  id: number
  code: string
  name: string
  categoryCode: string | null
  subCategory: string | null
  taxId: string | null
  taxOffice: string | null
  segmentId: number
  segmentName: string | null
  startDate: string | null
  endDate: string | null
  isGroupInternal: boolean
  accountManager: string | null
  defaultCurrencyCode: string | null
  isActive: boolean
}

interface SegmentRow {
  id: number
  code: string
  name: string
  displayOrder: number
  isActive: boolean
}

type Tab = 'customers' | 'matrix'
type ModalState = { kind: 'none' } | { kind: 'create' } | { kind: 'edit'; customer: CustomerRow }

const CURRENCY_OPTIONS = ['TRY', 'EUR', 'USD', 'GBP'] as const

async function getCustomers(): Promise<CustomerRow[]> {
  const { data } = await api.get<CustomerRow[]>('/customers')
  return data
}

async function getSegments(): Promise<SegmentRow[]> {
  const { data } = await api.get<SegmentRow[]>('/segments')
  return data
}

export function CustomersPage() {
  const [tab, setTab] = useState<Tab>('customers')
  const [modal, setModal] = useState<ModalState>({ kind: 'none' })
  const [search, setSearch] = useState('')
  const [segmentFilter, setSegmentFilter] = useState<number | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'passive'>('all')
  const queryClient = useQueryClient()

  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: getCustomers })
  const segmentsQuery = useQuery({ queryKey: ['segments'], queryFn: getSegments })

  const customers = customersQuery.data ?? []
  const segments = segmentsQuery.data ?? []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return customers.filter((c) => {
      if (segmentFilter !== 'all' && c.segmentId !== segmentFilter) return false
      if (statusFilter === 'active' && !c.isActive) return false
      if (statusFilter === 'passive' && c.isActive) return false
      if (!q) return true
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.taxId ?? '').toLowerCase().includes(q)
      )
    })
  }, [customers, search, segmentFilter, statusFilter])

  const activeCount = customers.filter((c) => c.isActive).length
  const passiveCount = customers.length - activeCount
  const groupInternalCount = customers.filter((c) => c.isGroupInternal).length

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['customers'] })

  return (
    <section>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-on-surface">
            Müşteri Yönetimi
          </h2>
          <p className="text-sm text-on-surface-variant mt-2 max-w-2xl">
            Müşteri kaydı, sözleşme bilgileri ve ürün matrisi buradan yönetilir. Müşteri
            kategorileri (Segment) için{' '}
            <Link to="/segments" className="text-primary font-semibold hover:underline">
              Kategori Yönetimi
            </Link>
            'ne bakın.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setModal({ kind: 'create' })}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            person_add
          </span>
          Yeni Müşteri
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6 mb-6">
        <KpiCard title="Toplam Müşteri" value={`${customers.length}`} subtitle={`${activeCount} aktif · ${passiveCount} pasif`} />
        <KpiCard title="Kategori" value={`${segments.length}`} subtitle="Segment / müşteri kategorisi" />
        <KpiCard title="Grup İçi" value={`${groupInternalCount}`} subtitle="Konsolidasyonda elimine edilir" />
        <KpiCard title="Filtrelenen" value={`${filtered.length}`} subtitle="Arama + filtre sonucu" />
      </div>

      <div className="flex gap-1 mb-6 bg-surface-container-low rounded-lg p-1 w-fit">
        <TabButton active={tab === 'customers'} onClick={() => setTab('customers')} icon="business" label="Müşteriler" />
        <TabButton active={tab === 'matrix'} onClick={() => setTab('matrix')} icon="grid_view" label="Müşteri × Ürün Matrisi" />
      </div>

      {tab === 'customers' ? (
        <>
          <div className="card mb-4 flex flex-wrap gap-3 items-center">
            <div className="flex items-center bg-surface-container-high rounded-full px-4 py-2 flex-1 min-w-[240px] max-w-md">
              <span className="material-symbols-outlined text-on-surface-variant mr-2" style={{ fontSize: 20 }}>
                search
              </span>
              <input
                className="bg-transparent border-none p-0 w-full text-sm focus:outline-none"
                placeholder="Müşteri adı, kod, vergi no ara…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="select"
              value={segmentFilter}
              onChange={(e) => setSegmentFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            >
              <option value="all">Tüm Kategoriler</option>
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              className="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'passive')}
            >
              <option value="all">Tüm Durumlar</option>
              <option value="active">Aktif</option>
              <option value="passive">Pasif</option>
            </select>
          </div>

          <div className="card p-0 overflow-hidden">
            {customersQuery.isLoading ? (
              <div className="p-6 text-sm text-on-surface-variant">Müşteriler yükleniyor…</div>
            ) : customersQuery.isError ? (
              <div className="p-6 text-sm text-error">Müşteri verileri alınamadı.</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-sm text-on-surface-variant">
                {customers.length === 0
                  ? 'Henüz müşteri yok. "Yeni Müşteri" ile ekleyin.'
                  : 'Arama/filtre sonucu boş.'}
              </div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Kod</th>
                    <th>Müşteri Adı</th>
                    <th>Kategori</th>
                    <th>Alt Kategori</th>
                    <th>Vergi</th>
                    <th>Grup İçi</th>
                    <th>Durum</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((customer) => (
                    <tr key={customer.id}>
                      <td className="font-mono text-xs">{customer.code}</td>
                      <td>
                        <strong>{customer.name}</strong>
                        <p className="text-[0.65rem] text-on-surface-variant">
                          {customer.accountManager ?? '-'}
                        </p>
                      </td>
                      <td>
                        <span className="chip chip-info">{customer.segmentName ?? '-'}</span>
                      </td>
                      <td>{customer.subCategory ?? '-'}</td>
                      <td>
                        <div className="font-mono text-xs">{customer.taxId ?? '-'}</div>
                        <div className="text-[0.65rem] text-on-surface-variant">{customer.taxOffice ?? '-'}</div>
                      </td>
                      <td>
                        {customer.isGroupInternal ? (
                          <span className="chip chip-info">Elimine</span>
                        ) : (
                          <span className="chip chip-neutral">Hayır</span>
                        )}
                      </td>
                      <td>
                        <span className={`chip chip-${customer.isActive ? 'success' : 'warning'}`}>
                          {customer.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                          title="Düzenle"
                          onClick={() => setModal({ kind: 'edit', customer })}
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
        </>
      ) : null}

      {tab === 'matrix' ? (
        <CustomerProductsPanel customers={customers} />
      ) : null}

      {modal.kind !== 'none' ? (
        <CustomerModal
          mode={modal.kind === 'create' ? 'create' : 'edit'}
          customer={modal.kind === 'edit' ? modal.customer : null}
          segments={segments}
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

/* =====================================================================
   CustomerProductsPanel — müşteri × ürün bağlama (Adım 3)
   ===================================================================== */
interface CustomerProductRow {
  id: number
  customerId: number
  productId: number
  productCode: string
  productName: string
  productCategoryId: number
  productCategoryName: string | null
  unitPriceTry: number | null
  startDate: string | null
  endDate: string | null
  notes: string | null
  isActive: boolean
}

interface ProductOption {
  id: number
  code: string
  name: string
  productCategoryId: number
  productCategoryName: string | null
  defaultCurrencyCode: string | null
  isActive: boolean
}

async function getCustomerProducts(customerId: number): Promise<CustomerProductRow[]> {
  const { data } = await api.get<CustomerProductRow[]>(`/customers/${customerId}/products`)
  return data
}

async function getProductOptions(): Promise<ProductOption[]> {
  const { data } = await api.get<ProductOption[]>('/products?onlyActive=true')
  return data
}

type CpModal =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; link: CustomerProductRow }

function CustomerProductsPanel({ customers }: { customers: CustomerRow[] }) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    customers[0]?.id ?? null,
  )
  const [modal, setModal] = useState<CpModal>({ kind: 'none' })
  const queryClient = useQueryClient()

  const linksQuery = useQuery({
    queryKey: ['customer-products', selectedCustomerId],
    queryFn: () => (selectedCustomerId ? getCustomerProducts(selectedCustomerId) : Promise.resolve([])),
    enabled: selectedCustomerId !== null,
  })

  const productsQuery = useQuery({ queryKey: ['products-all-active'], queryFn: getProductOptions })

  const links = linksQuery.data ?? []
  const products = productsQuery.data ?? []
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) ?? null

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['customer-products', selectedCustomerId] })

  const linkedProductIds = useMemo(() => new Set(links.map((l) => l.productId)), [links])
  const availableProducts = useMemo(
    () => products.filter((p) => !linkedProductIds.has(p.id)),
    [products, linkedProductIds],
  )

  return (
    <>
      <div className="card mb-4 flex items-center gap-3 flex-wrap">
        <span className="label-sm">Müşteri</span>
        <select
          className="select"
          value={selectedCustomerId ?? ''}
          onChange={(e) => setSelectedCustomerId(e.target.value === '' ? null : Number(e.target.value))}
        >
          <option value="">— Seçin —</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>
        <div className="ml-auto">
          <button
            type="button"
            className="btn-primary"
            disabled={!selectedCustomerId}
            onClick={() => setModal({ kind: 'create' })}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              add_link
            </span>
            Ürün Bağla
          </button>
        </div>
      </div>

      {selectedCustomer ? (
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-on-surface">{selectedCustomer.name}</h3>
              <p className="text-xs text-on-surface-variant">
                {links.length} ürün bağlı · {links.filter((l) => l.isActive).length} aktif
              </p>
            </div>
          </div>
          {linksQuery.isLoading ? (
            <p className="px-6 pb-6 text-sm text-on-surface-variant">Yükleniyor...</p>
          ) : linksQuery.isError ? (
            <p className="px-6 pb-6 text-sm text-error">Veri alınamadı.</p>
          ) : links.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-on-surface-variant">
              Bu müşteriye henüz ürün bağlanmamış. "Ürün Bağla" ile başlayın.
            </p>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Kategori</th>
                  <th>Ürün</th>
                  <th className="text-right">Birim Fiyat (TL)</th>
                  <th>Başlangıç</th>
                  <th>Bitiş</th>
                  <th>Durum</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.id}>
                    <td className="text-on-surface-variant text-sm">{link.productCategoryName ?? '-'}</td>
                    <td>
                      <strong>{link.productName}</strong>
                      <p className="text-[0.65rem] font-mono text-on-surface-variant">{link.productCode}</p>
                    </td>
                    <td className="text-right num">
                      {link.unitPriceTry != null
                        ? link.unitPriceTry.toLocaleString('tr-TR', { minimumFractionDigits: 2 })
                        : '—'}
                    </td>
                    <td className="text-sm">{link.startDate ?? '—'}</td>
                    <td className="text-sm">{link.endDate ?? '—'}</td>
                    <td>
                      <span className={`chip ${link.isActive ? 'chip-success' : 'chip-neutral'}`}>
                        {link.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                        title="Düzenle"
                        onClick={() => setModal({ kind: 'edit', link })}
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
      ) : (
        <div className="card p-6">
          <p className="text-sm text-on-surface-variant">Bir müşteri seçin.</p>
        </div>
      )}

      {modal.kind !== 'none' && selectedCustomerId ? (
        <CustomerProductModal
          customerId={selectedCustomerId}
          mode={modal.kind === 'create' ? 'create' : 'edit'}
          link={modal.kind === 'edit' ? modal.link : null}
          availableProducts={availableProducts}
          allProducts={products}
          onClose={() => setModal({ kind: 'none' })}
          onSaved={() => {
            invalidate()
            setModal({ kind: 'none' })
          }}
        />
      ) : null}
    </>
  )
}

function CustomerProductModal({
  customerId,
  mode,
  link,
  availableProducts,
  allProducts,
  onClose,
  onSaved,
}: {
  customerId: number
  mode: 'create' | 'edit'
  link: CustomerProductRow | null
  availableProducts: ProductOption[]
  allProducts: ProductOption[]
  onClose: () => void
  onSaved: () => void
}) {
  const [productId, setProductId] = useState<number | ''>(
    link?.productId ?? availableProducts[0]?.id ?? '',
  )
  const [unitPriceTry, setUnitPriceTry] = useState<string>(
    link?.unitPriceTry != null ? String(link.unitPriceTry) : '',
  )
  const [startDate, setStartDate] = useState<string>(link?.startDate ?? '')
  const [endDate, setEndDate] = useState<string>(link?.endDate ?? '')
  const [notes, setNotes] = useState<string>(link?.notes ?? '')
  const [isActive, setIsActive] = useState<boolean>(link?.isActive ?? true)
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
      if (mode === 'create' && productId === '') throw new Error('Ürün seçimi zorunlu')
      const price = unitPriceTry.trim() ? Number(unitPriceTry) : null
      if (price !== null && (Number.isNaN(price) || price < 0))
        throw new Error('Birim fiyat negatif olamaz')
      if (startDate && endDate && endDate < startDate)
        throw new Error('Bitiş tarihi başlangıçtan önce olamaz')

      const body = {
        unitPriceTry: price,
        startDate: startDate || null,
        endDate: endDate || null,
        notes: notes.trim() || null,
      }
      if (mode === 'create') {
        await api.post(`/customers/${customerId}/products`, {
          productId: Number(productId),
          ...body,
        })
      } else if (link) {
        await api.put(`/customers/${customerId}/products/${link.id}`, {
          isActive,
          ...body,
        })
      }
    },
    onSuccess: () => onSaved(),
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Kayıt başarısız'),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!link) return
      await api.delete(`/customers/${customerId}/products/${link.id}`)
    },
    onSuccess: () => onSaved(),
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Silme başarısız'),
  })

  const productList = mode === 'create' ? availableProducts : allProducts

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
          <h3 className="text-lg font-bold text-on-surface">
            {mode === 'create' ? 'Ürün Bağla' : `Ürün: ${link?.productName}`}
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
          <Field label="Ürün *" className="col-span-2">
            <select
              className="select w-full"
              value={productId}
              onChange={(e) => setProductId(e.target.value === '' ? '' : Number(e.target.value))}
              required
              disabled={mode === 'edit'}
            >
              <option value="">— Seçin —</option>
              {productList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.productCategoryName ? `[${p.productCategoryName}] ` : ''}
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Birim Fiyat (TL) — opsiyonel">
            <input
              type="number"
              step="0.01"
              min={0}
              className="input w-full"
              value={unitPriceTry}
              onChange={(e) => setUnitPriceTry(e.target.value)}
              placeholder="Ör: 80.00"
            />
          </Field>
          <Field label="— boş />">
            <div />
          </Field>
          <Field label="Sözleşme Başlangıç">
            <input
              type="date"
              className="input w-full"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Field>
          <Field label="Sözleşme Bitiş">
            <input
              type="date"
              className="input w-full"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Field>
          <Field label="Notlar (opsiyonel)" className="col-span-2">
            <textarea
              className="input w-full"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          {mode === 'edit' ? (
            <Field label="Durum" className="col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
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
                  if (confirm('Bu ürün bağlantısı kaldırılacak. Emin misiniz?')) {
                    deleteMutation.mutate()
                  }
                }}
                disabled={deleteMutation.isPending}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  link_off
                </span>
                Kaldır
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

function KpiCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="col-span-12 md:col-span-3 card">
      <span className="label-sm">{title}</span>
      <p className="text-2xl font-black tracking-display num mt-2">{value}</p>
      <p className="text-xs text-on-surface-variant mt-1">{subtitle}</p>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: string
  label: string
}) {
  return (
    <button type="button" className={`tab ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: 16 }}>
        {icon}
      </span>
      {label}
    </button>
  )
}

/* =====================================================================
   CustomerModal — full CRUD
   ===================================================================== */
interface CustomerFormState {
  code: string
  name: string
  segmentId: number | ''
  categoryCode: string
  subCategory: string
  taxId: string
  taxOffice: string
  startDate: string
  endDate: string
  isGroupInternal: boolean
  accountManager: string
  defaultCurrencyCode: string
  notes: string
  isActive: boolean
}

function CustomerModal({
  mode,
  customer,
  segments,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit'
  customer: CustomerRow | null
  segments: SegmentRow[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<CustomerFormState>({
    code: customer?.code ?? '',
    name: customer?.name ?? '',
    segmentId: customer?.segmentId ?? (segments[0]?.id ?? ''),
    categoryCode: customer?.categoryCode ?? '',
    subCategory: customer?.subCategory ?? '',
    taxId: customer?.taxId ?? '',
    taxOffice: customer?.taxOffice ?? '',
    startDate: customer?.startDate ?? '',
    endDate: customer?.endDate ?? '',
    isGroupInternal: customer?.isGroupInternal ?? false,
    accountManager: customer?.accountManager ?? '',
    defaultCurrencyCode: customer?.defaultCurrencyCode ?? 'TRY',
    notes: '',
    isActive: customer?.isActive ?? true,
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
      if (form.segmentId === '') throw new Error('Kategori seçimi zorunlu')
      const payload = {
        name: form.name.trim(),
        segmentId: Number(form.segmentId),
        categoryCode: form.categoryCode.trim() || null,
        subCategory: form.subCategory.trim() || null,
        taxId: form.taxId.trim() || null,
        taxOffice: form.taxOffice.trim() || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        isGroupInternal: form.isGroupInternal,
        accountManager: form.accountManager.trim() || null,
        defaultCurrencyCode: form.defaultCurrencyCode || null,
        notes: form.notes.trim() || null,
      }
      if (mode === 'create') {
        await api.post('/customers', {
          code: form.code.trim(),
          ...payload,
        })
      } else if (customer) {
        await api.put(`/customers/${customer.id}`, {
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
      if (!customer) return
      await api.delete(`/customers/${customer.id}`)
    },
    onSuccess: () => onSaved(),
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Silme başarısız'),
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-3xl my-8"
        style={{ padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="text-lg font-bold text-on-surface">
            {mode === 'create' ? 'Yeni Müşteri' : `Müşteri: ${customer?.name}`}
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
          <Field label="Kategori *">
            <select
              className="select w-full"
              value={form.segmentId}
              onChange={(e) => setForm({ ...form, segmentId: e.target.value === '' ? '' : Number(e.target.value) })}
              required
            >
              <option value="">— Seçin —</option>
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Müşteri Adı (max 200)" className="col-span-2">
            <input
              className="input w-full"
              value={form.name}
              maxLength={200}
              required
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Alt Kategori / Kod (opsiyonel)">
            <input
              className="input w-full"
              value={form.categoryCode}
              maxLength={50}
              onChange={(e) => setForm({ ...form, categoryCode: e.target.value })}
            />
          </Field>
          <Field label="Alt Kategori Açıklaması (opsiyonel)">
            <input
              className="input w-full"
              value={form.subCategory}
              maxLength={100}
              onChange={(e) => setForm({ ...form, subCategory: e.target.value })}
            />
          </Field>
          <Field label="Vergi No (opsiyonel)">
            <input
              className="input w-full"
              value={form.taxId}
              maxLength={20}
              onChange={(e) => setForm({ ...form, taxId: e.target.value })}
            />
          </Field>
          <Field label="Vergi Dairesi (opsiyonel)">
            <input
              className="input w-full"
              value={form.taxOffice}
              maxLength={100}
              onChange={(e) => setForm({ ...form, taxOffice: e.target.value })}
            />
          </Field>
          <Field label="Sözleşme Başlangıç">
            <input
              type="date"
              className="input w-full"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </Field>
          <Field label="Sözleşme Bitiş">
            <input
              type="date"
              className="input w-full"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </Field>
          <Field label="Hesap Yöneticisi (opsiyonel)">
            <input
              className="input w-full"
              value={form.accountManager}
              maxLength={100}
              onChange={(e) => setForm({ ...form, accountManager: e.target.value })}
            />
          </Field>
          <Field label="Varsayılan Para Birimi">
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
          <Field label="Notlar (opsiyonel)" className="col-span-2">
            <textarea
              className="input w-full"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
          <div className="col-span-2 flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isGroupInternal}
                onChange={(e) => setForm({ ...form, isGroupInternal: e.target.checked })}
              />
              Grup İçi Müşteri (konsolidasyonda elimine edilir)
            </label>
            {mode === 'edit' ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Aktif
              </label>
            ) : null}
          </div>

          {error ? <p className="col-span-2 text-sm text-error">{error}</p> : null}

          <div className="col-span-2 flex items-center justify-between gap-2 mt-2">
            {mode === 'edit' ? (
              <button
                type="button"
                className="btn-tertiary"
                onClick={() => {
                  if (confirm('Bu müşteri pasifleştirilecek. Emin misiniz?')) {
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
