import { describe, it, expect } from 'vitest'
import { deriveNextStep, type NavigatorContext } from './useNextStepNavigator'
import type { ChecklistResult } from './useSubmissionChecklist'

const emptyChecklist: ChecklistResult = {
  items: [],
  canSubmit: false,
  hardFailCount: 0,
  warnCount: 0,
}

const emptyCtx: NavigatorContext = {
  customers: [],
  entries: [],
  opexCategories: [],
}

describe('deriveNextStep', () => {
  it('hiç item yok → null', () => {
    expect(deriveNextStep(emptyChecklist, emptyCtx)).toBeNull()
  })

  it('fail (eksik müşteri) → jump-to-customer + ilk eksik müşteri id', () => {
    const checklist: ChecklistResult = {
      items: [
        { id: 'all-customers', level: 'fail', message: '1/3 müşteri tamamlandı' },
      ],
      canSubmit: false,
      hardFailCount: 1,
      warnCount: 0,
    }
    const ctx: NavigatorContext = {
      customers: [
        { id: 1, isActive: true },
        { id: 2, isActive: true },
        { id: 3, isActive: true },
      ],
      entries: [{ customerId: 1, month: 1, entryType: 'REVENUE' }],
      opexCategories: [],
    }
    const step = deriveNextStep(checklist, ctx)
    expect(step?.level).toBe('fail')
    expect(step?.action.kind).toBe('jump-to-customer')
    expect(step?.action.customerId).toBe(2)
  })

  it('empty-month warn → ilk müşterinin ilk boş ayı', () => {
    const checklist: ChecklistResult = {
      items: [{ id: 'empty-months', level: 'warn', message: '1 müşteride boş ay' }],
      canSubmit: true,
      hardFailCount: 0,
      warnCount: 1,
    }
    const ctx: NavigatorContext = {
      customers: [{ id: 5, isActive: true }],
      entries: [
        { customerId: 5, month: 1, entryType: 'REVENUE' },
        { customerId: 5, month: 2, entryType: 'REVENUE' },
      ],
      opexCategories: [],
    }
    const step = deriveNextStep(checklist, ctx)
    expect(step?.action.kind).toBe('jump-to-customer')
    expect(step?.action.customerId).toBe(5)
    expect(step?.action.scrollToMonth).toBe(3)
  })

  it('claim-missing warn → CLAIM eksik müşteri + scrollToType CLAIM', () => {
    const checklist: ChecklistResult = {
      items: [
        { id: 'claim-missing', level: 'warn', message: '1 müşteride hasar yok' },
      ],
      canSubmit: true,
      hardFailCount: 0,
      warnCount: 1,
    }
    const ctx: NavigatorContext = {
      customers: [{ id: 7, isActive: true }],
      entries: [{ customerId: 7, month: 1, entryType: 'REVENUE' }],
      opexCategories: [],
    }
    const step = deriveNextStep(checklist, ctx)
    expect(step?.action.kind).toBe('jump-to-customer')
    expect(step?.action.customerId).toBe(7)
    expect(step?.action.scrollToType).toBe('CLAIM')
  })

  it('opex warn → jump-to-opex + ilk kategori', () => {
    const checklist: ChecklistResult = {
      items: [{ id: 'opex', level: 'warn', message: 'OPEX yok' }],
      canSubmit: true,
      hardFailCount: 0,
      warnCount: 1,
    }
    const ctx: NavigatorContext = {
      customers: [],
      entries: [],
      opexCategories: [{ expenseCategoryId: 42 }],
    }
    const step = deriveNextStep(checklist, ctx)
    expect(step?.action.kind).toBe('jump-to-opex')
    expect(step?.action.expenseCategoryId).toBe(42)
  })

  it('hepsi pass + canSubmit → "Onaya hazır." pass message', () => {
    const checklist: ChecklistResult = {
      items: [{ id: 'all-customers', level: 'pass', message: '3/3 müşteri tamam' }],
      canSubmit: true,
      hardFailCount: 0,
      warnCount: 0,
    }
    const step = deriveNextStep(checklist, emptyCtx)
    expect(step?.level).toBe('pass')
    expect(step?.message).toBe('Onaya hazır.')
    expect(step?.action.kind).toBe('none')
  })

  it('priority: fail önce, warn sonra', () => {
    const checklist: ChecklistResult = {
      items: [
        { id: 'all-customers', level: 'fail', message: 'eksik' },
        { id: 'opex', level: 'warn', message: 'opex yok' },
      ],
      canSubmit: false,
      hardFailCount: 1,
      warnCount: 1,
    }
    const ctx: NavigatorContext = {
      customers: [{ id: 1, isActive: true }],
      entries: [],
      opexCategories: [{ expenseCategoryId: 99 }],
    }
    const step = deriveNextStep(checklist, ctx)
    expect(step?.level).toBe('fail')
    expect(step?.action.kind).toBe('jump-to-customer')
  })
})
