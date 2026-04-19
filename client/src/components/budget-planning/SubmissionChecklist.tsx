import { useState } from 'react'
import type { ChecklistResult } from './useSubmissionChecklist'

const LEVEL_ICON: Record<string, string> = {
  pass: '✓',
  warn: '⚠',
  fail: '✗',
}
const LEVEL_COLOR: Record<string, string> = {
  pass: 'text-success',
  warn: 'text-warning',
  fail: 'text-error',
}

export function SubmissionChecklist({ result }: { result: ChecklistResult }) {
  // Açık varsayılan: warn veya fail varsa açık başla
  const [open, setOpen] = useState(
    result.warnCount > 0 || result.hardFailCount > 0,
  )
  // React docs — "Storing information from previous renders": count değişirse
  // useEffect'e ihtiyaç duymadan render sırasında setState çağrılabilir.
  const [prevCounts, setPrevCounts] = useState({
    warn: result.warnCount,
    fail: result.hardFailCount,
  })
  if (
    prevCounts.warn !== result.warnCount ||
    prevCounts.fail !== result.hardFailCount
  ) {
    setPrevCounts({ warn: result.warnCount, fail: result.hardFailCount })
    if (result.warnCount > 0 || result.hardFailCount > 0) {
      setOpen(true)
    }
  }

  if (result.items.length === 0) return null

  return (
    <div className="card mb-4">
      <button
        type="button"
        className="w-full flex items-center justify-between"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-on-surface-variant"
            style={{ fontSize: 20 }}
          >
            checklist
          </span>
          <h3 className="text-base font-bold text-on-surface">Onaya Hazırlık</h3>
          {result.hardFailCount > 0 && (
            <span className="chip chip-error text-xs">
              {result.hardFailCount} eksik
            </span>
          )}
          {result.warnCount > 0 && (
            <span className="chip chip-warning text-xs">
              {result.warnCount} uyarı
            </span>
          )}
          {result.canSubmit && result.warnCount === 0 && (
            <span className="chip chip-success text-xs">Hazır ✓</span>
          )}
        </div>
        <span className="material-symbols-outlined text-on-surface-variant">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      {open && (
        <ul className="mt-3 space-y-1.5" role="list">
          {result.items.map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-sm">
              <span className={`${LEVEL_COLOR[item.level]} font-bold w-4`}>
                {LEVEL_ICON[item.level]}
              </span>
              <span className="text-on-surface">{item.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
