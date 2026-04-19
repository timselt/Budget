import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { translateApiError } from '../lib/api-error'
import { useAuthStore } from '../stores/auth'
import {
  STATUS_CHIP_CLASS,
  STATUS_LABELS,
  type BudgetVersionStatus,
} from '../components/budget-planning/types'
import { RejectModal } from '../components/budget-planning/RejectModal'

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

interface VersionWithYear extends BudgetVersionRow {
  year: number
}

type WorkflowAction =
  | 'submit'
  | 'approve-finance'
  | 'approve-cfo-activate'
  | 'reject'
  | 'archive'

const STATUS_META: Record<BudgetVersionStatus, {
  chip: string
  label: string
  nextActions: WorkflowAction[]
}> = {
  Draft: {
    chip: STATUS_CHIP_CLASS.Draft,
    label: STATUS_LABELS.Draft,
    nextActions: ['submit'],
  },
  PendingFinance: {
    chip: STATUS_CHIP_CLASS.PendingFinance,
    label: STATUS_LABELS.PendingFinance,
    nextActions: ['approve-finance', 'reject'],
  },
  PendingCfo: {
    chip: STATUS_CHIP_CLASS.PendingCfo,
    label: STATUS_LABELS.PendingCfo,
    nextActions: ['approve-cfo-activate', 'reject'],
  },
  Active: {
    chip: STATUS_CHIP_CLASS.Active,
    label: STATUS_LABELS.Active,
    nextActions: ['archive'],
  },
  Rejected: {
    chip: STATUS_CHIP_CLASS.Rejected,
    label: STATUS_LABELS.Rejected,
    nextActions: ['submit'],
  },
  Archived: {
    chip: STATUS_CHIP_CLASS.Archived,
    label: STATUS_LABELS.Archived,
    nextActions: [],
  },
}

const ACTION_LABELS: Record<WorkflowAction, string> = {
  submit: 'Onaya Gönder',
  'approve-finance': 'Finans Onayla',
  'approve-cfo-activate': 'Onayla ve Yayına Al',
  reject: 'Reddet',
  archive: 'Arşivle',
}

const TERMINAL_STATUSES: ReadonlySet<BudgetVersionStatus> = new Set(['Archived'])

async function getYears(): Promise<BudgetYearRow[]> {
  const { data } = await api.get<BudgetYearRow[]>('/budget/years')
  return data
}

async function getVersions(yearId: number): Promise<BudgetVersionRow[]> {
  const { data } = await api.get<BudgetVersionRow[]>(`/budget/years/${yearId}/versions`)
  return data
}

