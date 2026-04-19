import { describe, expect, it } from 'vitest'
import {
  getStatusChipClass,
  getStatusLabel,
  getStatusNextAction,
} from './types'

describe('getStatusLabel', () => {
  it('returns Türkçe label for known status', () => {
    expect(getStatusLabel('Draft')).toBe('Taslak')
    expect(getStatusLabel('PendingFinance')).toBe('Finans Kontrolünde')
    expect(getStatusLabel('PendingCfo')).toBe('CFO Onayında')
    expect(getStatusLabel('Active')).toBe('Yürürlükte')
    expect(getStatusLabel('Rejected')).toBe('Reddedildi')
    expect(getStatusLabel('Archived')).toBe('Arşiv')
  })

  it('returns dash for null/undefined', () => {
    expect(getStatusLabel(null)).toBe('—')
    expect(getStatusLabel(undefined)).toBe('—')
  })

  it('falls back to raw status for unknown', () => {
    expect(getStatusLabel('Mystery')).toBe('Mystery')
  })
})

describe('getStatusNextAction', () => {
  it('returns eylem-odaklı sıradaki adım', () => {
    expect(getStatusNextAction('Draft')).toBe('Bütçeyi tamamla')
    expect(getStatusNextAction('PendingFinance')).toBe('Finans onayı bekleniyor')
    expect(getStatusNextAction('PendingCfo')).toBe('CFO onayı bekleniyor')
    expect(getStatusNextAction('Active')).toBe('Revizyon aç')
    expect(getStatusNextAction('Rejected')).toBe('Düzeltmeye Devam Et')
    expect(getStatusNextAction('Archived')).toBe('—')
  })

  it('returns dash for null/undefined/unknown', () => {
    expect(getStatusNextAction(null)).toBe('—')
    expect(getStatusNextAction(undefined)).toBe('—')
    expect(getStatusNextAction('Mystery')).toBe('—')
  })
})

describe('getStatusChipClass', () => {
  it('maps known status to chip class', () => {
    expect(getStatusChipClass('Draft')).toBe('chip-neutral')
    expect(getStatusChipClass('Rejected')).toBe('chip-error')
    expect(getStatusChipClass('Active')).toBe('chip-success')
  })

  it('falls back to chip-neutral for unknown', () => {
    expect(getStatusChipClass('Mystery')).toBe('chip-neutral')
    expect(getStatusChipClass(null)).toBe('chip-neutral')
  })
})
