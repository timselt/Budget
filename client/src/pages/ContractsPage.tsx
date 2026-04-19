import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { PageIntro } from '../components/shared/PageIntro'

/**
 * Sözleşme (Contract) yönetimi — ADR-0014.
 * 14-segment kontrat kodu + metadata + revizyon UI'ı.
 */

interface ContractDto {
  id: number
  customerId: number
  customerShortId: number
  customerCode: string
  customerName: string
  productId: number
  productCode: string
  productName: string
  contractCode: string
  version: number
  revisionCount: number
  businessLine: string
  salesType: string
  productType: string
  vehicleType: string
  contractForm: string
  contractType: string
  paymentFrequency: string
  adjustmentClause: string
  contractKind: string
  serviceArea: string
  unitPriceTry: number | null
  startDate: string | null
  endDate: string | null
  notes: string | null
  isActive: boolean
  contractDisplayName: string | null
  currencyCode: string
  status: string
  flow: string
  terminationReason: string | null
}

interface CustomerOption {
  id: number
  code: string
  name: string
  isActive: boolean
}

interface ProductOption {
  id: number
  code: string
  name: string
  isActive: boolean
}

const BUSINESS_LINES = [
  { code: 'RoadSideAssistance', label: '1 — RSA (Yol Yardım)' },
  { code: 'RentACar', label: '2 — RAC (İkame Araç)' },
  { code: 'HomeAndWorkplace', label: '3 — Konut & İşyeri' },
  { code: 'Health', label: '4 — Sağlık' },
  { code: 'Yacht', label: '5 — Yat' },
  { code: 'CallCenter', label: '6 — Çağrı Merkezi' },
  { code: 'Travel', label: '7 — Seyahat' },
  { code: 'Other', label: '0 — Diğer' },
]
const SALES_TYPES = [
  { code: 'Insurance', label: 'SG — Sigorta' },
  { code: 'Automotive', label: 'OM — Otomotiv' },
  { code: 'DirectChannel', label: 'DK — Alternatif Kanallar' },
  { code: 'Fleet', label: 'OF — Filo' },
  { code: 'Medical', label: 'MD — Sağlık (Medikal)' },
]
const PRODUCT_TYPES = [
  { code: 'Kasko', label: 'K0 — Kasko' },
  { code: 'Trafik', label: 'T0 — Trafik' },
  { code: 'Garanti', label: 'G0 — Garanti' },
  { code: 'Warranty', label: 'W0 — Warranty' },
  { code: 'Bireysel', label: 'B0 — Bireysel' },
  { code: 'Filo', label: 'F0 — Filo' },
  { code: 'IsYeriAcil', label: 'İ0 — İş Yeri Acil' },
  { code: 'KonutAcil', label: 'K1 — Konut Acil' },
  { code: 'FerdiKaza', label: 'FK — Ferdi Kaza' },
  { code: 'KonutOnarim', label: 'K2 — Konut Onarım' },
  { code: 'IsYeriOnarim', label: 'İ1 — İş Yeri Onarım' },
  { code: 'Yat', label: 'Y0 — Yat' },
  { code: 'Diger', label: 'D0 — Diğer' },
]
const VEHICLE_TYPES = [
  { code: 'None', label: '000 — Geçerli değil' },
  { code: 'Binek', label: 'B00 — Binek' },
  { code: 'HafifTicari', label: 'H00 — Hafif Ticari' },
  { code: 'AgirTicari', label: 'A00 — Ağır Ticari' },
  { code: 'OzelMaksatli', label: 'ÖM0 — Özel Maksatlı' },
  { code: 'Motosiklet', label: 'M00 — Motosiklet' },
  { code: 'AgirVeOzelMaksatli', label: 'AÖ0 — Ağır + Özel Maksatlı' },
  { code: 'BinekVeHafif', label: 'BH0 — Binek + Hafif' },
  { code: 'BinekHafifAgir', label: 'BHF — Binek + Hafif + Ağır' },
]
const CONTRACT_FORMS = [
  { code: 'Risky', label: '01 — Riskli Ürünler' },
  { code: 'ServiceBased', label: '02 — Hizmet Bazlı' },
  { code: 'BuyAndSell', label: '03 — Al & Sat' },
]
const CONTRACT_TYPES = [
  { code: 'PerPolicy', label: '01 — Poliçe Başı' },
  { code: 'PerFileRisky', label: '02 — Dosya Başı / Tarife (Riskli)' },
  { code: 'PerFileRiskless', label: '03 — Dosya Başı / Risksiz' },
  { code: 'DedicatedTeam', label: '04 — Dedike Ekip' },
  { code: 'PooledTeam', label: '05 — Havuz Ekibi' },
]
const PAYMENT_FREQUENCIES = [
  { code: 'UpFront', label: 'P00 — Peşin' },
  { code: 'Monthly', label: 'T12 — Aylık (1/12)' },
  { code: 'BiMonthly', label: 'T02 — 6 Taksit (1/6)' },
  { code: 'Quarterly', label: 'T03 — 4 Taksit (1/4)' },
  { code: 'Daily', label: '365 — Günlük (1/365)' },
  { code: 'Other', label: 'T01 — Diğer' },
]
const ADJUSTMENT_CLAUSES = [
  { code: 'WithClause', label: '1 — Ayarlama Klozlu' },
  { code: 'WithoutClause', label: '2 — Ayarlama Klozsuz' },
]
const CONTRACT_KINDS = [
  { code: 'CleanCut', label: 'CC — Clean Cut' },
  { code: 'RunOff', label: 'RO — Run Off' },
]
const SERVICE_AREAS = [
  { code: 'Domestic', label: '1 — Yurt İçi' },
  { code: 'International', label: '2 — Yurt Dışı' },
]
const CHANGE_TYPES = [
  { code: 'LimitChange', label: 'Limit Değişikliği (versiyon atlar)' },
  { code: 'PriceChange', label: 'Sadece Prim Değişikliği (aynı kod)' },
  { code: 'LimitAndPrice', label: 'Limit + Prim (versiyon atlar)' },
  { code: 'VehicleChange', label: 'İkame Araç Bölünmesi (versiyon atlar)' },
  { code: 'PeriodRenewal', label: 'Dönem Yenileme (versiyon atlar)' },
]

