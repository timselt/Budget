import { useMemo } from 'react'

interface Customer {
  id: number
  isActive: boolean
}
interface Entry {
  customerId: number
  month: number
  entryType: 'REVENUE' | 'CLAIM'
}
interface ExpenseEntry {
  id: number
}

export interface ChecklistItem {
  id: string
  level: 'pass' | 'warn' | 'fail'
  message: string
}

export interface ChecklistResult {
  items: ChecklistItem[]
  canSubmit: boolean
  hardFailCount: number
  warnCount: number
}

interface Input {
  customers: Customer[]
  entries: Entry[]
  expenseEntries: ExpenseEntry[]
}

/**
 * Onaya hazırlık kontrolü — pure derivation:
 *   - 1 sert kural (fail): tüm aktif müşterilerin en az 1 entry'si var mı?
 *   - 3 yumuşak uyarı (warn): boş ay, OPEX yok, hasar planı yok
 * canSubmit = hardFailCount === 0 && totalCount > 0
 */
export function computeChecklist(input: Input): ChecklistResult {
  const { customers, entries, expenseEntries } = input
  const activeCustomers = customers.filter((c) => c.isActive)
  const totalCount = activeCustomers.length

  const items: ChecklistItem[] = []

  // 1. Sert kural — tüm müşterilerde en az 1 entry
  const completedIds = new Set(entries.map((e) => e.customerId))
  const completedCount = activeCustomers.filter((c) =>
    completedIds.has(c.id),
  ).length

  if (completedCount === totalCount && totalCount > 0) {
    items.push({
      id: 'all-customers',
      level: 'pass',
      message: `${completedCount}/${totalCount} müşteri tamamlandı`,
    })
  } else {
    items.push({
      id: 'all-customers',
      level: 'fail',
      message: `${completedCount}/${totalCount} müşteri tamamlandı (${totalCount - completedCount} eksik)`,
    })
  }

  // 2. Boş ay — bir müşterinin ayda 0 entry'si var mı (12 < dolu ay sayısı)
  if (totalCount > 0 && completedCount > 0) {
    const customersWithEmptyMonths = activeCustomers.filter((c) => {
      const monthsWithEntries = new Set(
        entries.filter((e) => e.customerId === c.id).map((e) => e.month),
      )
      return monthsWithEntries.size > 0 && monthsWithEntries.size < 12
    })
    if (customersWithEmptyMonths.length > 0) {
      items.push({
        id: 'empty-months',
        level: 'warn',
        message: `${customersWithEmptyMonths.length} müşteride boş ay var`,
      })
    }
  }

  // 3. OPEX gider girilmedi mi?
  if (expenseEntries.length === 0) {
    items.push({
      id: 'opex',
      level: 'warn',
      message: 'OPEX kategorilerinde gider girilmedi',
    })
  } else {
    items.push({
      id: 'opex',
      level: 'pass',
      message: `${expenseEntries.length} OPEX gider satırı girildi`,
    })
  }

  // 4. Hasar planı eksik (sadece GELIR var, CLAIM yok)
  if (totalCount > 0) {
    const customersMissingClaim = activeCustomers.filter((c) => {
      const cEntries = entries.filter((e) => e.customerId === c.id)
      const hasRevenue = cEntries.some((e) => e.entryType === 'REVENUE')
      const hasClaim = cEntries.some((e) => e.entryType === 'CLAIM')
      return hasRevenue && !hasClaim
    })
    if (customersMissingClaim.length > 0) {
      items.push({
        id: 'claim-missing',
        level: 'warn',
        message: `${customersMissingClaim.length} müşteride hasar planı yok`,
      })
    }
  }

  const hardFailCount = items.filter((i) => i.level === 'fail').length
  const warnCount = items.filter((i) => i.level === 'warn').length

  return {
    items,
    canSubmit: hardFailCount === 0 && totalCount > 0,
    hardFailCount,
    warnCount,
  }
}

export function useSubmissionChecklist(input: Input): ChecklistResult {
  const { customers, entries, expenseEntries } = input
  return useMemo(
    () => computeChecklist({ customers, entries, expenseEntries }),
    [customers, entries, expenseEntries],
  )
}
