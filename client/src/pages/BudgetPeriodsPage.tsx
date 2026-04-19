import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import {
  getStatusChipClass,
  getStatusLabel,
  IN_PROGRESS_STATUSES,
  type BudgetVersionStatus,
} from '../components/budget-planning/types'

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
  rejectionReason: string | null
  createdAt: string
}

type ModalState =
  | { kind: 'none' }
  | { kind: 'year' }
  | { kind: 'version'; yearId: number }
  | { kind: 'reject'; versionId: number }

async function getYears(): Promise<BudgetYearRow[]> {
  const { data } = await api.get<BudgetYearRow[]>('/budget/years')
  return data
}

async function getVersions(yearId: number): Promise<BudgetVersionRow[]> {
  const { data } = await api.get<BudgetVersionRow[]>(`/budget/years/${yearId}/versions`)
  return data
}

// ADR-0015: 2-aşamalı onay akışı.
// Draft|Rejected → submit → PendingFinance → approve-finance → PendingCfo
//                                            → approve-cfo-activate → Active
const STATE_ACTIONS: {
  status: BudgetVersionStatus
  label: string
  endpoint: string
}[] = [
  { status: 'Draft', label: 'Onaya Gönder', endpoint: 'submit' },
  { status: 'Rejected', label: 'Tekrar Gönder', endpoint: 'submit' },
  { status: 'PendingFinance', label: 'Finans Onayla', endpoint: 'approve-finance' },
  { status: 'PendingCfo', label: 'Onayla ve Yayına Al', endpoint: 'approve-cfo-activate' },
]

const REJECTABLE_STATUSES: ReadonlySet<BudgetVersionStatus> = new Set([
  'PendingFinance',
  'PendingCfo',
])

interface BudgetPeriodsPageProps {
  /** Bütçe Planlama sayfasının "Versiyonlar" tab'ı içinde gömülü
   *  render edildiğinde true. Bu durumda H2 başlık + üst aksiyon
   *  butonları (Yeni Yıl / Yeni Versiyon) sayfa header'ına yapışmaz —
   *  küçük bir toolbar olarak gösterilir. */
  embedded?: boolean
}

