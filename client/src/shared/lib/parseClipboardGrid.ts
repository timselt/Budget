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

/**
 * User-facing toast strings. These literals are also mirrored under
 * `clipboard.*` in `shared/i18n/tr.json`; the i18n parity test guards against
 * drift between the two sources so nobody edits one without the other.
 */
export const NON_CONTIGUOUS_WARNING =
  'Non-contiguous aralık contiguous olarak yapıştırıldı.'
export const PAYLOAD_TOO_LARGE_WARNING =
  'Yapıştırılan aralık maksimum boyutu aştı; kesilerek yapıştırıldı.'

// DoS guard (F4 Part 1 security-reviewer MEDIUM). A hostile clipboard payload
// (e.g. 100 000 × 100 000 tab-separated cells) would otherwise pin the tab in
// split/map loops that run parseTrNumber per cell. Limits are sized for a
// realistic budget-entry sheet: ~1 000 customers × 14 columns (customer +
// segment + 12 months + total) leaves plenty of headroom at 5 000 × 50.
export const MAX_PASTE_ROWS = 5_000
export const MAX_PASTE_COLS = 50

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

  // Size guard: cap both dimensions *before* expanding cells so a malicious
  // giant payload cannot burn CPU on per-cell regex before we stop it.
  const wasTruncated =
    nonEmptyRows.length > MAX_PASTE_ROWS ||
    nonEmptyRows.some((row) => row.split('\t').length > MAX_PASTE_COLS)
  const cappedRows = nonEmptyRows.slice(0, MAX_PASTE_ROWS)

  const values: (number | null)[][] = cappedRows.map((row) =>
    row
      .split('\t')
      .slice(0, MAX_PASTE_COLS)
      .map((cell) => parseTrNumber(cell)),
  )

  const warning = wasTruncated
    ? PAYLOAD_TOO_LARGE_WARNING
    : isNonContiguous
      ? NON_CONTIGUOUS_WARNING
      : null

  return {
    values,
    isNonContiguous,
    warning,
  }
}
