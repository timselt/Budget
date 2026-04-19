import { describe, expect, it } from 'vitest'
import { deriveTasks } from './taskCenterDerivation'

const baseVersion = {
  id: 1,
  budgetYearId: 1,
  name: '2026 V1',
  status: 'Draft',
  isActive: false,
  rejectionReason: null as string | null,
  createdAt: '2026-01-01T00:00:00Z',
}

describe('deriveTasks', () => {
  it('Draft eksik müşteri → "Devam Et" task medium priority', () => {
    const tasks = deriveTasks({
      versions: [{ ...baseVersion, status: 'Draft' }],
      entriesPerVersion: { 1: [{ customerId: 1 }, { customerId: 2 }] },
      customerIds: [1, 2, 3, 4],
      roles: ['Admin'],
    })
    expect(tasks).toHaveLength(1)
    expect(tasks[0].priority).toBe('medium')
    expect(tasks[0].title).toContain('2 eksik')
    expect(tasks[0].ctaLabel).toBe('Devam Et')
  })

  it('Draft tüm müşteri tamam → "Onaya Gönder" high priority', () => {
    const tasks = deriveTasks({
      versions: [{ ...baseVersion, status: 'Draft' }],
      entriesPerVersion: { 1: [{ customerId: 1 }, { customerId: 2 }] },
      customerIds: [1, 2],
      roles: ['Admin'],
    })
    expect(tasks[0].priority).toBe('high')
    expect(tasks[0].ctaLabel).toBe('Onaya Gönder')
  })

  it('Rejected → "Düzeltmeye Devam Et" high priority', () => {
    const tasks = deriveTasks({
      versions: [{ ...baseVersion, status: 'Rejected', rejectionReason: 'eksik' }],
      entriesPerVersion: { 1: [] },
      customerIds: [1],
      roles: ['FinanceManager'],
    })
    expect(tasks[0].ctaLabel).toBe('Düzeltmeye Devam Et')
    expect(tasks[0].priority).toBe('high')
  })

  it('PendingFinance gösterir sadece Finance/Admin için', () => {
    const versions = [{ ...baseVersion, status: 'PendingFinance' }]
    const ctxFinance = {
      versions, entriesPerVersion: {}, customerIds: [], roles: ['FinanceManager'],
    }
    const ctxViewer = { ...ctxFinance, roles: ['Viewer'] }

    expect(deriveTasks(ctxFinance)).toHaveLength(1)
    expect(deriveTasks(ctxFinance)[0].ctaLabel).toBe('Finans Onayla')
    expect(deriveTasks(ctxViewer)).toHaveLength(0)
  })

  it('PendingCfo sadece CFO için + high priority', () => {
    const versions = [{ ...baseVersion, status: 'PendingCfo' }]
    expect(deriveTasks({
      versions, entriesPerVersion: {}, customerIds: [], roles: ['CFO'],
    })[0].priority).toBe('high')
  })

  it('Active + yıl içinde Draft yok → Revizyon Aç low priority', () => {
    const tasks = deriveTasks({
      versions: [{ ...baseVersion, status: 'Active', isActive: true }],
      entriesPerVersion: {},
      customerIds: [],
      roles: ['Admin'],
    })
    expect(tasks[0].ctaLabel).toBe('Revizyon Aç')
    expect(tasks[0].priority).toBe('low')
  })

  it('Active + yıl içinde Draft VAR → Revizyon Aç gösterilmez', () => {
    const tasks = deriveTasks({
      versions: [
        { ...baseVersion, id: 1, status: 'Active', isActive: true },
        { ...baseVersion, id: 2, status: 'Draft' },
      ],
      entriesPerVersion: { 2: [] },
      customerIds: [1],
      roles: ['Admin'],
    })
    expect(tasks.find(t => t.ctaLabel === 'Revizyon Aç')).toBeUndefined()
  })

  it('boş — hiç actionable yok ise tasks=[]', () => {
    const tasks = deriveTasks({
      versions: [{ ...baseVersion, status: 'Archived' }],
      entriesPerVersion: {},
      customerIds: [],
      roles: ['Viewer'],
    })
    expect(tasks).toHaveLength(0)
  })

  it('priority sıralama: high > medium > low', () => {
    const tasks = deriveTasks({
      versions: [
        { ...baseVersion, id: 1, status: 'Active', isActive: true, createdAt: '2026-01-01' },
        { ...baseVersion, id: 2, status: 'Rejected', createdAt: '2026-02-01' },
      ],
      entriesPerVersion: { 2: [] },
      customerIds: [],
      roles: ['Admin'],
    })
    expect(tasks[0].priority).toBe('high')
  })
})
