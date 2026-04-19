import { describe, expect, it } from 'vitest'
import { translateApiError } from './api-error'

describe('translateApiError', () => {
  it('translates 409 to revision guidance with statusLabel', () => {
    const err = { response: { status: 409, data: { detail: 'cannot be edited' } } }
    const msg = translateApiError(err, { statusLabel: 'Yürürlükte' })
    expect(msg).toContain('Yürürlükte')
    expect(msg.toLowerCase()).toContain('düzenle')
  })

  it('translates 403 with required role', () => {
    const err = { response: { status: 403 } }
    const msg = translateApiError(err, { requiredRole: 'CFO' })
    expect(msg).toContain('CFO')
    expect(msg).toContain('rolü')
  })

  it('translates 403 generically without role context', () => {
    const err = { response: { status: 403 } }
    const msg = translateApiError(err)
    expect(msg).toContain('yetki')
  })

  it('translates 401 to session expired', () => {
    const err = { response: { status: 401 } }
    const msg = translateApiError(err)
    expect(msg.toLowerCase()).toContain('oturum')
  })

  it('translates 400 InvalidOperation status pattern (two states)', () => {
    const err = {
      response: {
        status: 400,
        data: { error: 'Submit requires status Draft or Rejected, current is Active' },
      },
    }
    const msg = translateApiError(err)
    expect(msg).toContain('Active')
    expect(msg).toContain('Draft')
    expect(msg).toContain('Rejected')
  })

  it('translates 400 InvalidOperation status pattern (single state)', () => {
    const err = {
      response: {
        status: 400,
        data: { error: 'Archive requires status Active, current is Draft' },
      },
    }
    const msg = translateApiError(err)
    expect(msg).toContain('Draft')
    expect(msg).toContain('Active')
  })

  it('translates 5xx to server error message', () => {
    const err = { response: { status: 503 } }
    const msg = translateApiError(err)
    expect(msg.toLowerCase()).toContain('sunucu')
  })

  it('falls back to generic message for unknown error', () => {
    const err = new Error('Network error')
    const msg = translateApiError(err)
    expect(msg).toBe('Network error')
  })

  it('handles null/undefined input', () => {
    expect(translateApiError(null)).toBe('İşlem başarısız.')
    expect(translateApiError(undefined)).toBe('İşlem başarısız.')
  })
})