async function getContracts(params: {
  customerId?: number
  productId?: number
  flow?: string
  status?: string
}): Promise<ContractDto[]> {
  const q = new URLSearchParams()
  if (params.customerId) q.set('customerId', String(params.customerId))
  if (params.productId) q.set('productId', String(params.productId))
  if (params.flow) q.set('flow', params.flow)
  if (params.status) q.set('status', params.status)
  const { data } = await api.get<ContractDto[]>(`/contracts${q.size > 0 ? '?' + q : ''}`)
  return data
}

async function getCustomers(): Promise<CustomerOption[]> {
  const { data } = await api.get<CustomerOption[]>('/customers')
  return data
}

async function getProducts(): Promise<ProductOption[]> {
  const { data } = await api.get<ProductOption[]>('/products?onlyActive=true')
  return data
}

type Modal =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; contract: ContractDto }
  | { kind: 'revise'; contract: ContractDto }
  | { kind: 'parse' }

export function ContractsPage() {
  const queryClient = useQueryClient()
  const [customerFilter, setCustomerFilter] = useState<number | ''>('')
  const [flowFilter, setFlowFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [modal, setModal] = useState<Modal>({ kind: 'none' })

  const contractsQuery = useQuery({
    queryKey: ['contracts', customerFilter, flowFilter, statusFilter],
    queryFn: () =>
      getContracts({
        customerId: customerFilter || undefined,
        flow: flowFilter || undefined,
        status: statusFilter || undefined,
      }),
  })
  const customersQuery = useQuery({ queryKey: ['customers-all'], queryFn: getCustomers })
  const productsQuery = useQuery({ queryKey: ['products-active'], queryFn: getProducts })

  const contracts = useMemo(() => contractsQuery.data ?? [], [contractsQuery.data])
  const customers = useMemo(
    () => (customersQuery.data ?? []).filter((c) => c.isActive),
    [customersQuery.data],
  )
  const products = useMemo(
    () => (productsQuery.data ?? []).filter((p) => p.isActive),
    [productsQuery.data],
  )

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['contracts'] })

  const activeCount = contracts.filter((c) => c.isActive).length

  return (
    <section>
      <PageIntro
        title="Sözleşmeler"
        purpose="Müşteri × ürün sözleşme yönetimi (ADR-0014: 14-segment kontrat kodu). Yeni sözleşmede temel alanlar varsayılan; teknik detaylar 'Gelişmiş seçenekler' altında. 'Kod Çöz' mevcut bir koddan parametreleri geri okumak için."
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={() => setModal({ kind: 'parse' })}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                qr_code_2
              </span>
              Kod Çöz
            </button>
            <button type="button" className="btn-primary" onClick={() => setModal({ kind: 'create' })}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                add
              </span>
              Yeni Sözleşme
            </button>
          </>
        }
      />

      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-12 md:col-span-3 card">
          <span className="label-sm">Toplam</span>
          <p className="text-2xl font-black tracking-display num mt-2">{contracts.length}</p>
          <p className="text-xs text-on-surface-variant mt-1">tüm sözleşmeler</p>
        </div>
        <div className="col-span-12 md:col-span-3 card">
          <span className="label-sm">Aktif</span>
          <p className="text-2xl font-black tracking-display num mt-2">{activeCount}</p>
          <p className="text-xs text-on-surface-variant mt-1">çalışan sözleşme</p>
        </div>
        <div className="col-span-12 md:col-span-3 card">
          <span className="label-sm">Kod Formatı</span>
          <p className="text-base font-black tracking-display mt-2">14 Segment</p>
          <p className="text-xs text-on-surface-variant mt-1">ADR-0014</p>
        </div>
        <div className="col-span-12 md:col-span-3 card">
          <span className="label-sm">Versiyonlama</span>
          <p className="text-base font-black tracking-display mt-2">Operatör-Driven</p>
          <p className="text-xs text-on-surface-variant mt-1">ChangeType bazlı</p>
        </div>
      </div>

      <div className="card mb-4 flex items-center gap-3 flex-wrap">
        <span className="label-sm">Müşteri</span>
        <select
          className="select min-w-[280px]"
          value={customerFilter}
          onChange={(e) => setCustomerFilter(e.target.value === '' ? '' : Number(e.target.value))}
        >
          <option value="">— Tümü —</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>
        <span className="label-sm">Akış</span>
        <select
          className="select"
          value={flowFilter}
          onChange={(e) => setFlowFilter(e.target.value)}
        >
          <option value="">— Tümü —</option>
          <option value="Insurance">Sigorta</option>
          <option value="Automotive">Otomotiv</option>
        </select>
        <span className="label-sm">Durum</span>
        <select
          className="select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">— Tümü —</option>
          <option value="Draft">Taslak</option>
          <option value="Active">Aktif</option>
          <option value="Expired">Süresi Dolmuş</option>
          <option value="Terminated">Sonlandırılmış</option>
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {contractsQuery.isLoading ? (
          <p className="p-6 text-sm text-on-surface-variant">Yükleniyor…</p>
        ) : contracts.length === 0 ? (
          <p className="p-6 text-sm text-on-surface-variant">
            Sözleşme bulunmadı. "Yeni Sözleşme" ile başlayın.
          </p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ minWidth: 280 }}>Kontrat Kodu</th>
                <th>Müşteri</th>
                <th>Ürün</th>
                <th className="text-right">Birim Fiyat</th>
                <th>Başlangıç</th>
                <th>Bitiş</th>
                <th>Versiyon</th>
                <th>Durum</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id}>
                  <td className="font-mono text-xs">{c.contractCode}</td>
                  <td>
                    <strong>{c.customerName}</strong>
                    <p className="text-[0.65rem] text-on-surface-variant">{c.customerCode}</p>
                  </td>
                  <td>
                    <strong>{c.productName}</strong>
                    <p className="text-[0.65rem] font-mono text-on-surface-variant">{c.productCode}</p>
                  </td>
                  <td className="text-right num">
                    {c.unitPriceTry != null
                      ? c.unitPriceTry.toLocaleString('tr-TR', { minimumFractionDigits: 2 })
                      : '—'}
                  </td>
                  <td className="text-sm">{c.startDate ?? '—'}</td>
                  <td className="text-sm">{c.endDate ?? '—'}</td>
                  <td className="text-center">
                    <span className="chip chip-info">V{c.version}</span>
                    {c.revisionCount > 0 ? (
                      <span className="text-[0.65rem] text-on-surface-variant ml-1">
                        {c.revisionCount}R
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <span className={`chip ${c.isActive ? 'chip-success' : 'chip-neutral'}`}>
                      {c.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="text-right">
                    <Link
                      to={`/contracts/${c.id}/price-books`}
                      className="p-1 text-on-surface-variant hover:text-primary inline-block"
                      title="Fiyat Listeleri"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                        price_change
                      </span>
                    </Link>
                    <button
                      type="button"
                      className="p-1 text-on-surface-variant hover:text-primary"
                      title="Revize et"
                      onClick={() => setModal({ kind: 'revise', contract: c })}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                        history_edu
                      </span>
                    </button>
                    <button
                      type="button"
                      className="p-1 text-on-surface-variant hover:text-primary"
                      title="Düzenle"
                      onClick={() => setModal({ kind: 'edit', contract: c })}
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

      {modal.kind === 'create' ? (
        <ContractModal
          mode="create"
          contract={null}
          customers={customers}
          products={products}
          onClose={() => setModal({ kind: 'none' })}
          onSaved={() => {
            invalidate()
            setModal({ kind: 'none' })
          }}
        />
      ) : null}

      {modal.kind === 'edit' ? (
        <ContractModal
          mode="edit"
          contract={modal.contract}
          customers={customers}
          products={products}
          onClose={() => setModal({ kind: 'none' })}
          onSaved={() => {
            invalidate()
            setModal({ kind: 'none' })
          }}
        />
      ) : null}

      {modal.kind === 'revise' ? (
        <ReviseModal
          contract={modal.contract}
          onClose={() => setModal({ kind: 'none' })}
          onSaved={() => {
            invalidate()
            setModal({ kind: 'none' })
          }}
        />
      ) : null}

      {modal.kind === 'parse' ? (
        <ParseModal onClose={() => setModal({ kind: 'none' })} />
      ) : null}
    </section>
  )
}

/* =====================================================================
   ContractModal — create + edit
   ===================================================================== */
interface FormState {
  customerId: number | ''
  productId: number | ''
  businessLine: string
  salesType: string
  productType: string
  vehicleType: string
  contractForm: string
  contractType: string
  paymentFrequency: string
  adjustmentClause: string
  contractKind: string
  serviceArea: string
  unitPriceTry: string
  startDate: string
  endDate: string
  notes: string
  isActive: boolean
}

function initialFromContract(c: ContractDto | null): FormState {
  return {
    customerId: c?.customerId ?? '',
    productId: c?.productId ?? '',
    businessLine: c?.businessLine ?? 'Other',
    salesType: c?.salesType ?? 'Insurance',
    productType: c?.productType ?? 'Diger',
    vehicleType: c?.vehicleType ?? 'None',
    contractForm: c?.contractForm ?? 'ServiceBased',
    contractType: c?.contractType ?? 'PerPolicy',
    paymentFrequency: c?.paymentFrequency ?? 'UpFront',
    adjustmentClause: c?.adjustmentClause ?? 'WithoutClause',
    contractKind: c?.contractKind ?? 'CleanCut',
    serviceArea: c?.serviceArea ?? 'Domestic',
    unitPriceTry: c?.unitPriceTry != null ? String(c.unitPriceTry) : '',
    startDate: c?.startDate ?? '',
    endDate: c?.endDate ?? '',
    notes: c?.notes ?? '',
    isActive: c?.isActive ?? true,
  }
}

function ContractModal({
  mode,
  contract,
  customers,
  products,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit'
  contract: ContractDto | null
  customers: CustomerOption[]
  products: ProductOption[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<FormState>(() => initialFromContract(contract))
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Audit Sprint 3: basit/gelişmiş mod — yeni sözleşmede ilk açılışta sadece
  // temel 3 alan görünür (İş Kolu / Satış Tipi / Ürün Tipi). Diğer 7 enum
  // alan accordion altında. Edit modunda accordion yok (zaten ilgili alanlar
  // gösterilmiyor).
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (form.customerId === '' || form.productId === '')
        throw new Error('Müşteri ve ürün seçimi zorunlu')
      const { data } = await api.post<{ code: string }>('/contracts/preview-code', {
        customerId: Number(form.customerId),
        productId: Number(form.productId),
        businessLine: form.businessLine,
        salesType: form.salesType,
        productType: form.productType,
        vehicleType: form.vehicleType,
        contractForm: form.contractForm,
        contractType: form.contractType,
        paymentFrequency: form.paymentFrequency,
        adjustmentClause: form.adjustmentClause,
        contractKind: form.contractKind,
        serviceArea: form.serviceArea,
      })
      return data.code
    },
    onSuccess: (c) => {
      setPreview(c)
      setError(null)
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Önizleme başarısız'),
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const price = form.unitPriceTry.trim() ? Number(form.unitPriceTry) : null
      if (price !== null && (Number.isNaN(price) || price < 0))
        throw new Error('Birim fiyat negatif olamaz')
      if (form.startDate && form.endDate && form.endDate < form.startDate)
        throw new Error('Bitiş tarihi başlangıçtan önce olamaz')

      const body = {
        unitPriceTry: price,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        notes: form.notes.trim() || null,
      }

      if (mode === 'create') {
        if (form.customerId === '' || form.productId === '')
          throw new Error('Müşteri ve ürün seçimi zorunlu')
        await api.post('/contracts', {
          customerId: Number(form.customerId),
          productId: Number(form.productId),
          businessLine: form.businessLine,
          salesType: form.salesType,
          productType: form.productType,
          vehicleType: form.vehicleType,
          contractForm: form.contractForm,
          contractType: form.contractType,
          paymentFrequency: form.paymentFrequency,
          adjustmentClause: form.adjustmentClause,
          contractKind: form.contractKind,
          serviceArea: form.serviceArea,
          ...body,
        })
      } else if (contract) {
        await api.put(`/contracts/${contract.id}`, {
          ...body,
          isActive: form.isActive,
        })
      }
    },
    onSuccess: () => onSaved(),
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Kayıt başarısız'),
  })

  return (
    <ModalShell
      title={mode === 'create' ? 'Yeni Sözleşme' : `Sözleşme: ${contract?.contractCode}`}
      onClose={onClose}
      wide
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setError(null)
          saveMutation.mutate()
        }}
        className="grid grid-cols-2 gap-4"
      >
        <Field label="Müşteri *" className="col-span-2">
          <select
            className="select w-full"
            value={form.customerId}
            onChange={(e) => setForm({ ...form, customerId: e.target.value === '' ? '' : Number(e.target.value) })}
            disabled={mode === 'edit'}
            required
          >
            <option value="">— Seçin —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ürün *" className="col-span-2">
          <select
            className="select w-full"
            value={form.productId}
            onChange={(e) => setForm({ ...form, productId: e.target.value === '' ? '' : Number(e.target.value) })}
            disabled={mode === 'edit'}
            required
          >
            <option value="">— Seçin —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>
        </Field>

        {mode === 'create' ? (
          <>
            {/* Temel 3 alan — her zaman görünür */}
            <EnumField
              label="İş Kolu"
              options={BUSINESS_LINES}
              value={form.businessLine}
              onChange={(v) => setForm({ ...form, businessLine: v })}
            />
            <EnumField
              label="Satış Tipi"
              options={SALES_TYPES}
              value={form.salesType}
              onChange={(v) => setForm({ ...form, salesType: v })}
            />
            <EnumField
              label="Ürün Tipi"
              options={PRODUCT_TYPES}
              value={form.productType}
              onChange={(v) => setForm({ ...form, productType: v })}
            />

            {/* Gelişmiş 7 alan — accordion altında. Sözleşme kodu doğru
                üretilmesi için backend defaults'ları kullanır; kullanıcı
                özelleştirmek isterse açar. */}
            <div className="col-span-2">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="text-sm font-semibold text-primary inline-flex items-center gap-1 hover:underline"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  {showAdvanced ? 'expand_less' : 'expand_more'}
                </span>
                {showAdvanced ? 'Gelişmiş seçenekleri gizle' : 'Gelişmiş seçenekleri göster (7 alan)'}
              </button>
              <p className="text-xs text-on-surface-variant mt-1">
                Araç tipi, sözleşme şekli/tipi/türü, ödeme şekli, ayarlama klozu,
                hizmet alanı — varsayılanlar çoğu sözleşme için yeterlidir.
              </p>
            </div>

            {showAdvanced && (
              <>
                <EnumField
                  label="Araç Tipi"
                  options={VEHICLE_TYPES}
                  value={form.vehicleType}
                  onChange={(v) => setForm({ ...form, vehicleType: v })}
                />
                <EnumField
                  label="Sözleşme Şekli"
                  options={CONTRACT_FORMS}
                  value={form.contractForm}
                  onChange={(v) => setForm({ ...form, contractForm: v })}
                />
                <EnumField
                  label="Sözleşme Tipi"
                  options={CONTRACT_TYPES}
                  value={form.contractType}
                  onChange={(v) => setForm({ ...form, contractType: v })}
                />
                <EnumField
                  label="Ödeme Şekli"
                  options={PAYMENT_FREQUENCIES}
                  value={form.paymentFrequency}
                  onChange={(v) => setForm({ ...form, paymentFrequency: v })}
                />
                <EnumField
                  label="Ayarlama Klozu"
                  options={ADJUSTMENT_CLAUSES}
                  value={form.adjustmentClause}
                  onChange={(v) => setForm({ ...form, adjustmentClause: v })}
                />
                <EnumField
                  label="Sözleşme Türü"
                  options={CONTRACT_KINDS}
                  value={form.contractKind}
                  onChange={(v) => setForm({ ...form, contractKind: v })}
                />
                <EnumField
                  label="Hizmet Alanı"
                  options={SERVICE_AREAS}
                  value={form.serviceArea}
                  onChange={(v) => setForm({ ...form, serviceArea: v })}
                />
              </>
            )}
          </>
        ) : null}

        <Field label="Birim Fiyat (TL)">
          <input
            className="input w-full"
            inputMode="decimal"
            value={form.unitPriceTry}
            onChange={(e) => setForm({ ...form, unitPriceTry: e.target.value })}
          />
        </Field>

        {mode === 'edit' ? (
          <Field label="Durum">
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

        <Field label="Başlangıç">
          <input
            type="date"
            className="input w-full"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
        </Field>
        <Field label="Bitiş">
          <input
            type="date"
            className="input w-full"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
          />
        </Field>

        <Field label="Notlar" className="col-span-2">
          <textarea
            className="input w-full"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Field>

        {mode === 'create' ? (
          <div className="col-span-2 p-3 bg-surface-container-low rounded">
            <div className="flex items-center justify-between">
              <span className="label-sm">Kontrat Kodu Önizleme</span>
              <button
                type="button"
                className="btn-secondary"
                disabled={previewMutation.isPending || form.customerId === '' || form.productId === ''}
                onClick={() => previewMutation.mutate()}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  visibility
                </span>
                {previewMutation.isPending ? 'Hesaplanıyor…' : 'Önizle'}
              </button>
            </div>
            {preview ? (
              <p className="mt-2 font-mono text-sm break-all">{preview}</p>
            ) : (
              <p className="mt-2 text-xs text-on-surface-variant">
                Form dolduktan sonra 14-segment kodu görüntülenir.
              </p>
            )}
          </div>
        ) : null}

        {error ? <p className="col-span-2 text-sm text-error">{error}</p> : null}

        <div className="col-span-2 flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Vazgeç
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

/* =====================================================================
   ReviseModal — kontrat revizyonu (ADR-0014 §2.3)
   ===================================================================== */
function ReviseModal({
  contract,
  onClose,
  onSaved,
}: {
  contract: ContractDto
  onClose: () => void
  onSaved: () => void
}) {
  const [changeType, setChangeType] = useState('LimitChange')
  const [newUnitPrice, setNewUnitPrice] = useState<string>('')
  const [note, setNote] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const reviseMutation = useMutation({
    mutationFn: async () => {
      const price = newUnitPrice.trim() ? Number(newUnitPrice) : null
      if (price !== null && (Number.isNaN(price) || price < 0))
        throw new Error('Yeni birim fiyat negatif olamaz')
      await api.post(`/contracts/${contract.id}/revise`, {
        changeType,
        newUnitPriceTry: price,
        note: note.trim() || null,
      })
    },
    onSuccess: () => onSaved(),
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Revizyon başarısız'),
  })

  const needsPrice = changeType === 'PriceChange' || changeType === 'LimitAndPrice'

  return (
    <ModalShell title={`Revizyon: ${contract.contractCode}`} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Değişiklik Türü">
          <select
            className="select w-full"
            value={changeType}
            onChange={(e) => setChangeType(e.target.value)}
          >
            {CHANGE_TYPES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>

        {needsPrice ? (
          <Field label="Yeni Birim Fiyat (TL)">
            <input
              className="input w-full"
              inputMode="decimal"
              value={newUnitPrice}
              onChange={(e) => setNewUnitPrice(e.target.value)}
            />
          </Field>
        ) : null}

        <Field label="Not (opsiyonel)">
          <textarea
            className="input w-full"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>

        <div className="p-3 bg-surface-container-low rounded text-xs text-on-surface-variant">
          <strong>Kapsam değişikliği</strong> gerekiyorsa (yeni teminat kalemi, defa limiti
          vb.) bu kontratı revize etme — yeni Product + yeni Contract açılmalı. ADR-0014 §2.3.
        </div>

        {error ? <p className="text-sm text-error">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Vazgeç
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={reviseMutation.isPending}
            onClick={() => {
              setError(null)
              reviseMutation.mutate()
            }}
          >
            {reviseMutation.isPending ? 'Uygulanıyor…' : 'Revize Et'}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

/* =====================================================================
   ParseModal — verilen kodu segmentlere ayırır
   ===================================================================== */
interface BreakdownDto {
  value: string
  businessLine: string
  salesType: string
  productType: string
  vehicleType: string
  customerShortId: number
  contractForm: string
  contractType: string
  productId: number
  paymentFrequency: string
  adjustmentClause: string
  contractKind: string
  serviceArea: string
  version: number
}

function ParseModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState<string>('TA1SGK0B0001010100000013652CC1-V1')
  const [result, setResult] = useState<BreakdownDto | null>(null)
  const [error, setError] = useState<string | null>(null)

  const parseMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.get<BreakdownDto>(`/contracts/parse/${encodeURIComponent(code.trim())}`)
      return data
    },
    onSuccess: (d) => {
      setResult(d)
      setError(null)
    },
    onError: (e: unknown) => {
      setResult(null)
      setError(e instanceof Error ? e.message : 'Kod çözülemedi')
    },
  })

  return (
    <ModalShell title="Kontrat Kodu Çözümleme" onClose={onClose}>
      <div className="space-y-4">
        <Field label="14-segment Kod">
          <div className="flex gap-2">
            <input
              className="input flex-1 font-mono"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button
              type="button"
              className="btn-primary"
              disabled={parseMutation.isPending || !code.trim()}
              onClick={() => parseMutation.mutate()}
            >
              Çöz
            </button>
          </div>
        </Field>

        {error ? <p className="text-sm text-error">{error}</p> : null}

        {result ? (
          <div className="p-4 bg-surface-container-low rounded space-y-2 text-sm">
            <BreakdownRow label="Şirket" value="TA — Tur Assist" />
            <BreakdownRow label="İş Kolu" value={result.businessLine} />
            <BreakdownRow label="Satış Tipi" value={result.salesType} />
            <BreakdownRow label="Ürün Tipi" value={result.productType} />
            <BreakdownRow label="Araç Tipi" value={result.vehicleType} />
            <BreakdownRow label="Müşteri ShortId" value={String(result.customerShortId).padStart(2, '0')} />
            <BreakdownRow label="Sözleşme Şekli" value={result.contractForm} />
            <BreakdownRow label="Sözleşme Tipi" value={result.contractType} />
            <BreakdownRow label="Ürün ID" value={String(result.productId).padStart(7, '0')} />
            <BreakdownRow label="Ödeme Şekli" value={result.paymentFrequency} />
            <BreakdownRow label="Ayarlama Klozu" value={result.adjustmentClause} />
            <BreakdownRow label="Sözleşme Türü" value={result.contractKind} />
            <BreakdownRow label="Hizmet Alanı" value={result.serviceArea} />
            <BreakdownRow label="Versiyon" value={`V${result.version}`} />
          </div>
        ) : null}

        <div className="flex justify-end">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Kapat
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-outline-variant pb-1">
      <span className="text-on-surface-variant">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  )
}

/* =====================================================================
   Shared
   ===================================================================== */
function ModalShell({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-lg shadow-xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-on-surface">{title}</h3>
          <button
            type="button"
            className="text-on-surface-variant hover:text-on-surface"
            onClick={onClose}
            aria-label="Kapat"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="label-sm block mb-1">{label}</label>
      {children}
    </div>
  )
}

function EnumField({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { code: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <Field label={label}>
      <select
        className="select w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  )
}
