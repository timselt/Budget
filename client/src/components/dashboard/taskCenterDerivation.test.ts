import { describe, it, expect } from 'vitest'
import { deriveTasks } from './taskCenterDerivation'

const customerIds = [1, 2, 3]
const noEntries = {}

const v = (overrides: Partial<{
  id: number
  name: string
  status: string
  isActive: boolean
}> = {}) => ({
  id: 1,
  budgetYearId: 1,
  name: 'v2026.1',
  status: 'Draft',
  isActive: false,
  rejectionReason: null,
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('deriveTasks — sapma uyarısı', () => {
  it('aktif versiyon yoksa sapma task üretmez', () => {
    const tasks = deriveTasks({
      versions: [],
      entriesPerVersion: noEntries,
      customerIds,
      roles: ['Admin'],
      varianceByVersion: {},
    })
    expect(tasks.find((t) => t.id.startsWith('variance-'))).toBeUndefined()
  })

  it('aktif versiyon + |variance| %25 → high priority sapma task', () => {
    const tasks = deriveTasks({
      versions: [v({ id: 5, status: 'Active', isActive: true })],
      entriesPerVersion: noEntries,
      customerIds,
      roles: ['Admin'],
      varianceByVersion: {
        5: { totalVariancePercent: 25, criticalCategoryCount: 0 },
      },
    })
    const variance = tasks.find((t) => t.id === 'variance-5')
    expect(variance).toBeDefined()
    expect(variance?.priority).toBe('high')
    expect(variance?.title).toContain('25')
  })

  it('aktif versiyon + variance %15 + 0 critical → task üretmez', () => {
    const tasks = deriveTasks({
      versions: [v({ id: 5, status: 'Active', isActive: true })],
      entriesPerVersion: noEntries,
      customerIds,
      roles: ['Admin'],
      varianceByVersion: {
        5: { totalVariancePercent: 15, criticalCategoryCount: 0 },
      },
    })
    expect(tasks.find((t) => t.id.startsWith('variance-'))).toBeUndefined()
  })

  it('aktif versiyon + critical kategori → düşük variance bile task üretir', () => {
    const tasks = deriveTasks({
      versions: [v({ id: 5, status: 'Active', isActive: true })],
      entriesPerVersion: noEntries,
      customerIds,
      roles: ['Admin'],
      varianceByVersion: {
        5: { totalVariancePercent: 8, criticalCategoryCount: 2 },
      },
    })
    const variance = tasks.find((t) => t.id === 'variance-5')
    expect(variance).toBeDefined()
    expect(variance?.subtitle).toContain('2')
  })

  it('negative variance (actual<budget) absolute hesaplanır', () => {
    const tasks = deriveTasks({
      versions: [v({ id: 5, status: 'Active', isActive: true })],
      entriesPerVersion: noEntries,
      customerIds,
      roles: ['Admin'],
      varianceByVersion: {
        5: { totalVariancePercent: -22, criticalCategoryCount: 0 },
      },
    })
    const variance = tasks.find((t) => t.id === 'variance-5')
    expect(variance).toBeDefined()
    expect(variance?.title).toContain('22')
  })
})

describe('deriveTasks — onay özet', () => {
  it('1 onay bekleyen Finance → bireysel task (özet yok)', () => {
    const tasks = deriveTasks({
      versions: [v({ id: 1, status: 'PendingFinance' })],
      entriesPerVersion: noEntries,
      customerIds,
      roles: ['FinanceManager'],
    })
    expect(
      tasks.find((t) => t.id === 'pending-approvals-summary'),
    ).toBeUndefined()
    expect(tasks.find((t) => t.id === 'approve-finance-1')).toBeDefined()
  })

  it('3 onay bekleyen Finance → özet task + bireysel suppress', () => {
    const tasks = deriveTasks({
      versions: [
        v({ id: 1, status: 'PendingFinance' }),
        v({ id: 2, status: 'PendingFinance' }),
        v({ id: 3, status: 'PendingFinance' }),
      ],
      entriesPerVersion: noEntries,
      customerIds,
      roles: ['FinanceManager'],
    })
    const summary = tasks.find((t) => t.id === 'pending-approvals-summary')
    expect(summary).toBeDefined()
    expect(summary?.title).toContain('3')
    expect(
      tasks.filter((t) => t.id.startsWith('approve-finance-')),
    ).toHaveLength(0)
  })

  it('2 farklı onay (Finance + CFO) Admin için → özet', () => {
    const tasks = deriveTasks({
      versions: [
        v({ id: 1, status: 'PendingFinance' }),
        v({ id: 2, status: 'PendingCfo' }),
      ],
      entriesPerVersion: noEntries,
      customerIds,
      roles: ['Admin'],
    })
    expect(
      tasks.find((t) => t.id === 'pending-approvals-summary'),
    ).toBeDefined()
  })

  it('rolsüz kullanıcı için onay özet üretilmez', () => {
    const tasks = deriveTasks({
      versions: [
        v({ id: 1, status: 'PendingFinance' }),
        v({ id: 2, status: 'PendingFinance' }),
      ],
      entriesPerVersion: noEntries,
      customerIds,
      roles: ['Viewer'],
    })
    expect(
      tasks.find((t) => t.id === 'pending-approvals-summary'),
    ).toBeUndefined()
  })
})

describe('deriveTasks — birleşik öncelik', () => {
  it('sapma + onay özet aynı anda → ikisi de listede, priority order', () => {
    const tasks = deriveTasks({
      versions: [
        v({ id: 1, status: 'Active', isActive: true }),
        v({ id: 2, status: 'PendingFinance' }),
        v({ id: 3, status: 'PendingFinance' }),
      ],
      entriesPerVersion: noEntries,
      customerIds,
      roles: ['Admin'],
      varianceByVersion: {
        1: { totalVariancePercent: 30, criticalCategoryCount: 1 },
      },
    })
    expect(tasks.find((t) => t.id === 'variance-1')).toBeDefined()
    expect(
      tasks.find((t) => t.id === 'pending-approvals-summary'),
    ).toBeDefined()
    // Her ikisi de high priority — listede ardışık olmalı
    expect(tasks[0].priority).toBe('high')
    expect(tasks[1].priority).toBe('high')
  })
})
