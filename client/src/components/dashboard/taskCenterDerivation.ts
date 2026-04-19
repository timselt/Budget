import type { BudgetVersionStatus } from '../budget-planning/types'

export interface Task {
  id: string
  title: string
  subtitle: string
  ctaLabel: string
  ctaHref: string
  priority: 'high' | 'medium' | 'low'
  icon: string
}

interface VersionRow {
  id: number
  budgetYearId: number
  name: string
  status: string
  isActive: boolean
  rejectionReason: string | null
  createdAt: string
}

export interface DeriveContext {
  versions: VersionRow[]
  entriesPerVersion: Record<number, { customerId: number }[]>
  customerIds: number[]
  roles: string[]
}

const PRIORITY_ORDER: Record<Task['priority'], number> = { high: 0, medium: 1, low: 2 }
export const IN_PROGRESS_STATES: BudgetVersionStatus[] = [
  'Draft', 'PendingFinance', 'PendingCfo', 'Rejected',
]

/**
 * Pure derivation: versiyon + entries + müşteri listesi + kullanıcı rolünden
 * rol-aware Task[] üretir. Yan etki yok, network call yok — useTaskCenter
 * hook bunu wrap eder.
 */
export function deriveTasks(ctx: DeriveContext): Task[] {
  const { versions, entriesPerVersion, customerIds, roles } = ctx
  const isAdmin = roles.includes('Admin')
  const isFinance = isAdmin || roles.includes('FinanceManager')
  const isCfo = isAdmin || roles.includes('CFO')

  const tasks: Task[] = []
  const hasInProgress = versions.some((v) =>
    IN_PROGRESS_STATES.includes(v.status as BudgetVersionStatus),
  )

  for (const v of versions) {
    const status = v.status as BudgetVersionStatus
    const href = `/budget/planning?versionId=${v.id}`
    const totalCustomers = customerIds.length
    const completedCount = new Set(
      (entriesPerVersion[v.id] ?? []).map((e) => e.customerId),
    ).size
    const missing = Math.max(0, totalCustomers - completedCount)

    if (status === 'Draft' && (isFinance || isAdmin)) {
      if (missing > 0) {
        tasks.push({
          id: `continue-${v.id}`,
          title: `${v.name} — ${missing} eksik müşteri`,
          subtitle: `Tamamlanma: ${completedCount}/${totalCustomers}`,
          ctaLabel: 'Devam Et',
          ctaHref: href,
          priority: 'medium',
          icon: 'edit_note',
        })
      } else {
        tasks.push({
          id: `submit-${v.id}`,
          title: `${v.name} — Onaya gönderilebilir`,
          subtitle: `${totalCustomers}/${totalCustomers} müşteri tamamlandı`,
          ctaLabel: 'Onaya Gönder',
          ctaHref: href,
          priority: 'high',
          icon: 'verified',
        })
      }
    }

    if (status === 'Rejected' && (isFinance || isAdmin)) {
      tasks.push({
        id: `fix-${v.id}`,
        title: `${v.name} — Düzeltmeye Devam Et`,
        subtitle: v.rejectionReason ?? 'Reddedildi',
        ctaLabel: 'Düzeltmeye Devam Et',
        ctaHref: href,
        priority: 'high',
        icon: 'build_circle',
      })
    }

    if (status === 'PendingFinance' && isFinance) {
      tasks.push({
        id: `approve-finance-${v.id}`,
        title: `${v.name} — Finans onayınızı bekliyor`,
        subtitle: 'Finans Kontrolünde',
        ctaLabel: 'Finans Onayla',
        ctaHref: '/approvals',
        priority: 'medium',
        icon: 'verified',
      })
    }

    if (status === 'PendingCfo' && isCfo) {
      tasks.push({
        id: `approve-cfo-${v.id}`,
        title: `${v.name} — CFO onayınızı bekliyor`,
        subtitle: 'Yayına alma adımı',
        ctaLabel: 'Onayla ve Yayına Al',
        ctaHref: '/approvals',
        priority: 'high',
        icon: 'rocket_launch',
      })
    }

    if (status === 'Active' && (isFinance || isAdmin) && !hasInProgress) {
      tasks.push({
        id: `revise-${v.id}`,
        title: `${v.name} — Yürürlükte`,
        subtitle: 'Revize etmek için yeni taslak açın',
        ctaLabel: 'Revizyon Aç',
        ctaHref: href,
        priority: 'low',
        icon: 'restart_alt',
      })
    }
  }

  tasks.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
  return tasks
}
