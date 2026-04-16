import { useState } from 'react'
import { useBudgetYears } from '../hooks/useBudgetYears'
import {
  useBudgetVersions,
  useBudgetVersion,
  useCreateVersion,
  useDeleteVersion,
  useSubmitVersion,
  useApproveVersion,
  useRejectVersion,
  useActivateVersion,
  useArchiveVersion,
  getApprovalLevel,
} from '../hooks/useBudgetVersions'
import { VersionCard } from '../components/approvals/VersionCard'
import { RejectModal } from '../components/approvals/RejectModal'
import { ApprovalTimeline } from '../components/approvals/ApprovalTimeline'

export function BudgetVersionsPage() {
  const [selectedYearId, setSelectedYearId] = useState<number | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [rejectTarget, setRejectTarget] = useState<{
    id: number
    name: string
  } | null>(null)

  const { data: years, isLoading: yearsLoading } = useBudgetYears()
  const { data: versions, isLoading: versionsLoading, error: versionsError } =
    useBudgetVersions(selectedYearId)
  const { data: versionDetail } = useBudgetVersion(detailId)

  const createVersion = useCreateVersion()
  const deleteVersion = useDeleteVersion(selectedYearId)
  const submitVersion = useSubmitVersion(selectedYearId)
  const approveVersion = useApproveVersion(selectedYearId)
  const rejectVersion = useRejectVersion(selectedYearId)
  const activateVersion = useActivateVersion(selectedYearId)
  const archiveVersion = useArchiveVersion(selectedYearId)

  const isAnyMutating =
    createVersion.isPending ||
    deleteVersion.isPending ||
    submitVersion.isPending ||
    approveVersion.isPending ||
    rejectVersion.isPending ||
    activateVersion.isPending ||
    archiveVersion.isPending

  // Auto-select first year
  if (years && years.length > 0 && selectedYearId === null) {
    setSelectedYearId(years[0].id)
  }

  function handleCreate() {
    if (selectedYearId === null) return
    createVersion.mutate({ yearId: selectedYearId })
  }

  function handleApprove(id: number, status: string) {
    const level = getApprovalLevel(status)
    if (level) {
      approveVersion.mutate({ id, level })
    }
  }

  function handleRejectConfirm(reason: string) {
    if (!rejectTarget) return
    rejectVersion.mutate(
      { id: rejectTarget.id, reason },
      { onSuccess: () => setRejectTarget(null) },
    )
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Bütçe Versiyonları
        </h1>
        <p className="text-sm text-text-muted">
          Versiyon oluşturun, onay akışını yönetin.
        </p>
      </header>

      {/* Year selector + create */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {yearsLoading && (
          <span className="text-sm text-text-muted">Yıllar yükleniyor...</span>
        )}

        {years && (
          <select
            value={selectedYearId ?? ''}
            onChange={(e) => {
              const val = Number(e.target.value)
              setSelectedYearId(val || null)
              setDetailId(null)
            }}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            <option value="" disabled>
              Yıl seçin
            </option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.year} {y.isLocked ? '(Kilitli)' : ''}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={handleCreate}
          disabled={selectedYearId === null || createVersion.isPending}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
        >
          {createVersion.isPending ? 'Oluşturuluyor...' : 'Yeni Versiyon'}
        </button>
      </div>

      {/* Error state */}
      {versionsError && (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm text-danger">
            Versiyonlar yüklenemedi. Lütfen tekrar deneyin.
          </p>
        </div>
      )}

      {/* Loading state */}
      {versionsLoading && selectedYearId !== null && (
        <div className="flex h-48 items-center justify-center">
          <p className="text-text-muted">Yükleniyor...</p>
        </div>
      )}

      {/* Content grid */}
      <div className="flex gap-6">
        {/* Version list */}
        <div className="flex-1">
          {versions && versions.length === 0 && (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border">
              <p className="text-sm text-text-muted">
                Bu yıl için henüz versiyon oluşturulmamış.
              </p>
              <button
                type="button"
                onClick={handleCreate}
                className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                İlk versiyonu oluştur
              </button>
            </div>
          )}

          <div className="space-y-3">
            {versions?.map((v) => (
              <div
                key={v.id}
                onClick={() => setDetailId(v.id)}
                className={`cursor-pointer rounded-xl transition-all ${
                  detailId === v.id
                    ? 'ring-2 ring-primary-300'
                    : ''
                }`}
              >
                <VersionCard
                  id={v.id}
                  name={v.name}
                  status={v.status}
                  isActive={v.isActive}
                  createdAt={v.createdAt}
                  isActionLoading={isAnyMutating}
                  onSubmit={
                    v.status === 'DRAFT'
                      ? () => submitVersion.mutate(v.id)
                      : undefined
                  }
                  onDelete={
                    v.status === 'DRAFT'
                      ? () => deleteVersion.mutate(v.id)
                      : undefined
                  }
                  onApprove={
                    getApprovalLevel(v.status)
                      ? () => handleApprove(v.id, v.status)
                      : undefined
                  }
                  onReject={
                    getApprovalLevel(v.status)
                      ? () => setRejectTarget({ id: v.id, name: v.name })
                      : undefined
                  }
                  onActivate={
                    v.status === 'CFO_APPROVED'
                      ? () => activateVersion.mutate(v.id)
                      : undefined
                  }
                  onArchive={
                    v.status === 'ACTIVE' && !v.isActive
                      ? () => archiveVersion.mutate(v.id)
                      : undefined
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {/* Detail sidebar */}
        {versionDetail && (
          <aside className="hidden w-80 shrink-0 lg:block">
            <div className="sticky top-6 rounded-xl border border-border bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-text">
                Onay Geçmişi
              </h2>
              <p className="mb-4 text-xs text-text-muted">
                {versionDetail.name}
              </p>
              <ApprovalTimeline
                entries={versionDetail.statusHistory ?? []}
              />
            </div>
          </aside>
        )}
      </div>

      {/* Reject modal */}
      <RejectModal
        isOpen={rejectTarget !== null}
        versionName={rejectTarget?.name ?? ''}
        onConfirm={handleRejectConfirm}
        onCancel={() => setRejectTarget(null)}
        isLoading={rejectVersion.isPending}
      />
    </div>
  )
}
