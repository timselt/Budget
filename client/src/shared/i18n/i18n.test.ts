import { describe, it, expect } from 'vitest'
import tr from './tr.json'
import en from './en.json'

/**
 * ADR-0009 §2.3 guarantee: tr.json and en.json mirror each other key-for-key.
 * A silent key drift between the two locales would mean an EN user hits an
 * undefined translation in production — the build should reject that instead
 * of letting it ship.
 */
describe('i18n key parity', () => {
  function collectKeys(obj: unknown, prefix = ''): string[] {
    if (obj === null || typeof obj !== 'object') return []
    const keys: string[] = []
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const path = prefix ? `${prefix}.${k}` : k
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        keys.push(...collectKeys(v, path))
      } else {
        keys.push(path)
      }
    }
    return keys
  }

  it('tr.json and en.json contain the same leaf keys', () => {
    const trKeys = collectKeys(tr).sort()
    const enKeys = collectKeys(en).sort()
    expect(enKeys).toEqual(trKeys)
  })

  it('every translation value is a non-empty string', () => {
    for (const locale of [tr, en]) {
      for (const key of collectKeys(locale)) {
        const value = key
          .split('.')
          .reduce<unknown>((acc, part) => (acc as Record<string, unknown>)[part], locale)
        expect(typeof value).toBe('string')
        expect(value).not.toBe('')
      }
    }
  })
})
