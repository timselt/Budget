import { useMemo, useState } from 'react'
import type { BudgetTree, TreeSelection } from './types'
import { formatCompact } from './utils'

const SEGMENT_COLOR: Record<string, string> = {
  SIGORTA: 'segment-dot-sigorta',
  OTOMOTIV: 'segment-dot-otomotiv',
  FILO: 'segment-dot-filo',
  ALTERNATIF: 'segment-dot-alternatif',
  SGK_TESVIK: 'segment-dot-sgk',
}

interface Props {
  tree: BudgetTree | null
  selection: TreeSelection | null
  onSelect: (sel: TreeSelection) => void
  loading: boolean
}

export function BudgetTreePanel({
  tree,
  selection,
  onSelect,
  loading,
}: Props) {
  const [query, setQuery] = useState('')
  const [expandedState, setExpandedState] = useState<{
    treeKey: string
    ids: Set<number>
  }>({ treeKey: '', ids: new Set() })
  const treeKey = useMemo(
    () => (tree ? tree.segments.map((segment) => segment.segmentId).join(',') : ''),
    [tree],
  )
  const expandedSegments =
    tree && expandedState.treeKey !== treeKey
      ? expandedState.treeKey === ''
        ? new Set(tree.segments.map((segment) => segment.segmentId))
        : new Set(
            [...expandedState.ids].filter((segmentId) =>
              tree.segments.some((segment) => segment.segmentId === segmentId),
            ),
          )
      : expandedState.ids

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
              (selection?.kind === 'segment' && selection.segmentId === segment.segmentId) ||
              (selection?.kind === 'customer' && selection.segmentId === segment.segmentId)
            const isExpanded = query.trim()
              ? true
              : expandedSegments.has(segment.segmentId)
            return (
              <div key={segment.segmentId} className="ml-2">
                <div
                  className={`tree-item w-full px-4 py-2.5 flex items-center gap-2 hover:bg-surface-container-low ${
                    isSelected ? 'bg-primary-container text-on-primary-container font-semibold' : ''
                  }`}
                >
                  <button
                    type="button"
                    className="shrink-0 inline-flex items-center justify-center rounded p-0.5 hover:bg-black/5"
                    aria-label={isExpanded ? 'Kategoriyi daralt' : 'Kategoriyi genişlet'}
                    onClick={() => {
                      if (!query.trim()) {
                        const next = new Set(expandedSegments)
                        if (next.has(segment.segmentId)) {
                          next.delete(segment.segmentId)
                        } else {
                          next.add(segment.segmentId)
                        }
                        setExpandedState({
                          treeKey,
                          ids: next,
                        })
                      }
                    }}
                  >
                    <span
                      className="material-symbols-outlined text-on-surface-variant"
                      style={{ fontSize: 18 }}
                    >
                      {isExpanded ? 'expand_more' : 'chevron_right'}
                    </span>
                  </button>
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      SEGMENT_COLOR[segment.segmentCode] ?? 'bg-on-surface-variant'
                    }`}
                  />
                  <button
                    type="button"
                    className="flex-1 text-left font-semibold"
                    onClick={() => onSelect({ kind: 'segment', segmentId: segment.segmentId })}
                  >
                    {segment.segmentName}
                  </button>
                  <span className="text-xs num text-on-surface-variant">
                    {segment.customers.length} müşteri
                  </span>
                  <span className="text-xs num text-on-surface-variant">
                    {formatCompact(segment.revenueTotalTry)}
                  </span>
                </div>

                <div className={isExpanded ? 'pb-2' : 'hidden'}>
                  {segment.customers.map((customer) => {
                    const isCustomerSelected =
                      selection?.kind === 'customer' &&
                      selection.customerId === customer.customerId

                    return (
                      <button
                        key={customer.customerId}
                        type="button"
                        className={`tree-item w-full text-left pl-10 pr-4 py-2 flex items-center gap-2 hover:bg-surface-container-low ${
                          isCustomerSelected
                            ? 'bg-primary-container text-on-primary-container font-semibold'
                            : ''
                        }`}
                        onClick={() => {
                          onSelect({
                            kind: 'customer',
                            customerId: customer.customerId,
                            segmentId: segment.segmentId,
                          })
                        }}
                      >
                        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 16 }}>
                          person
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm font-medium">{customer.customerName}</span>
                          <span className="block text-[0.65rem] text-on-surface-variant font-mono">
                            {customer.customerCode}
                          </span>
                        </span>
                        <span className="text-xs num text-on-surface-variant">
                          {formatCompact(customer.revenueTotalTry)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </details>

        {/* Müşteri detayı Müşteri Odaklı Giriş (C) sekmesinde; OPEX ayrı sayfada. */}
      </div>
    </div>
  )
}