export function ApprovalsPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const roles = user?.roles ?? []
  const isAdmin = roles.includes('Admin')
  const isFinance = isAdmin || roles.includes('FinanceManager')
  const isCfo = isAdmin || roles.includes('CFO')

  const [actionError, setActionError] = useState<string | null>(null)
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all')
  const [onlyMine, setOnlyMine] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<{ id: number; name: string } | null>(null)
  const [tab, setTab] = useState<'pending' | 'active' | 'archived'>('pending')

  const yearsQuery = useQuery({ queryKey: ['budget-years'], queryFn: getYears })
  const years = yearsQuery.data ?? []

  const versionsQueries = useQuery({
    queryKey: ['all-budget-versions', years.map((y) => y.id).join(',')],
    queryFn: async () => {
      const result: VersionWithYear[] = []
      for (const y of years) {
        const list = await getVersions(y.id)
        for (const v of list) {
          result.push({ ...v, year: y.year })
        }
      }
      return result
    },
    enabled: years.length > 0,
  })

  const versions = useMemo(() => versionsQueries.data ?? [], [versionsQueries.data])
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['all-budget-versions'] })
    queryClient.invalidateQueries({ queryKey: ['budget-versions'] })
  }

  const actionMutation = useMutation({
    mutationFn: async ({
      versionId,
      action,
      reason,
    }: { versionId: number; action: WorkflowAction; reason?: string }) => {
      const endpoint = `/budget/versions/${versionId}/${action}`
      const body = action === 'reject' ? { reason: reason ?? 'Belirtilmedi' } : undefined
      await api.post(endpoint, body)
    },
    onSuccess: () => {
      setActionError(null)
      invalidateAll()
    },
    onError: (e: unknown) => {
      setActionError(translateApiError(e))
    },
  })

  const canPerform = (action: WorkflowAction): boolean => {
    switch (action) {
      case 'submit':
        return isFinance || isCfo
      case 'approve-finance':
        return isFinance || isCfo
      case 'reject':
        return isFinance || isCfo
      case 'approve-cfo-activate':
        return isCfo
      case 'archive':
        return isFinance || isCfo
      default:
        return false
    }
  }

  const visibleVersions = useMemo(() => {
    let list = versions
    if (yearFilter !== 'all') list = list.filter((v) => v.year === yearFilter)
    if (onlyMine) {
      list = list.filter((v) => {
        const status = v.status as BudgetVersionStatus
        if (status === 'PendingFinance') return isFinance || isCfo
        if (status === 'PendingCfo') return isCfo
        if (status === 'Rejected') return true
        if (status === 'Active') return isFinance || isCfo
        return false
      })
    }
    return list
  }, [versions, yearFilter, onlyMine, isFinance, isCfo])

  const { pending, active, terminal } = useMemo(() => {
    const pending: VersionWithYear[] = []
    const active: VersionWithYear[] = []
    const terminal: VersionWithYear[] = []
    for (const v of visibleVersions) {
      const status = v.status as BudgetVersionStatus
      if (status === 'Active') active.push(v)
      else if (TERMINAL_STATUSES.has(status)) terminal.push(v)
      else pending.push(v)
    }
    pending.sort((a, b) => b.year - a.year || b.createdAt.localeCompare(a.createdAt))
    active.sort((a, b) => b.year - a.year)
    terminal.sort((a, b) => b.year - a.year)
    return { pending, active, terminal }
  }, [visibleVersions])

  const availableYears = useMemo(
    () => [...new Set(versions.map((v) => v.year))].sort((a, b) => b - a),
    [versions],
  )

  return (
    <section>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-on-surface">
            Onay Akışı
          </h2>
          <p className="page-context-hint">
            Bekleyen onayları yönetin. <strong>CFO onayı</strong> versiyonu
            yayına alır ve eski aktifi otomatik arşivler.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 mb-6">
        <KpiCard title="Bekleyen" value={pending.length} subtitle="aksiyon gerekir" chip="chip-warning" />
        <KpiCard title="Aktif Versiyonlar" value={active.length} subtitle="yürürlükte" chip="chip-success" />
        <KpiCard title="Arşivli" value={terminal.length} subtitle="geçmiş" chip="chip-neutral" />
      </div>

      <div className="card mb-4 flex flex-wrap items-center gap-3">
        <span className="label-sm">Filtre</span>
        <select
          className="select"
          value={yearFilter === 'all' ? '' : yearFilter}
          onChange={(e) =>
            setYearFilter(e.target.value === '' ? 'all' : Number(e.target.value))
          }
        >
          <option value="">Tüm yıllar</option>
          {availableYears.map((y) => (
            <option key={y} value={y}>FY {y}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyMine}
            onChange={(e) => setOnlyMine(e.target.checked)}
          />
          Sadece benimle ilgili
        </label>
        <span className="ml-auto text-xs text-on-surface-variant">
          {isAdmin
            ? 'Admin (tüm aksiyonlar)'
            : `${isFinance ? 'Finans' : ''}${isFinance && isCfo ? ' + ' : ''}${isCfo ? 'CFO' : ''}${!isFinance && !isCfo ? 'Salt-okunur' : ''}`}
        </span>
      </div>

      {actionError ? (
        <div className="card mb-4 text-sm text-error flex items-start gap-2">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            error
          </span>
          <div className="flex-1">{actionError}</div>
          <button
            type="button"
            className="text-on-surface-variant hover:text-on-surface"
            onClick={() => setActionError(null)}
            title="Kapat"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>
      ) : null}

      <div className="flex gap-1 mb-4 bg-surface-container-low rounded-lg p-1 w-fit">
        <button
          type="button"
          className={`tab ${tab === 'pending' ? 'active' : ''}`}
          onClick={() => setTab('pending')}
        >
          <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: 16 }}>
            pending_actions
          </span>
          Benden Bekleyenler ({pending.length})
        </button>
        <button
          type="button"
          className={`tab ${tab === 'active' ? 'active' : ''}`}
          onClick={() => setTab('active')}
        >
          <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: 16 }}>
            verified
          </span>
          Yürürlüktekiler ({active.length})
        </button>
        <button
          type="button"
          className={`tab ${tab === 'archived' ? 'active' : ''}`}
          onClick={() => setTab('archived')}
        >
          <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: 16 }}>
            inventory_2
          </span>
          Sonuçlananlar ({terminal.length})
        </button>
      </div>

      {tab === 'pending' && (
        <VersionSection
          title=""
          emptyText="Şu an onayınızı bekleyen versiyon yok. Bütçe Planlama'dan yeni bir taslak başlatabilirsiniz."
          versions={pending}
          canPerform={canPerform}
          onAction={(versionId, action, reason) =>
            actionMutation.mutate({ versionId, action, reason })
          }
          onRejectRequest={(id, name) => setRejectTarget({ id, name })}
          actionPending={actionMutation.isPending}
          hideHeader
        />
      )}

      {tab === 'active' && (
        <VersionSection
          title=""
          emptyText="Henüz yürürlükteki versiyon yok."
          versions={active}
          canPerform={canPerform}
          onAction={(versionId, action, reason) =>
            actionMutation.mutate({ versionId, action, reason })
          }
          onRejectRequest={(id, name) => setRejectTarget({ id, name })}
          actionPending={actionMutation.isPending}
          hideHeader
        />
      )}

      {tab === 'archived' && (
        <VersionSection
          title=""
          emptyText="Henüz arşivlenmiş veya tamamlanmış versiyon yok."
          versions={terminal}
          canPerform={canPerform}
          onAction={(versionId, action, reason) =>
            actionMutation.mutate({ versionId, action, reason })
          }
          onRejectRequest={(id, name) => setRejectTarget({ id, name })}
          actionPending={actionMutation.isPending}
          hideHeader
        />
      )}

      {rejectTarget ? (
        <RejectModal
          versionName={rejectTarget.name}
          pending={actionMutation.isPending}
          onClose={() => setRejectTarget(null)}
          onConfirm={(reason) => {
            actionMutation.mutate(
              { versionId: rejectTarget.id, action: 'reject', reason },
              { onSettled: () => setRejectTarget(null) },
            )
          }}
        />
      ) : null}
    </section>
  )
}