export function BudgetPeriodsPage({ embedded = false }: BudgetPeriodsPageProps = {}) {
  const [selectedYearId, setSelectedYearId] = useState<number | null>(null)
  const [modal, setModal] = useState<ModalState>({ kind: 'none' })
  const queryClient = useQueryClient()

  const yearsQuery = useQuery({ queryKey: ['budget-years'], queryFn: getYears })
  const versionsQuery = useQuery({
    queryKey: ['budget-versions', selectedYearId],
    queryFn: () => (selectedYearId ? getVersions(selectedYearId) : Promise.resolve([])),
    enabled: selectedYearId !== null,
  })

  const years = yearsQuery.data ?? []
  const versions = versionsQuery.data ?? []
  const selectedYear = years.find((y) => y.id === selectedYearId) ?? null
  const hasInProgressDraft = versions.some((v) =>
    IN_PROGRESS_STATUSES.has(v.status as BudgetVersionStatus),
  )

  // Auto-select first year once data loads
  useEffect(() => {
    if (selectedYearId === null && years.length > 0) {
      setSelectedYearId(years[0].id)
    }
  }, [years, selectedYearId])

  const invalidateVersions = () =>
    queryClient.invalidateQueries({ queryKey: ['budget-versions', selectedYearId] })
  const invalidateYears = () => queryClient.invalidateQueries({ queryKey: ['budget-years'] })

  const transitionMutation = useMutation({
    mutationFn: async ({ versionId, endpoint }: { versionId: number; endpoint: string }) => {
      await api.post(`/budget/versions/${versionId}/${endpoint}`)
    },
    onSuccess: () => invalidateVersions(),
  })

  const archiveMutation = useMutation({
    mutationFn: async (versionId: number) => {
      await api.post(`/budget/versions/${versionId}/archive`)
    },
    onSuccess: () => invalidateVersions(),
  })

  return (
    <section>
      <div
        className={`flex justify-between items-end ${embedded ? 'mb-4' : 'mb-8'}`}
      >
        {embedded ? (
          <div className="flex-1">
            <p className="page-context-hint">
              Yıl ve sürümleri yönetin. Aynı yıl içinde max 1 yürürlükte +
              1 çalışılan taslak olabilir.
            </p>
          </div>
        ) : (
          <div>
            <h2 className="text-3xl font-extrabold tracking-display text-on-surface">
              Bütçe Dönemleri & Versiyonları
            </h2>
            <p className="page-context-hint">
              Yıl ve sürümleri yönetin. Aynı yıl içinde max 1 yürürlükte +
              1 çalışılan taslak olabilir.
            </p>
          </div>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setModal({ kind: 'year' })}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              calendar_add_on
            </span>
            Yeni Yıl
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!selectedYearId || hasInProgressDraft}
            title={
              hasInProgressDraft
                ? 'Bu yılda zaten çalışılan bir taslak var (yıl başına tek invariant).'
                : undefined
            }
            onClick={() => selectedYearId && setModal({ kind: 'version', yearId: selectedYearId })}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              add
            </span>
            Yeni Versiyon
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <aside className="col-span-12 lg:col-span-3 card p-0 overflow-hidden">
          <div className="p-4">
            <h3 className="text-base font-bold text-on-surface">Yıllar</h3>
            <p className="text-xs text-on-surface-variant mt-1">
              {years.length} tanımlı · {years.filter((y) => !y.isLocked).length} açık
            </p>
          </div>
          {yearsQuery.isLoading ? (
            <p className="px-4 pb-4 text-sm text-on-surface-variant">Yükleniyor...</p>
          ) : years.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-on-surface-variant">
              Henüz yıl tanımlı değil. "Yeni Yıl" ile başlayın.
            </p>
          ) : (
            <ul className="divide-y divide-surface-container-low">
              {years.map((year) => {
                const selected = year.id === selectedYearId
                return (
                  <li key={year.id}>
                    <button
                      type="button"
                      className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
                        selected ? 'bg-surface-container-low' : 'hover:bg-surface-container-low/40'
                      }`}
                      onClick={() => setSelectedYearId(year.id)}
                    >
                      <div>
                        <p className="text-lg font-black tracking-display">{year.year}</p>
                        <p className="text-[0.65rem] text-on-surface-variant">
                          {year.isLocked ? 'Kilitli (kapalı dönem)' : 'Açık dönem'}
                        </p>
                      </div>
                      {year.isLocked ? (
                        <span className="chip chip-neutral">Kilit</span>
                      ) : (
                        <span className="chip chip-success">Açık</span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        <div className="col-span-12 lg:col-span-9 card p-0 overflow-hidden">
          <div className="p-4">
            <h3 className="text-base font-bold text-on-surface">
              {selectedYear ? `${selectedYear.year} Versiyonları` : 'Versiyonlar'}
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">
              Taslak → Finans Onayında → CFO Onayında → Yürürlükte. Reddedilen
              versiyonlar düzeltilip "Tekrar Gönder" ile akışa geri sokulabilir;
              eskimiş aktifler arşive alınır.
            </p>
          </div>
          {!selectedYearId ? (
            <p className="px-4 pb-4 text-sm text-on-surface-variant">Bir yıl seçin.</p>
          ) : versionsQuery.isLoading ? (
            <p className="px-4 pb-4 text-sm text-on-surface-variant">Yükleniyor...</p>
          ) : versions.length === 0 ? (
            <div className="p-8 text-center">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 48 }}>
                calendar_month
              </span>
              <p className="text-base font-semibold text-on-surface mt-3">
                {selectedYear?.year ?? 'Bu yıl'} için ilk taslağı oluşturun
              </p>
              <p className="text-sm text-on-surface-variant mt-1 max-w-md mx-auto">
                Tutarlar bu taslak üzerinde girilir; tamamlanınca onaya gönderilir.
                CFO onayıyla yürürlüğe girer.
              </p>
              <button
                type="button"
                className="btn-primary mt-4 inline-flex"
                onClick={() => selectedYearId && setModal({ kind: 'version', yearId: selectedYearId })}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
                Yeni Taslak
              </button>
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Versiyon</th>
                  <th>Durum</th>
                  <th>Oluşturuldu</th>
                  <th>Aktif?</th>
                  <th>Açıklama</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((version) => {
                  const status = version.status as BudgetVersionStatus
                  const nextAction = STATE_ACTIONS.find((a) => a.status === status)
                  const canReject = REJECTABLE_STATUSES.has(status)
                  const canArchive = status === 'Active'
                  return (
                    <tr key={version.id}>
                      <td>
                        <strong>{version.name}</strong>
                        <p className="text-[0.65rem] font-mono text-on-surface-variant">#{version.id}</p>
                      </td>
                      <td>
                        <span className={`chip ${getStatusChipClass(version.status)}`}>
                          {getStatusLabel(version.status)}
                        </span>
                      </td>
                      <td className="text-xs text-on-surface-variant">
                        {new Date(version.createdAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td>
                        {version.isActive ? (
                          <span className="chip chip-success">Aktif</span>
                        ) : (
                          <span className="chip chip-neutral">—</span>
                        )}
                      </td>
                      <td className="text-xs text-error">{version.rejectionReason ?? ''}</td>
                      <td>
                        <div className="flex gap-1 flex-wrap">
                          {nextAction ? (
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '.3rem .6rem', fontSize: '.7rem' }}
                              onClick={() =>
                                transitionMutation.mutate({
                                  versionId: version.id,
                                  endpoint: nextAction.endpoint,
                                })
                              }
                              disabled={transitionMutation.isPending}
                            >
                              {nextAction.label}
                            </button>
                          ) : null}
                          {canReject ? (
                            <button
                              type="button"
                              className="btn-tertiary"
                              style={{ padding: '.3rem .6rem', fontSize: '.7rem' }}
                              onClick={() => setModal({ kind: 'reject', versionId: version.id })}
                            >
                              Reddet
                            </button>
                          ) : null}
                          {canArchive ? (
                            <button
                              type="button"
                              className="btn-tertiary"
                              style={{ padding: '.3rem .6rem', fontSize: '.7rem' }}
                              onClick={() => {
                                if (confirm('Bu versiyon arşivlenecek. Emin misiniz?')) {
                                  archiveMutation.mutate(version.id)
                                }
                              }}
                            >
                              Arşivle
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal.kind === 'year' ? (
        <YearModal
          onClose={() => setModal({ kind: 'none' })}
          onSaved={() => {
            invalidateYears()
            setModal({ kind: 'none' })
          }}
        />
      ) : null}

      {modal.kind === 'version' ? (
        <VersionModal
          yearId={modal.yearId}
          onClose={() => setModal({ kind: 'none' })}
          onSaved={() => {
            invalidateVersions()
            setModal({ kind: 'none' })
          }}
        />
      ) : null}

      {modal.kind === 'reject' ? (
        <RejectModal
          versionId={modal.versionId}
          onClose={() => setModal({ kind: 'none' })}
          onSaved={() => {
            invalidateVersions()
            setModal({ kind: 'none' })
          }}
        />
      ) : null}
    </section>
  )
}

function YearModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/budget/years', { year })
    },
    onSuccess: () => onSaved(),
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Oluşturulamadı'
      setError(msg)
    },
  })

  return (
    <Modal title="Yeni Bütçe Yılı" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setError(null)
          mutation.mutate()
        }}
      >
        <label className="block">
          <span className="label-sm block mb-1.5">Yıl</span>
          <input
            type="number"
            className="input w-full"
            min={2000}
            max={2100}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            required
          />
        </label>
        {error ? <p className="text-sm text-error mt-3">{error}</p> : null}
        <div className="flex gap-2 justify-end mt-4">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Vazgeç
          </button>
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Oluşturuluyor…' : 'Oluştur'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function VersionModal({
  yearId,
  onClose,
  onSaved,
}: {
  yearId: number
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post(`/budget/years/${yearId}/versions`, { name })
    },
    onSuccess: () => onSaved(),
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Oluşturulamadı'),
  })

  return (
    <Modal title="Yeni Versiyon (DRAFT)" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setError(null)
          mutation.mutate()
        }}
      >
        <label className="block">
          <span className="label-sm block mb-1.5">Versiyon Adı</span>
          <input
            type="text"
            className="input w-full"
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ör: v2026.1 İlk Plan"
            required
          />
        </label>
        {error ? <p className="text-sm text-error mt-3">{error}</p> : null}
        <div className="flex gap-2 justify-end mt-4">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Vazgeç
          </button>
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Oluşturuluyor…' : 'Taslak Oluştur'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function RejectModal({
  versionId,
  onClose,
  onSaved,
}: {
  versionId: number
  onClose: () => void
  onSaved: () => void
}) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post(`/budget/versions/${versionId}/reject`, { reason })
    },
    onSuccess: () => onSaved(),
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Reddedilemedi'),
  })

  return (
    <Modal title="Versiyonu Reddet" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setError(null)
          mutation.mutate()
        }}
      >
        <label className="block">
          <span className="label-sm block mb-1.5">Red Gerekçesi</span>
          <textarea
            className="input w-full"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            placeholder="Örn: Sağlık segmenti tahminleri yeniden gözden geçirilmeli"
          />
        </label>
        {error ? <p className="text-sm text-error mt-3">{error}</p> : null}
        <div className="flex gap-2 justify-end mt-4">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Vazgeç
          </button>
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Reddediliyor…' : 'Reddet'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
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
