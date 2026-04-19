import { useMemo, useState } from 'react'
import type { BudgetTree, TreeSelection } from './types'
import { formatCompact } from './utils'

const SEGMENT_COLOR: Record<string, string> = {
  SIGORTA: 'bg-[#DA291C]',
  OTOMOTIV: 'bg-[#002366]',
  FILO: 'bg-[#006d3e]',
  ALTERNATIF: 'bg-[#8a5300]',
  SGK_TESVIK: 'bg-[#6f42c1]',
}

interface Props {
  tree: BudgetTree | null
  selection: TreeSelection | null
  onSelect: (sel: TreeSelection) => void
  loading: boolean
}

export function BudgetTreePanel({ tree, selection, onSelect, loading }: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!tree) return { segments: [], opex: [] }
    const q = query.trim().toLowerCase()
    if (!q) return { segments: tree.segments, opex: tree.opexCategories }
    return {
      segments: tree.segments
        .map((s) => ({
          ...s,
          customers: s.customers.filter(
            (c) =>
              c.customerName.toLowerCase().includes(q) ||
              c.customerCode.toLowerCase().includes(q) ||
              s.segmentName.toLowerCase().includes(q),
          ),
        }))
        .filter((s) => s.customers.length > 0),
      opex: tree.opexCategories.filter(
        (o) => o.categoryName.toLowerCase().includes(q) || o.categoryCode.toLowerCase().includes(q),
      ),
    }
  }, [tree, query])

  if (loading && !tree) {
    return (
      <div className="card p-6 text-sm text-on-surface-variant min-h-[600px]">
        <span className="material-symbols-outlined animate-spin align-middle mr-2">
          progress_activity
        </span>
        Ağaç yükleniyor…
      </div>
    )
  }

  if (!tree) {
    return (
      <div className="card p-6 text-sm text-on-surface-variant">
        Yıl ve versiyon seçildiğinde ağaç burada görünür.
      </div>
    )
  }

  return (
    <div className="card p-0 overflow-hidden min-h-[600px] flex flex-col">
      <div className="p-4 border-b border-surface-container-low sticky top-0 bg-white z-10">
        <input
          className="input w-full"
          placeholder="Ağaçta ara…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="overflow-auto flex-1">
        <details open className="group">
          <summary className="tree-summary font-bold px-4 py-3 cursor-pointer flex items-center gap-2 hover:bg-surface-container-low">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              business
            </span>
            <span className="flex-1">Müşteriler</span>
            <span className="text-xs num text-on-surface-variant">
              {formatCompact(tree.revenueTotalTry)}
            </span>
          </summary>

          {filtered.segments.map((segment) => {
            const isSelected =
              selection?.kind === 'segment' && selection.segmentId === segment.segmentId
            return (
              <button
                key={segment.segmentId}
                type="button"
                className={`tree-item w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-surface-container-low ml-2 ${
                  isSelected ? 'bg-primary-container text-on-primary-container font-semibold' : ''
                }`}
                onClick={() => onSelect({ kind: 'segment', segmentId: segment.segmentId })}
              >
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    SEGMENT_COLOR[segment.segmentCode] ?? 'bg-on-surface-variant'
                  }`}
                />
                <span className="flex-1 font-semibold">{segment.segmentName}</span>
                <span className="text-xs num text-on-surface-variant">
                  {segment.customers.length} müşteri
                </span>
                <span className="text-xs num text-on-surface-variant">
                  {formatCompact(segment.revenueTotalTry)}
                </span>
              </button>
            )
          })}
        </details>

        {/* Müşteri detayı Müşteri Odaklı Giriş (C) sekmesinde; OPEX ayrı sayfada. */}
      </div>
    </div>
  )
}