function VersionSection({
  title,
  emptyText,
  versions,
  canPerform,
  onAction,
  onRejectRequest,
  actionPending,
  hideHeader = false,
}: {
  title: string
  emptyText: string
  versions: VersionWithYear[]
  canPerform: (action: WorkflowAction) => boolean
  onAction: (versionId: number, action: WorkflowAction, reason?: string) => void
  onRejectRequest: (versionId: number, versionName: string) => void
  actionPending: boolean
  hideHeader?: boolean
}) {
  return (
    <div className={`card p-0 overflow-hidden ${hideHeader ? '' : 'mb-6'}`}>
      {hideHeader ? null : (
        <div className="p-4 border-b border-outline-variant">
          <h3 className="text-base font-bold text-on-surface">{title}</h3>
        </div>
      )}
      {versions.length === 0 ? (
        <p className="p-6 text-sm text-on-surface-variant">{emptyText}</p>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Yıl</th>
              <th>Versiyon</th>
              <th>Durum</th>
              <th>Oluşturuldu</th>
              <th>Red Sebebi</th>
              <th className="text-right">Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => {
              const status = v.status as BudgetVersionStatus
              const meta = STATUS_META[status] ?? {
                chip: 'chip-neutral',
                label: v.status,
                nextActions: [] as WorkflowAction[],
              }
              const allowedActions = meta.nextActions.filter(canPerform)
              return (
                <tr key={v.id}>
                  <td className="font-semibold num">FY {v.year}</td>
                  <td className="font-semibold">
                    {v.name}
                    {v.isActive ? <span className="chip chip-success ml-2">Aktif</span> : null}
                  </td>
                  <td>
                    <span className={`chip ${meta.chip}`}>{meta.label}</span>
                  </td>
                  <td className="text-xs text-on-surface-variant">
                    {new Date(v.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="text-xs text-on-surface-variant max-w-[240px] truncate">
                    {v.rejectionReason ?? '—'}
                  </td>
                  <td className="text-right">
                    <div className="inline-flex gap-1 flex-wrap justify-end">
                      {meta.nextActions.length === 0 ? (
                        <span className="text-xs text-on-surface-variant">—</span>
                      ) : allowedActions.length === 0 ? (
                        <span className="chip chip-neutral text-xs">Yetkisiz</span>
                      ) : (
                        allowedActions.map((action) => {
                          const isReject = action === 'reject'
                          const isArchive = action === 'archive'
                          const isCfoActivate = action === 'approve-cfo-activate'
                          const btnClass = isReject
                            ? 'btn-ghost text-error'
                            : isArchive
                              ? 'btn-secondary'
                              : 'btn-primary'
                          const label = ACTION_LABELS[action]
                          return (
                            <button
                              key={action}
                              type="button"
                              className={btnClass}
                              style={{ padding: '.4rem .75rem', fontSize: '.75rem' }}
                              disabled={actionPending}
                              onClick={() => {
                                if (isReject) {
                                  onRejectRequest(v.id, v.name)
                                  return
                                }
                                const confirmMsg = isCfoActivate
                                  ? `"${v.name}" CFO onayı ile YAYINA ALINACAK. Mevcut yürürlükteki versiyon arşivlenecek. Emin misiniz?`
                                  : `"${v.name}" versiyonu için "${label}" aksiyonunu uygulamak istiyor musunuz?`
                                if (!confirm(confirmMsg)) return
                                onAction(v.id, action)
                              }}
                            >
                              {actionPending ? '…' : label}
                            </button>
                          )
                        })
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

function KpiCard({
  title,
  value,
  subtitle,
  chip,
}: {
  title: string
  value: number
  subtitle: string
  chip: string
}) {
  return (
    <div className="col-span-12 md:col-span-4 card">
      <div className="flex items-center gap-2">
        <span className="label-sm">{title}</span>
        <span className={`chip ${chip}`} />
      </div>
      <p className="text-2xl font-black tracking-display num mt-2">{value}</p>
      <p className="text-xs text-on-surface-variant mt-1">{subtitle}</p>
    </div>
  )
}
