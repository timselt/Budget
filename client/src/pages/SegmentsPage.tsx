import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

interface SegmentRow {
  id: number
  code: string
  name: string
  displayOrder: number
  isActive: boolean
}

type ModalState = { kind: 'none' } | { kind: 'create' } | { kind: 'edit'; segment: SegmentRow }

async function getSegments(): Promise<SegmentRow[]> {
  const { data } = await api.get<SegmentRow[]>('/segments')
  return data
}

export function SegmentsPage() {
  const [modal, setModal] = useState<ModalState>({ kind: 'none' })
  const queryClient = useQueryClient()

  const segmentsQuery = useQuery({ queryKey: ['segments'], queryFn: getSegments })
  const segments = segmentsQuery.data ?? []
  const activeCount = segments.filter((s) => s.isActive).length

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['segments'] })

  return (
    <section>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-on-surface">
            Müşteri Kategorileri (Segment)
          </h2>
          <p className="text-sm text-on-surface-variant mt-2 max-w-2xl">
            Sigorta, Otomotiv, Filo, Alternatif Kanallar gibi müşteri kategorileri. Müşteri
            oluştururken bu listeden seçim yapılır.
          </p>
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
        <div className="col-span-12 md:col-span-3 card">
          <span className="label-sm">Toplam Kategori</span>
          <p className="text-2xl font-black tracking-display num mt-2">{segments.length}</p>
          <p className="text-xs text-on-surface-variant mt-1">{activeCount} aktif</p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {segmentsQuery.isLoading ? (
          <p className="px-4 py-6 text-sm text-on-surface-variant">Yükleniyor...</p>
        ) : segmentsQuery.isError ? (
          <p className="px-4 py-6 text-sm text-error">Kategoriler alınamadı.</p>
        ) : segments.length === 0 ? (
          <p className="px-4 py-6 text-sm text-on-surface-variant">
            Henüz kategori yok. "Yeni Kategori" ile ekleyin.
          </p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Ad</th>
                <th>Sıra</th>
                <th>Durum</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {segments.map((segment) => (
                <tr key={segment.id}>
                  <td className="font-mono text-xs">{segment.code}</td>
                  <td className="font-semibold">{segment.name}</td>
                  <td className="text-on-surface-variant text-sm">{segment.displayOrder}</td>
                  <td>
                    <span className={`chip ${segment.isActive ? 'chip-success' : 'chip-neutral'}`}>
                      {segment.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                      title="Düzenle"
                      onClick={() => setModal({ kind: 'edit', segment })}
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

      {modal.kind !== 'none' ? (
        <SegmentModal
          mode={modal.kind === 'create' ? 'create' : 'edit'}
          segment={modal.kind === 'edit' ? modal.segment : null}
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

interface SegmentFormState {
  code: string
  name: string
  displayOrder: number
  isActive: boolean
}

function SegmentModal({
  mode,
  segment,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit'
  segment: SegmentRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<SegmentFormState>({
    code: segment?.code ?? '',
    name: segment?.name ?? '',
    displayOrder: segment?.displayOrder ?? (mode === 'create' ? 10 : 0),
    isActive: segment?.isActive ?? true,
  })
  const [error, setError] = useState<string | null>(null)

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        displayOrder: Number(form.displayOrder),
      }
      if (mode === 'create') {
        await api.post('/segments', payload)
      } else if (segment) {
        await api.put(`/segments/${segment.id}`, {
          name: payload.name,
          displayOrder: payload.displayOrder,
          isActive: form.isActive,
        })
      }
    },
    onSuccess: () => onSaved(),
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Kayıt başarısız'),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!segment) return
      await api.delete(`/segments/${segment.id}`)
    },
    onSuccess: () => onSaved(),
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Silme başarısız'),
  })

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
        className="card w-full max-w-lg"
        style={{ padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="text-lg font-bold text-on-surface">
            {mode === 'create' ? 'Yeni Kategori' : `Kategori: ${segment?.name}`}
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
          <Field label="Kod (benzersiz, max 20)">
            <input
              className="input w-full"
              value={form.code}
              maxLength={20}
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
          <Field label="Ad (max 100)" className="col-span-2">
            <input
              className="input w-full"
              value={form.name}
              maxLength={100}
              required
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
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
