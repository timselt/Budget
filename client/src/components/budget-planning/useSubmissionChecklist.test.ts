import { describe, expect, it } from 'vitest'
import { computeChecklist } from './useSubmissionChecklist'

const customer = (id: number) => ({ id, isActive: true })
const entry = (
  customerId: number,
  month: number,
  type: 'REVENUE' | 'CLAIM' = 'REVENUE',
) => ({ customerId, month, entryType: type })

describe('computeChecklist', () => {
  it('hardFail: müşterilerin hiçbirinde entry yok', () => {
    const r = computeChecklist({
      customers: [customer(1), customer(2)],
      entries: [],
      expenseEntries: [],
      scenarioId: null,
    })
    expect(r.canSubmit).toBe(false)
    expect(r.hardFailCount).toBe(1)
    const fail = r.items.find(i => i.level === 'fail')
    expect(fail?.message).toContain('0/2')
  })

  it('pass: tüm müşterilerde entry var', () => {
    const r = computeChecklist({
      customers: [customer(1), customer(2)],
      entries: [entry(1, 1), entry(2, 1)],
      expenseEntries: [],
      scenarioId: null,
    })
    expect(r.canSubmit).toBe(true)
    expect(r.items.find(i => i.id === 'all-customers')?.level).toBe('pass')
  })

  it('warn: bir müşteride boş ay var (ay sayısı < 12)', () => {
    const r = computeChecklist({
      customers: [customer(1)],
      entries: [entry(1, 1)],   // sadece Ocak
      expenseEntries: [],
      scenarioId: null,
    })
    const empty = r.items.find(i => i.id === 'empty-months')
    expect(empty?.level).toBe('warn')
  })

  it('warn: senaryo seçilmedi', () => {
    const r = computeChecklist({
      customers: [customer(1)],
      entries: [entry(1, 1), entry(1, 2), entry(1, 1, 'CLAIM')],
      expenseEntries: [{ id: 1 }],
      scenarioId: null,
    })
    expect(r.items.find(i => i.id === 'scenario')?.level).toBe('warn')
  })

  it('warn: OPEX gider yok', () => {
    const r = computeChecklist({
      customers: [customer(1)],
      entries: [entry(1, 1)],
      expenseEntries: [],
      scenarioId: 5,
    })
    expect(r.items.find(i => i.id === 'opex')?.level).toBe('warn')
  })

  it('warn: bir müşteride hasar planı yok (sadece GELIR)', () => {
    const r = computeChecklist({
      customers: [customer(1)],
      entries: [entry(1, 1, 'REVENUE')],
      expenseEntries: [{ id: 1 }],
      scenarioId: 5,
    })
    expect(r.items.find(i => i.id === 'claim-missing')?.level).toBe('warn')
  })

  it('pass: hem GELIR hem CLAIM, OPEX ve scenario tam', () => {
    const r = computeChecklist({
      customers: [customer(1)],
      entries: [
        ...Array.from({ length: 12 }, (_, i) => entry(1, i + 1, 'REVENUE')),
        ...Array.from({ length: 12 }, (_, i) => entry(1, i + 1, 'CLAIM')),
      ],
      expenseEntries: [{ id: 1 }],
      scenarioId: 5,
    })
    expect(r.canSubmit).toBe(true)
    expect(r.warnCount).toBe(0)
  })

  it('boş müşteri listesi → canSubmit false', () => {
    const r = computeChecklist({
      customers: [],
      entries: [],
      expenseEntries: [],
      scenarioId: null,
    })
    expect(r.canSubmit).toBe(false)
  })
})
