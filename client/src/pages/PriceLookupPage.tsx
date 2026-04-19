import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import api from '../lib/api'

/**
 * Mutabakat ekibi için hızlı fiyat arama aracı (00b §4, P1).
 * <c>/api/v1/pricing/lookup</c> endpoint'ini sarar; sonuçları açıklayıcı
 * kart olarak gösterir.
 */

interface CustomerOption {
  id: number
  code: string
  name: string
  isActive: boolean
}

interface LookupResult {
  match: string
  contractId: number | null
  contractCode: string | null
  priceBookId: number | null
  priceBookVersion: number | null
  priceBookItem: {
    productCode: string
    productName: string
    unitPrice: number
    currencyCode: string
    unit: string
    taxRate: number | null
  } | null
  warnings: string[]
}

async function getCustomers(): Promise<CustomerOption[]> {
  const { data } = await api.get<CustomerOption[]>('/customers')
  return data
}

export function PriceLookupPage() {
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [flow, setFlow] = useState('Insurance')
  const [periodCode, setPeriodCode] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [productCode, setProductCode] = useState('')
  const [expectedPrice, setExpectedPrice] = useState('')

  const customersQuery = useQuery({ queryKey: ['customers-all'], queryFn: getCustomers })
  const customers = (customersQuery.data ?? []).filter((c) => c.isActive)

  const [result, setResult] = useState<LookupResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const lookupMutation = useMutation({
    mutationFn: async () => {
      if (customerId === '') throw new Error('Müşteri seçin')
      if (!productCode.trim()) throw new Error('Ürün kodu girin')
      const params = new URLSearchParams({
        customer_id: String(customerId),
        flow,
        period_code: periodCode,
        product_code: productCode.trim(),
      })
      if (expectedPrice.trim()) params.set('expected_unit_price', expectedPrice.trim())
      const { data } = await api.get<LookupResult>(`/pricing/lookup?${params.toString()}`)
      return data
    },
    onSuccess: (d) => {
      setResult(d)
      setError(null)
    },
    onError: (e: unknown) => {
      setResult(null)
      setError(e instanceof Error ? e.message : 'Arama başarısız')
    },
  })

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-3xl font-extrabold tracking-display text-on-surface">
          Fiyat Arama
        </h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Mutabakat sürecinde sözleşme fiyatını doğrulamak için müşteri + akış + dönem +
          ürün kodu ile hızlı sorgu.
        </p>
      </div>

      <div className="card mb-6 grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-4">
          <label className="label-sm block mb-1">Müşteri *</label>
          <select
            className="select w-full"
            value={customerId}
            onChange={(e) =>
              setCustomerId(e.target.value === '' ? '' : Number(e.target.value))
            }
          >
            <option value="">— Seçin —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-6 md:col-span-2">
          <label className="label-sm block mb-1">Akış *</label>
          <select className="select w-full" value={flow} onChange={(e) => setFlow(e.target.value)}>
            <option value="Insurance">Sigorta</option>
            <option value="Automotive">Otomotiv</option>
          </select>
        </div>
        <div className="col-span-6 md:col-span-2">
          <label className="label-sm block mb-1">Dönem (YYYY-MM) *</label>
          <input
            className="input w-full"
            value={periodCode}
            onChange={(e) => setPeriodCode(e.target.value)}
            placeholder="2026-04"
          />
        </div>
        <div className="col-span-6 md:col-span-2">
          <label className="label-sm block mb-1">Ürün Kodu *</label>
          <input
            className="input w-full"
            value={productCode}
            onChange={(e) => setProductCode(e.target.value)}
          />
        </div>
        <div className="col-span-6 md:col-span-2">
          <label className="label-sm block mb-1">Beklenen Fiyat (ops.)</label>
          <input
            className="input w-full"
            inputMode="decimal"
            value={expectedPrice}
            onChange={(e) => setExpectedPrice(e.target.value)}
          />
        </div>
        <div className="col-span-12 flex justify-end">
          <button
            type="button"
            className="btn-primary"
            disabled={lookupMutation.isPending}
            onClick={() => lookupMutation.mutate()}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              search
            </span>
            {lookupMutation.isPending ? 'Aranıyor…' : 'Ara'}
          </button>
        </div>
      </div>

      {error ? <div className="card bg-error-container text-error mb-4">{error}</div> : null}

      {result ? <ResultCard result={result} /> : null}
    </section>
  )
}

function ResultCard({ result }: { result: LookupResult }) {
  const isOk = result.match === 'Found'
  const isMismatch = result.match === 'PricingMismatch'
  const chipCls = isOk ? 'chip-success' : isMismatch ? 'chip-warning' : 'chip-error'
  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-3">
        <span className={`chip ${chipCls}`}>{matchLabel(result.match)}</span>
        {result.contractCode ? (
          <span className="font-mono text-xs text-on-surface-variant">
            {result.contractCode}
            {result.priceBookVersion ? ` · V${result.priceBookVersion}` : ''}
          </span>
        ) : null}
      </div>

      {result.priceBookItem ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoBox label="Ürün Kodu" value={result.priceBookItem.productCode} mono />
          <InfoBox label="Ürün Adı" value={result.priceBookItem.productName} />
          <InfoBox
            label="Birim Fiyat"
            value={`${result.priceBookItem.unitPrice.toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
            })} ${result.priceBookItem.currencyCode}`}
          />
          <InfoBox label="Birim" value={result.priceBookItem.unit} />
          {result.priceBookItem.taxRate != null ? (
            <InfoBox label="KDV%" value={`${result.priceBookItem.taxRate}%`} />
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant">
          Eşleşme detayı yok — lütfen aşağıdaki uyarıları kontrol edin.
        </p>
      )}

      {result.warnings.length > 0 ? (
        <div className="p-3 bg-surface-container-low rounded text-sm">
          <strong className="text-on-surface">Uyarılar</strong>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function InfoBox({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <p className="label-sm">{label}</p>
      <p className={`text-base font-semibold mt-1 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}

function matchLabel(match: string): string {
  switch (match) {
    case 'Found':
      return 'Eşleşme Bulundu'
    case 'PricingMismatch':
      return 'Fiyat Uyuşmazlığı'
    case 'ContractNotFound':
      return 'Sözleşme Bulunamadı'
    case 'ProductNotFound':
      return 'Ürün Bulunamadı'
    case 'MultipleContracts':
      return 'Birden Fazla Sözleşme'
    default:
      return match
  }
}
