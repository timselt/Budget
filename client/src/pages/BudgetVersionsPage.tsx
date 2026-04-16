import { useState } from 'react'
import { useBudgetYears } from '../hooks/useBudgetYears'
import {
  useBudgetVersions,
  useBudgetVersion,
  useCreateVersion,
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
  const submitVersion = useSubmitVersion(selectedYearId)
  const approveVersion = useApproveVersion(selectedYearId)
  const rejectVersion = useRejectVersion(selectedYearId)
  const activateVersion = useActivateVersion(selectedYearId)
  const archiveVersion = useArchiveVersion(selectedYearId)

  const isAnyMutating =
    createVersion.isPending ||
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
    const versionName = `V${(versions?.length ?? 0) + 1}`
    createVersion.mutate({ yearId: selectedYearId, name: versionName })
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
      <header className="mb-12">
        <h1 className="font-headline text-4xl font-bold tracking-[-0.02em] text-sl-on-surface">
          Bütçe Versiyonları
        </h1>
        <p className="font-body text-lg text-sl-on-surface-variant mt-2 max-w-2xl">
          Versiyon oluşturun, onay akışını yönetin.
        </p>
      </header>

      {/* Year selector + create */}
      <div className="mb-12 flex flex-wrap items-center gap-3">
        {yearsLoading && (
          <span className="font-body text-sm text-sl-on-surface-variant">
            Yıllar yükleniyor...
          </span>
        )}

        {years && (
          <select
            value={selectedYearId ?? ''}
            onChange={(e) => {
              const val = Number(e.target.value)
              setSelectedYearId(val || null)
              setDetailId(null)
            }}
            className="rounded-lg border border-sl-outline-variant/15 bg-sl-surface-lowest px-3 py-2
                       font-body text-sm text-sl-on-surface
                       focus:border-sl-primary focus:outline-none focus:ring-2 focus:ring-sl-primary-fixed"
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
          className="rounded-lg bg-sl-primary px-4 py-2 font-body text-sm font-medium
                     text-sl-on-primary transition-colors hover:bg-sl-primary-container
                     disabled:opacity-50"
        >
          {createVersion.isPending ? 'Oluşturuluyor...' : 'Yeni Versiyon'}
        </button>
      </div>

      {/* Error state */}
      {versionsError && (
        <div className="mb-6 rounded-lg bg-sl-error-container/30 p-4">
          <p className="font-body text-sm text-sl-error">
            Versiyonlar yüklenemedi. Lütfen tekrar deneyin.
          </p>
        </div>
      )}

      {/* Loading state */}
      {versionsLoading && selectedYearId !== null && (
        <div className="flex h-48 items-center justify-center">
          <p className="font-body text-sl-on-surface-variant">Yükleniyor...</p>
        </div>
      )}

      {/* Content grid */}
      <div className="flex gap-6">
        {/* Version list */}
        <div className="flex-1">
          {versions && versions.length === 0 && (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-sl-outline-variant/15 bg-sl-surface-low">
              <p className="font-body text-sm text-sl-on-surface-variant">
                Bu yıl için henüz versiyon oluşturulmamış.
              </p>
              <button
                type="button"
                onClick={handleCreate}
                className="mt-3 font-body text-sm font-medium text-sl-primary hover:text-sl-primary-container"
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
                    ? 'ring-2 ring-sl-primary-fixed'
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
            <div className="sticky top-6 rounded-xl bg-sl-surface-lowest p-8 shadow-[0_12px_32px_rgba(25,28,31,0.04)]">
              <h2 className="font-headline text-xl font-bold tracking-tight text-sl-on-surface">
                Onay Geçmişi
              </h2>
              <p className="mb-4 font-body text-xs text-sl-on-surface-variant">
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
