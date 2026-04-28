import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// Inline modal markup yasağı — shared/ui/Modal kullanılmalı.
// Plan: docs/plans/2026-04-27-modal-consolidation-plan.md (PR #5).
const NO_INLINE_MODAL_RULE = {
  selector:
    "JSXAttribute[name.name='className'][value.type='Literal'][value.value=/fixed inset-0.*z-50/]",
  message:
    'Inline modal markup yasak. shared/ui/Modal primitive\'ini kullan ' +
    '(focus trap + role=dialog + scroll lock + Escape otomatik). ' +
    'Plan: docs/plans/2026-04-27-modal-consolidation-plan.md',
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'no-restricted-syntax': ['error', NO_INLINE_MODAL_RULE],
    },
  },
  {
    // Modal primitive'in kendisi inline backdrop markup'ını içermek zorunda.
    files: ['src/shared/ui/Modal.tsx'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
])
