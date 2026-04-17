import { useCallback, useState } from 'react'
import {
  parseClipboardGrid,
  type ClipboardGrid,
} from '../lib/parseClipboardGrid'

/**
 * React hook that exposes the ADR-0009 §2.4 paste semantics to a grid
 * component (AG-Grid Community or a bespoke table). The hook keeps the last
 * paste outcome in state so the UI can react to `warning` (e.g. render a
 * toast) without the caller having to wire up its own storage.
 *
 * Usage in a grid cell's paste handler:
 *
 *   const { lastPaste, handlePaste } = useClipboardRange()
 *   onPaste={(e) => {
 *     const grid = handlePaste(e.clipboardData.getData('text/plain'))
 *     applyToSelection(grid.values)
 *     if (grid.warning) toast(grid.warning)
 *   }}
 */
export function useClipboardRange() {
  const [lastPaste, setLastPaste] = useState<ClipboardGrid | null>(null)

  const handlePaste = useCallback((raw: string): ClipboardGrid => {
    const grid = parseClipboardGrid(raw)
    setLastPaste(grid)
    return grid
  }, [])

  return { lastPaste, handlePaste }
}
