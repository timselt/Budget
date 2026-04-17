/**
 * Vitest global setup — ADR-0009. Registers jest-dom matchers so tests can use
 * `.toBeInTheDocument()` / `.toHaveTextContent(...)` without repeating the
 * import in every spec file.
 */
import '@testing-library/jest-dom/vitest'
