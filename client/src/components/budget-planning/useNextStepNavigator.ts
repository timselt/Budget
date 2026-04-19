import { useMemo } from 'react'
import type { ChecklistResult } from './useSubmissionChecklist'

export type NextStepActionKind =
  | 'jump-to-customer'
  | 'jump-to-opex'
  | 'highlight-scenario'
  | 'none'

export interface NextStepAction {
  kind: NextStepActionKind
  customerId?: number
  scrollToMonth?: number
  scrollToType?: 'REVENUE' | 'CLAIM'
  expenseCategoryId?: number
}

export interface NextStep {
  message: string
  ctaLabel: string
  level: 'fail' | 'warn' | 'pass'
  action: NextStepAction
}

interface CustomerLite {
  id: number
  isActive: boolean
}
interface EntryLite {
  customerId: number
  month: number
  entryType: 'REVENUE' | 'CLAIM'
}
interface OpexLite {
  expenseCategoryId: number
}

export interface NavigatorContext {
  customers: ReadonlyArray<CustomerLite>
  entries: ReadonlyArray<EntryLite>
  opexCategories: ReadonlyArray<OpexLite>
}

/**
 * Checklist + bağlamdan tek priority navigation hedefi türetir.
 * Sıra: fail (eksik müşteri) > empty-month > claim-missing > opex > scenario > pass.
 * Hiç item yoksa null. Pure derivation, useMemo wrapper hook sonra.
 */
export function deriveNextStep(
  checklist: ChecklistResult,
  ctx: NavigatorContext,
): NextStep | null {
  // 1) fail — tüm müşteriler tamamlanmadı
  const failItem = checklist.items.find(
    (i) => i.level === 'fail' && i.id === 'all-customers',
  )
  if (failItem) {
    const completed = new Set(ctx.entries.map((e) => e.customerId))
    const missing = ctx.customers.find((c) => c.isActive && !completed.has(c.id))
    if (missing) {
      return {
        message: failItem.message,
        ctaLabel: 'Düzelt →',
        level: 'fail',
        action: { kind: 'jump-to-customer', customerId: missing.id },
      }
    }
  }

  // 2) empty-month warn — bir müşteride boş ay var
  const emptyMonth = checklist.items.find((i) => i.id === 'empty-months')
  if (emptyMonth?.level === 'warn') {
    for (const c of ctx.customers.filter((x) => x.isActive)) {
      const months = new Set(
        ctx.entries.filter((e) => e.customerId === c.id).map((e) => e.month),
      )
      if (months.size === 0 || months.size === 12) continue
      const firstEmpty = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].find(
        (m) => !months.has(m),
      )
      return {
        message: emptyMonth.message,
        ctaLabel: 'Düzelt →',
        level: 'warn',
        action: {
          kind: 'jump-to-customer',
          customerId: c.id,
          scrollToMonth: firstEmpty,
        },
      }
    }
  }

  // 3) claim-missing warn — sadece GELIR var, CLAIM yok
  const claimMissing = checklist.items.find((i) => i.id === 'claim-missing')
  if (claimMissing?.level === 'warn') {
    const target = ctx.customers.find((c) => {
      if (!c.isActive) return false
      const ce = ctx.entries.filter((e) => e.customerId === c.id)
      return (
        ce.some((e) => e.entryType === 'REVENUE') &&
        !ce.some((e) => e.entryType === 'CLAIM')
      )
    })
    if (target) {
      return {
        message: claimMissing.message,
        ctaLabel: 'Düzelt →',
        level: 'warn',
        action: {
          kind: 'jump-to-customer',
          customerId: target.id,
          scrollToType: 'CLAIM',
        },
      }
    }
  }

  // 4) opex warn — OPEX gider yok
  const opex = checklist.items.find((i) => i.id === 'opex')
  if (opex?.level === 'warn' && ctx.opexCategories.length > 0) {
    return {
      message: opex.message,
      ctaLabel: 'Düzelt →',
      level: 'warn',
      action: {
        kind: 'jump-to-opex',
        expenseCategoryId: ctx.opexCategories[0].expenseCategoryId,
      },
    }
  }

  // 5) scenario warn — senaryo seçilmedi
  const scenario = checklist.items.find((i) => i.id === 'scenario')
  if (scenario?.level === 'warn') {
    return {
      message: scenario.message,
      ctaLabel: 'Düzelt →',
      level: 'warn',
      action: { kind: 'highlight-scenario' },
    }
  }

  // 6) hepsi pass
  if (checklist.canSubmit && checklist.warnCount === 0) {
    return {
      message: 'Onaya hazır.',
      ctaLabel: 'Onaya Gönder',
      level: 'pass',
      action: { kind: 'none' },
    }
  }

  return null
}

export function useNextStepNavigator(
  checklist: ChecklistResult,
  ctx: NavigatorContext,
): NextStep | null {
  return useMemo(
    () => deriveNextStep(checklist, ctx),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      checklist.items,
      checklist.canSubmit,
      checklist.warnCount,
      ctx.customers,
      ctx.entries,
      ctx.opexCategories,
    ],
  )
}
