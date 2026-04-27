import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { Modal } from '../shared/ui/Modal'

/**
 * Bir sözleşmeye ait PriceBook sürümlerinin listesi (00b §4). Yeni Draft açma,
 * sürüm detayına geçiş, onay durumlarını görüntüleme.
 */

interface PriceBookDto {
  id: number
  contractId: number
  contractCode: string
  versionNo: number
  effectiveFrom: string
  effectiveTo: string | null
  status: string
  notes: string | null
  approvedByUserId: number | null
  approvedAt: string | null
  itemCount: number
  createdAt: string
  createdByUserId: number | null
  updatedAt: string | null
}

interface ContractDto {
  id: number
  contractCode: string
  customerName: string
  productName: string
  status: string
  flow: string
  currencyCode: string
}

async function getContract(id: number): Promise<ContractDto> {
  const { data } = await api.get<ContractDto>(`/contracts/${id}`)
  return data
}

async function getPriceBooks(contractId: number): Promise<PriceBookDto[]> {
  const { data } = await api.get<PriceBookDto[]>(`/contracts/${contractId}/price-books`)
  return data
}

export function ContractPriceBooksPage() {
  const { contractId } = useParams<{ contractId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const cid = Number(contractId)

  const [showCreate, setShowCreate] = useState(false)

  const contractQuery = useQuery({
    queryKey: ['contract', cid],
    queryFn: () => getContract(cid),
    enabled: !Number.isNaN(cid),
  })
  const priceBooksQuery = useQuery({
    queryKey: ['price-books', cid],
    queryFn: () => getPriceBooks(cid),
    enabled: !Number.isNaN(cid),
  })

  const priceBooks = useMemo(() => priceBooksQuery.data ?? [], [priceBooksQuery.data])
  const contract = contractQuery.data

  return (
    <section>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link to="/contracts" className="text-xs text-on-surface-variant hover:text-primary">
            ← Sözleşmeler
          </Link>
          <h2 className="text-3xl font-extrabold tracking-display text-on-surface mt-1">
            Fiyat Listeleri
          </h2>
          {contract ? (
            <p className="text-sm text-on-surface-variant font-mono mt-1">
              {contract.contractCode} · {contract.customerName} · {contract.productName}
            </p>
          ) : null}
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowCreate(true)}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            add
          </span>
          Yeni Sürüm
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        {priceBooksQuery.isLoading ? (
          <p className="p-6 text-sm text-on-surface-variant">Yükleniyor…</p>
        ) : priceBooks.length === 0 ? (
          <p className="p-6 text-sm text-on-surface-variant">
            Bu sözleşme için henüz PriceBook yok. "Yeni Sürüm" ile Draft oluşturun.
          </p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Sürüm</th>
                <th>Durum</th>
                <th>Yürürlük</th>
                <th className="text-right">Kalem</th>
                <th>Onay</th>
                <th>Not</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {priceBooks.map((pb) => (
                <tr key={pb.id}>
                  <td className="font-mono">V{pb.versionNo}</td>
                  <td>
                    <StatusChip status={pb.status} />
                  </td>
                  <td className="text-sm">
                    {pb.effectiveFrom}
                    {pb.effectiveTo ? ` → ${pb.effectiveTo}` : ' → ∞'}
                  </td>
                  <td className="text-right num">{pb.itemCount}</td>
                  <td className="text-xs">
                    {pb.approvedAt ? new Date(pb.approvedAt).toLocaleString('tr-TR') : '—'}
                  </td>
                  <td className="text-xs text-on-surface-variant max-w-[220px] truncate">
                    {pb.notes ?? '—'}
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="p-1 text-on-surface-variant hover:text-primary"
                      title="Düzenle"
                      onClick={() => navigate(`/price-books/${pb.id}`)}
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

      {showCreate ? (
        <CreateDraftModal
          contractId={cid}
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            queryClient.invalidateQueries({ queryKey: ['price-books', cid] })
            setShowCreate(false)
            navigate(`/price-books/${id}`)
          }}
        />
      ) : null}
    </section>
  )
}

function StatusChip({ status }: { status: string }) {
  const cls =
    status === 'Active' ? 'chip-success' : status === 'Draft' ? 'chip-info' : 'chip-neutral'
  const label = status === 'Active' ? 'Aktif' : status === 'Draft' ? 'Taslak' : 'Arşiv'
  return <span className={`chip ${cls}`}>{label}</span>
}

function CreateDraftModal({
  contractId,
  onClose,
  onCreated,
}: {
  contractId: number
  onClose: () => void
  onCreated: (id: number) => void
}) {
  const [effectiveFrom, setEffectiveFrom] = useState(() =>
    new Date().toISOString().slice(0, 10),
  )
  const [effectiveTo, setEffectiveTo] = useState('')
  const [notes, setNotes] = useState('')
  const [copyPrevious, setCopyPrevious] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ id: number }>(`/contracts/${contractId}/price-books`, {
        effectiveFrom,
        effectiveTo: effectiveTo || null,
        notes: notes.trim() || null,
        copyFromPreviousActive: copyPrevious,
      })
      return data
    },
    onSuccess: (d) => onCreated(d.id),
    onError: (e: unknown) =>
      setError(e instanceof Error ? e.message : 'Draft oluşturulamadı'),
  })

  return (
    <Modal
      open
      onClose={onClose}
      title="Yeni PriceBook Sürümü"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Vazgeç
          </button>
          <button
            type="submit"
            form="create-pricebook-form"
            className="btn-primary"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Oluşturuluyor…' : 'Oluştur'}
          </button>
        </>
      }
    >
      <form
        id="create-pricebook-form"
        onSubmit={(e) => {
          e.preventDefault()
          setError(null)
          createMutation.mutate()
        }}
        className="space-y-4"
      >
        <Field label="Yürürlük Başlangıcı *">
          <input
            type="date"
            className="input w-full"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            required
          />
        </Field>
        <Field label="Yürürlük Bitişi (opsiyonel)">
          <input
            type="date"
            className="input w-full"
            value={effectiveTo}
            onChange={(e) => setEffectiveTo(e.target.value)}
          />
        </Field>
        <Field label="Not (opsiyonel)">
          <textarea
            className="input w-full"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={copyPrevious}
            onChange={(e) => setCopyPrevious(e.target.checked)}
          />
          Aktif sürümün kalemlerini bu Draft'a kopyala
        </label>

        {error ? <p className="text-sm text-error">{error}</p> : null}
      </form>
    </Modal>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="label-sm block mb-1">{label}</label>
      {children}
    </div>
  )
}
