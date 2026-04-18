import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

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

type WorkflowAction = 'submit' | 'approve/dept' | 'approve/finance' | 'approve/cfo' | 'activate' | 'reject' | 'archive'

const STATUS_META: Record<string, { chip: string; label: string; nextActions: WorkflowAction[] }> = {
  DRAFT: { chip: 'chip-neutral', label: 'Taslak', nextActions: ['submit'] },
  SUBMITTED: { chip: 'chip-info', label: 'Gönderildi', nextActions: ['approve/dept', 'reject'] },
  DEPTAPPROVED: { chip: 'chip-info', label: 'Departman Onaylı', nextActions: ['approve/finance', 'reject'] },
  FINANCEAPPROVED: { chip: 'chip-info', label: 'Finans Onaylı', nextActions: ['approve/cfo', 'reject'] },
  CFOAPPROVED: { chip: 'chip-success', label: 'CFO Onaylı', nextActions: ['activate', 'reject'] },
  ACTIVE: { chip: 'chip-success', label: 'Aktif', nextActions: ['archive'] },
  REJECTED: { chip: 'chip-error', label: 'Reddedildi', nextActions: ['submit'] },
  ARCHIVED: { chip: 'chip-neutral', label: 'Arşiv', nextActions: [] },
}

const ACTION_LABELS: Record<WorkflowAction, string> = {
  submit: 'Gönder',
  'approve/dept': 'Dept Onayla',
  'approve/finance': 'Finans Onayla',
  'approve/cfo': 'CFO Onayla',
  activate: 'Aktifleştir',
  reject: 'Reddet',
  archive: 'Arşivle',
}

const TERMINAL_STATUSES = new Set(['ARCHIVED'])

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

  const versions = versionsQueries.data ?? []
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['all-budget-versions'] })
    queryClient.invalidateQueries({ queryKey: ['budget-versions'] })
  }

  const actionMutation = useMutation({
    mutationFn: async ({ versionId, action, reason }: { versionId: number; action: WorkflowAction; reason?: string }) => {
      const endpoint = `/budget/versions/${versionId}/${action}`
      const body = action === 'reject' ? { reason: reason ?? 'Belirtilmedi' } : undefined
      await api.post(endpoint, body)
    },
    onSuccess: () => invalidateAll(),
  })

  const { pending, active, terminal } = useMemo(() => {
    const pending: VersionWithYear[] = []
    const active: VersionWithYear[] = []
    const terminal: VersionWithYear[] = []
    for (const v of versions) {
      const status = (v.status ?? '').toUpperCase()
      if (status === 'ACTIVE') active.push(v)
      else if (TERMINAL_STATUSES.has(status)) terminal.push(v)
      else pending.push(v)
    }
    pending.sort((a, b) => b.year - a.year || b.createdAt.localeCompare(a.createdAt))
    active.sort((a, b) => b.year - a.year)
    terminal.sort((a, b) => b.year - a.year)
    return { pending, active, terminal }
  }, [versions])

  return (
    <section>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-on-surface">Onay Akışı</h2>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 mb-6">
        <KpiCard title="Bekleyen" value={pending.length} subtitle="aksiyon gerekir" chip="chip-warning" />
        <KpiCard title="Aktif Versiyonlar" value={active.length} subtitle="yürürlükte" chip="chip-success" />
        <KpiCard title="Arşivli" value={terminal.length} subtitle="geçmiş" chip="chip-neutral" />
      </div>

      <VersionSection
        title={`Bekleyen Onaylar (${pending.length})`}
        emptyText="Bekleyen onay yok — tüm versiyonlar ya aktif ya arşivli."
        versions={pending}
        onAction={(versionId, action, reason) =>
          actionMutation.mutate({ versionId, action, reason })
        }
        actionPending={actionMutation.isPending}
      />

      <VersionSection
        title={`Aktif Versiyonlar (${active.length})`}
        emptyText="Henüz aktifleştirilmiş versiyon yok."
        versions={active}
        onAction={(versionId, action, reason) =>
          actionMutation.mutate({ versionId, action, reason })
        }
        actionPending={actionMutation.isPending}
      />
    </section>
  )
}

function VersionSection({
  title,
  emptyText,
  versions,
  onAction,
  actionPending,
}: {
  title: string
  emptyText: string
  versions: VersionWithYear[]
  onAction: (versionId: number, action: WorkflowAction, reason?: string) => void
  actionPending: boolean
}) {
  return (
    <div className="card p-0 overflow-hidden mb-6">
      <div className="p-4 border-b border-outline-variant">
        <h3 className="text-base font-bold text-on-surface">{title}</h3>
      </div>
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
              const statusKey = (v.status ?? '').toUpperCase().replace(/_/g, '')
              const meta = STATUS_META[statusKey] ?? { chip: 'chip-neutral', label: v.status, nextActions: [] }
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
                      {meta.nextActions.map((action) => (
                        <button
                          key={action}
                          type="button"
                          className={action === 'reject' ? 'btn-ghost text-error' : 'btn-secondary'}
                          style={{ padding: '.35rem .6rem', fontSize: '.7rem' }}
                          disabled={actionPending}
                          onClick={() => {
                            if (action === 'reject') {
                              const reason = prompt('Red sebebi giriniz:')
                              if (!reason?.trim()) return
                              onAction(v.id, action, reason)
                            } else {
                              onAction(v.id, action)
                            }
                          }}
                        >
                          {ACTION_LABELS[action]}
                        </button>
                      ))}
                      {meta.nextActions.length === 0 ? (
                        <span className="text-xs text-on-surface-variant">—</span>
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
