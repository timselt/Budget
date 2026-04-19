/**
 * Vitest global setup — ADR-0009. Registers jest-dom matchers so tests can use
 * `.toBeInTheDocument()` / `.toHaveTextContent(...)` without repeating the
 * import in every spec file.
 */
import '@testing-library/jest-dom/vitest'

/**
 * jsdom 25 + Vitest 2 ortamında `localStorage`/`sessionStorage` global'leri
 * Storage interface metodlarını expose etmiyor (getItem/setItem/removeItem/
 * clear çağrıldığında "is not a function" hatası). Storage'a ihtiyaç duyan
 * birim testler için (örn. SidebarSection accordion persistence) hafif bir
 * Map tabanlı polyfill yerleştiriyoruz — gerçek tarayıcı semantiğine eşdeğer.
 */
function createMemoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key: string) {
      return store.has(key) ? (store.get(key) as string) : null
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null
    },
    removeItem(key: string) {
      store.delete(key)
    },
    setItem(key: string, value: string) {
      store.set(key, String(value))
    },
  }
}

if (typeof localStorage === 'undefined' || typeof localStorage.setItem !== 'function') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: createMemoryStorage(),
    configurable: true,
  })
}

if (typeof sessionStorage === 'undefined' || typeof sessionStorage.setItem !== 'function') {
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: createMemoryStorage(),
    configurable: true,
  })
}
