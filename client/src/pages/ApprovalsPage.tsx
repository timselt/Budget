import { useState } from 'react'
import { useBudgetYears } from '../hooks/useBudgetYears'
import {
  useBudgetVersions,
  useApproveVersion,
  useRejectVersion,
  getApprovalLevel,
  type BudgetVersion,
} from '../hooks/useBudgetVersions'
import { StatusBadge } from '../components/approvals/StatusBadge'
import { RejectModal } from '../components/approvals/RejectModal'

const PENDING_STATUSES = new Set([
  'SUBMITTED',
  'DEPT_APPROVED',
  'FINANCE_APPROVED',
])

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

function getApprovalLevelLabel(status: string): string {
  switch (status) {
    case 'SUBMITTED':
      return 'Departman onayı bekliyor'
    case 'DEPT_APPROVED':
      return 'Finans onayı bekliyor'
    case 'FINANCE_APPROVED':
      return 'CFO onayı bekliyor'
    default:
      return ''
  }
}

export function ApprovalsPage() {
  const [selectedYearId, setSelectedYearId] = useState<number | null>(null)
  const [rejectTarget, setRejectTarget] = useState<{
    id: number
    name: string
  } | null>(null)

  const { data: years, isLoading: yearsLoading } = useBudgetYears()
  const { data: versions, isLoading: versionsLoading } =
    useBudgetVersions(selectedYearId)

  const approveVersion = useApproveVersion(selectedYearId)
  const rejectVersion = useRejectVersion(selectedYearId)

  const isAnyMutating = approveVersion.isPending || rejectVersion.isPending

  // Auto-select first year
  if (years && years.length > 0 && selectedYearId === null) {
    setSelectedYearId(years[0].id)
  }

  const pendingVersions: BudgetVersion[] =
    versions?.filter((v) => PENDING_STATUSES.has(v.status)) ?? []

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
          Bekleyen Onaylar
        </h1>
        <p className="font-body text-lg text-sl-on-surface-variant mt-2 max-w-2xl">
          Onay bekleyen bütçe versiyonlarını inceleyin.
        </p>
      </header>

      {/* Year selector */}
      <div className="mb-12">
        {yearsLoading && (
          <span className="font-body text-sm text-sl-on-surface-variant">
            Yıllar yükleniyor...
          </span>
        )}

        {years && (
          <select
            value={selectedYearId ?? ''}
            onChange={(e) => setSelectedYearId(Number(e.target.value) || null)}
            className="rounded-lg border border-sl-outline-variant/15 bg-sl-surface-lowest px-3 py-2
                       font-body text-sm text-sl-on-surface
                       focus:border-sl-primary focus:outline-none focus:ring-2 focus:ring-sl-primary-fixed"
          >
            <option value="" disabled>
              Yıl seçin
            </option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.year}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Loading */}
      {versionsLoading && selectedYearId !== null && (
        <div className="flex h-48 items-center justify-center">
          <p className="font-body text-sl-on-surface-variant">Yükleniyor...</p>
        </div>
      )}

      {/* Empty state */}
      {!versionsLoading && pendingVersions.length === 0 && selectedYearId !== null && (
        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-sl-outline-variant/15 bg-sl-surface-low">
          <p className="font-body text-sm text-sl-on-surface-variant">
            Bekleyen onay bulunmuyor.
          </p>
        </div>
      )}

      {/* Pending approvals table */}
      {pendingVersions.length > 0 && (
        <div className="overflow-hidden rounded-xl bg-sl-surface-lowest shadow-[0_12px_32px_rgba(25,28,31,0.04)]">
          <table className="w-full text-left font-body text-sm">
            <thead>
              <tr className="bg-sl-surface-low">
                <th className="px-5 py-3 font-medium text-sl-on-surface-variant">
                  Versiyon
                </th>
                <th className="px-5 py-3 font-medium text-sl-on-surface-variant">
                  Durum
                </th>
                <th className="px-5 py-3 font-medium text-sl-on-surface-variant">
                  Bekleyen Adım
                </th>
                <th className="px-5 py-3 font-medium text-sl-on-surface-variant">
                  Oluşturulma
                </th>
                <th className="px-5 py-3 text-right font-medium text-sl-on-surface-variant">
                  İşlem
                </th>
              </tr>
            </thead>
            <tbody>
              {pendingVersions.map((v) => (
                <tr
                  key={v.id}
                  className="transition-colors hover:bg-sl-surface-low/50"
                >
                  <td className="px-5 py-3.5 font-medium text-sl-on-surface">
                    {v.name}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={v.status} />
                  </td>
                  <td className="px-5 py-3.5 text-sl-on-surface-variant">
                    {getApprovalLevelLabel(v.status)}
                  </td>
                  <td className="px-5 py-3.5 text-sl-on-surface-variant">
                    {formatDate(v.createdAt)}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleApprove(v.id, v.status)}
                        disabled={isAnyMutating}
                        className="rounded-lg bg-sl-on-tertiary-container/10 px-3 py-1.5 text-xs font-medium
                                   text-sl-tertiary transition-colors hover:bg-sl-on-tertiary-container/20
                                   disabled:opacity-50"
                      >
                        Onayla
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setRejectTarget({ id: v.id, name: v.name })
                        }
                        disabled={isAnyMutating}
                        className="rounded-lg bg-sl-error-container/30 px-3 py-1.5 text-xs font-medium
                                   text-sl-error transition-colors hover:bg-sl-error-container/50
                                   disabled:opacity-50"
                      >
                        Reddet
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
