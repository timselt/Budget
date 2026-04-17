import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import tr from './tr.json'
import en from './en.json'

/**
 * i18next bootstrap — ADR-0009 §2.3.
 *
 * TR is the default because the user base is Turkish-speaking; EN is
 * mirrored so an English fallback is available and so ADR-0008 §2.4
 * has an immediate off-ramp if accounting rejects the TR-only headers.
 *
 * Key-count parity between tr.json and en.json is enforced in
 * src/shared/i18n/i18n.test.ts — a mismatch fails the build.
 */
// Guard against double-initialisation under Vite HMR or Vitest module reuse
// (F4 typescript-reviewer MEDIUM). `i18next` silently ignores a second
// `.init(...)` but emits an "already initialized" warning to the console;
// checking the flag keeps the developer console clean and the configuration
// deterministic across test runs.
if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      tr: { translation: tr },
      en: { translation: en },
    },
    lng: 'tr',
    fallbackLng: 'tr',
    interpolation: { escapeValue: false },
  })
}

export default i18n
