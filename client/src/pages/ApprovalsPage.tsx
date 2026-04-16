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
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Bekleyen Onaylar
        </h1>
        <p className="text-sm text-text-muted">
          Onay bekleyen bütçe versiyonlarını inceleyin.
        </p>
      </header>

      {/* Year selector */}
      <div className="mb-6">
        {yearsLoading && (
          <span className="text-sm text-text-muted">Yıllar yükleniyor...</span>
        )}

        {years && (
          <select
            value={selectedYearId ?? ''}
            onChange={(e) => setSelectedYearId(Number(e.target.value) || null)}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
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
          <p className="text-text-muted">Yükleniyor...</p>
        </div>
      )}

      {/* Empty state */}
      {!versionsLoading && pendingVersions.length === 0 && selectedYearId !== null && (
        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border">
          <p className="text-sm text-text-muted">
            Bekleyen onay bulunmuyor.
          </p>
        </div>
      )}

      {/* Pending approvals table */}
      {pendingVersions.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt">
                <th className="px-5 py-3 font-medium text-text-muted">
                  Versiyon
                </th>
                <th className="px-5 py-3 font-medium text-text-muted">
                  Durum
                </th>
                <th className="px-5 py-3 font-medium text-text-muted">
                  Bekleyen Adım
                </th>
                <th className="px-5 py-3 font-medium text-text-muted">
                  Oluşturulma
                </th>
                <th className="px-5 py-3 text-right font-medium text-text-muted">
                  İşlem
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pendingVersions.map((v) => (
                <tr
                  key={v.id}
                  className="transition-colors hover:bg-surface-alt/50"
                >
                  <td className="px-5 py-3.5 font-medium text-text">
                    {v.name}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={v.status} />
                  </td>
                  <td className="px-5 py-3.5 text-text-muted">
                    {getApprovalLevelLabel(v.status)}
                  </td>
                  <td className="px-5 py-3.5 text-text-muted">
                    {formatDate(v.createdAt)}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleApprove(v.id, v.status)}
                        disabled={isAnyMutating}
                        className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50"
                      >
                        Onayla
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setRejectTarget({ id: v.id, name: v.name })
                        }
                        disabled={isAnyMutating}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
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
