import { useEffect, useMemo, useState } from 'react'
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
  externalCustomerRef: string | null
  externalSourceSystem: string | null
  externalRefVerifiedAt: string | null
}

type ExternalSource = 'LOGO' | 'MIKRO' | 'MANUAL'
const EXTERNAL_SOURCES: ExternalSource[] = ['LOGO', 'MIKRO', 'MANUAL']

interface SegmentRow {
  id: number
  code: string
  name: string
  displayOrder: number
  isActive: boolean
}

type Tab = 'customers'
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
  const [tab] = useState<Tab>('customers')
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

          {mode === 'edit' && customer ? (
            <div className="col-span-2">
              <ExternalRefSection customer={customer} onLinked={onSaved} />
            </div>
          ) : null}

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

/* =====================================================================
   ExternalRefSection — Mutabakat önkoşul #1 (00a)
   Logo / Mikro / Manuel dış sistem müşteri kodunu bağlar.
   ===================================================================== */
function ExternalRefSection({
  customer,
  onLinked,
}: {
  customer: CustomerRow
  onLinked: () => void
}) {
  const [extRef, setExtRef] = useState<string>(customer.externalCustomerRef ?? '')
  const [source, setSource] = useState<ExternalSource>(
    (customer.externalSourceSystem as ExternalSource | null) ?? 'LOGO',
  )
  const [localError, setLocalError] = useState<string | null>(null)

  const linkMutation = useMutation({
    mutationFn: async () => {
      const trimmed = extRef.trim()
      if (!trimmed) throw new Error('Dış sistem kodu zorunlu.')
      if (trimmed.length > 32) throw new Error('Dış sistem kodu en fazla 32 karakter.')
      await api.post(`/customers/${customer.id}/link-external`, {
        externalRef: trimmed,
        sourceSystem: source,
      })
    },
    onSuccess: () => {
      setLocalError(null)
      onLinked()
    },
    onError: (e: unknown) => setLocalError(e instanceof Error ? e.message : 'Bağlama başarısız.'),
  })

  const verified = customer.externalRefVerifiedAt
    ? new Date(customer.externalRefVerifiedAt).toLocaleString('tr-TR')
    : null

  return (
    <fieldset className="border border-outline-variant rounded-lg p-4 mt-2">
      <legend className="label-sm px-2">Dış Sistem Kodu (Mutabakat)</legend>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Kod (Logo/Mikro müşteri no, max 32)">
          <input
            className="input w-full font-mono"
            maxLength={32}
            value={extRef}
            onChange={(e) => setExtRef(e.target.value)}
            placeholder="1500003063"
          />
        </Field>
        <Field label="Kaynak Sistem">
          <select
            className="select w-full"
            value={source}
            onChange={(e) => setSource(e.target.value as ExternalSource)}
          >
            {EXTERNAL_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-on-surface-variant">
          {verified
            ? `Son doğrulama: ${verified}`
            : 'Henüz bir dış sistem kodu bağlı değil.'}
        </p>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setLocalError(null)
            linkMutation.mutate()
          }}
          disabled={linkMutation.isPending}
        >
          {linkMutation.isPending ? 'Bağlanıyor…' : customer.externalCustomerRef ? 'Güncelle' : 'Bağla'}
        </button>
      </div>
      {localError ? <p className="text-xs text-error mt-2">{localError}</p> : null}
    </fieldset>
  )
}
