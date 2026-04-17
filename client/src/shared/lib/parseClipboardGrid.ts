import { parseTrNumber } from './parseTrNumber'

/**
 * Parsed representation of a clipboard paste into a grid (ADR-0009 §2.4).
 *
 * `values` is a 2-D array of numbers or nulls — null when the source cell
 * cannot be interpreted as a TR-formatted decimal. `isNonContiguous` is true
 * when the source clipboard contained a non-contiguous selection (one or more
 * empty rows splitting the payload). In that case the rows are collapsed to a
 * single contiguous block and the caller surfaces `warning` as a toast.
 */
export interface ClipboardGrid {
  readonly values: readonly (number | null)[][]
  readonly isNonContiguous: boolean
  readonly warning: string | null
}

export const NON_CONTIGUOUS_WARNING =
  'Non-contiguous aralık contiguous olarak yapıştırıldı.'

/**
 * Excel's native clipboard format: tab-separated columns, CRLF-separated rows.
 *
 * Non-contiguous handling (ADR-0009 §2.4 / ince ayar #1): AG-Grid Community
 * supports a single contiguous paste target, but an upstream Excel user can
 * copy multiple Ctrl-click selections and trigger a clipboard payload with
 * blank rows between blocks. We collapse those blocks into a single contiguous
 * grid starting at the paste target and set `isNonContiguous = true` so the
 * caller can raise the documented toast — no silent behaviour.
 */
export function parseClipboardGrid(raw: string): ClipboardGrid {
  if (!raw) {
    return { values: [], isNonContiguous: false, warning: null }
  }

  // Strip a single trailing newline (Excel always terminates its clipboard
  // payload with one) so we don't count it as an empty block separator.
  const normalisedLineEnds = raw.replace(/\r\n/g, '\n')
  const withoutTrailingNewline = normalisedLineEnds.endsWith('\n')
    ? normalisedLineEnds.slice(0, -1)
    : normalisedLineEnds

  const rawRows = withoutTrailingNewline.split('\n')

  // An "empty row" (no characters at all, not even a tab) between two
  // non-empty rows is the Excel convention for a non-contiguous block boundary.
  const nonEmptyRows = rawRows.filter((row) => row.length > 0)
  const isNonContiguous =
    nonEmptyRows.length > 0 && nonEmptyRows.length < rawRows.length

  const values: (number | null)[][] = nonEmptyRows.map((row) =>
    row.split('\t').map((cell) => parseTrNumber(cell)),
  )

  return {
    values,
    isNonContiguous,
    warning: isNonContiguous ? NON_CONTIGUOUS_WARNING : null,
  }
}
