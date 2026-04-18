import { describe, expect, it } from 'vitest'
import { normalizeRetriedApiUrl } from './api'

describe('normalizeRetriedApiUrl', () => {
  it('strips a single base prefix from a retried relative url', () => {
    expect(normalizeRetriedApiUrl('/api/v1/customers', '/api/v1')).toBe('/customers')
  })

  it('collapses a duplicated base prefix in a retried relative url', () => {
    expect(normalizeRetriedApiUrl('/api/v1/api/v1/customers', '/api/v1')).toBe('/api/v1/customers')
  })

  it('collapses a duplicated base prefix in an absolute url', () => {
    expect(
      normalizeRetriedApiUrl('https://budget.local/api/v1/api/v1/customers', '/api/v1'),
    ).toBe('https://budget.local/api/v1/customers')
  })

  it('leaves unrelated urls unchanged', () => {
    expect(normalizeRetriedApiUrl('/connect/token', '/api/v1')).toBe('/connect/token')
  })
})
