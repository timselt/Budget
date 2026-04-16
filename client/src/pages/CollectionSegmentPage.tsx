import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useCollectionSegment } from '../hooks/useCollectionSegment'
import { KpiCard } from '../components/ui/KpiCard'
import { ChartCard } from '../components/dashboard/ChartCard'
import type {
  CustomerCollectionRow,
  CollectionRiskLevel,
  TopOverdueCustomer,
} from '../types/collections'

type SortField = keyof Pick<
  CustomerCollectionRow,
  'rank' | 'customerName' | 'totalReceivable' | 'overdue' | 'pending' | 'overdueRatio' | 'sharePercent' | 'riskLevel' | 'avgDelayDays'
>

type SortDirection = 'asc' | 'desc'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

const RISK_ORDER: Record<CollectionRiskLevel, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
}

function RiskChip({ level }: { level: CollectionRiskLevel }) {
  const styles: Record<CollectionRiskLevel, string> = {
    High: 'bg-sl-error-container text-sl-error',
    Medium: 'bg-amber-100 text-amber-800',
    Low: 'bg-emerald-50 text-emerald-700',
  }

  const labels: Record<CollectionRiskLevel, string> = {
    High: 'Yuksek',
    Medium: 'Orta',
    Low: 'Dusuk',
  }

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[level]}`}
    >
      {labels[level]}
    </span>
  )
}

function SortableHeader({
  label,
  field,
  currentField,
  currentDirection,
  onSort,
  align = 'left',
}: {
  label: string
  field: SortField
  currentField: SortField
  currentDirection: SortDirection
  onSort: (field: SortField) => void
  align?: 'left' | 'right'
}) {
  const isActive = currentField === field
  const arrow = isActive ? (currentDirection === 'asc' ? ' \u2191' : ' \u2193') : ''

  return (
    <th
      onClick={() => onSort(field)}
      className={`cursor-pointer select-none py-3 pr-4 font-body text-xs font-medium uppercase tracking-wider text-sl-on-surface-variant transition-colors hover:text-sl-on-surface ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {label}{arrow}
    </th>
  )
}

function CustomerTable({ customers }: { customers: CustomerCollectionRow[] }) {
  const [sortField, setSortField] = useState<SortField>('rank')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sorted = useMemo(() => {
    if (!Array.isArray(customers)) return []
    return [...customers].sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1

      if (sortField === 'customerName') {
        return multiplier * a.customerName.localeCompare(b.customerName, 'tr')
      }
      if (sortField === 'riskLevel') {
        return multiplier * (RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel])
      }
      return multiplier * ((a[sortField] as number) - (b[sortField] as number))
    })
  }, [customers, sortField, sortDirection])

  if (sorted.length === 0) {
    return (
      <p className="py-8 text-center font-body text-sm text-sl-on-surface-variant">
        Musteri verisi bulunamadi.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-sl-outline-variant/15">
            <SortableHeader label="Sira" field="rank" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} />
            <SortableHeader label="Musteri" field="customerName" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} />
            <SortableHeader label="Toplam" field="totalReceivable" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} align="right" />
            <SortableHeader label="Vadesi Gecen" field="overdue" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} align="right" />
            <SortableHeader label="Bekleyen" field="pending" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} align="right" />
            <SortableHeader label="Gecikme %" field="overdueRatio" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} align="right" />
            <SortableHeader label="Pay %" field="sharePercent" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} align="right" />
            <SortableHeader label="Risk" field="riskLevel" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} />
            <SortableHeader label="Gecikme (Gun)" field="avgDelayDays" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} align="right" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={row.customerId}
              className="border-b border-sl-outline-variant/8 transition-colors hover:bg-sl-surface-high/50"
            >
              <td className="py-3 pr-4 font-body text-sm tabular-nums text-sl-on-surface-variant">
                {row.rank}
              </td>
              <td className="py-3 pr-4 font-body text-sm font-medium text-sl-on-surface">
                {row.customerName}
              </td>
              <td className="py-3 pr-4 text-right font-body text-sm tabular-nums text-sl-on-surface">
                {formatCurrency(row.totalReceivable)}
              </td>
              <td className="py-3 pr-4 text-right font-body text-sm tabular-nums text-sl-error">
                {formatCurrency(row.overdue)}
              </td>
              <td className="py-3 pr-4 text-right font-body text-sm tabular-nums text-sl-on-surface">
                {formatCurrency(row.pending)}
              </td>
              <td className="py-3 pr-4 text-right font-body text-sm tabular-nums text-sl-on-surface">
                {formatPercent(row.overdueRatio)}
              </td>
              <td className="py-3 pr-4 text-right font-body text-sm tabular-nums text-sl-on-surface">
                {formatPercent(row.sharePercent)}
              </td>
              <td className="py-3 pr-4">
                <RiskChip level={row.riskLevel} />
              </td>
              <td className="py-3 text-right font-body text-sm tabular-nums text-sl-on-surface">
                {row.avgDelayDays}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TopPanel({
  title,
  customers,
}: {
  title: string
  customers: TopOverdueCustomer[]
}) {
  if (!Array.isArray(customers) || customers.length === 0) {
    return (
      <ChartCard title={title}>
        <p className="py-6 text-center font-body text-sm text-sl-on-surface-variant">
          Veri bulunamadi.
        </p>
      </ChartCard>
    )
  }

  return (
    <ChartCard title={title}>
      <div className="space-y-2.5">
        {customers.map((c, i) => (
          <div key={c.customerId} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sl-surface-high font-body text-[10px] font-semibold text-sl-on-surface-variant">
                {i + 1}
              </span>
              <span className="truncate font-body text-sm text-sl-on-surface">
                {c.customerName}
              </span>
            </div>
            <span className="shrink-0 font-body text-xs tabular-nums text-sl-on-surface-variant">
              {formatCurrency(c.amount)}
            </span>
          </div>
        ))}
      </div>
    </ChartCard>
  )
}

export function CollectionSegmentPage() {
  const { id } = useParams<{ id: string }>()
  const segmentId = id ? Number(id) : null
  const { data, isLoading, error } = useCollectionSegment(segmentId)

  return (
    <div>
      <header className="mb-10">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-sl-on-surface">
          {data?.summary.segmentName ?? 'Segment Detay'}
        </h1>
        <p className="font-body text-sm text-sl-on-surface-variant">
          Segment bazli tahsilat analizi
        </p>
      </header>

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <p className="font-body text-sl-on-surface-variant">Yukleniyor...</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-sl-error-container/30 p-4">
          <p className="font-body text-sm text-sl-error">
            Segment verileri yuklenemedi.
          </p>
        </div>
      )}

      {data && (
        <>
          <section className="mb-12">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                title="Toplam Alacak"
                value={formatCurrency(data.summary.totalReceivable)}
              />
              <KpiCard
                title="Vadesi Gecen"
                value={formatCurrency(data.summary.overdue)}
                trend="down"
              />
              <KpiCard
                title="Vadesi Bekleyen"
                value={formatCurrency(data.summary.pending)}
              />
              <KpiCard
                title="Gecikme Orani"
                value={formatPercent(data.summary.overdueRatio)}
                trend={data.summary.overdueRatio > 0.3 ? 'down' : 'up'}
              />
            </div>
          </section>

          <section className="mb-12">
            <h2 className="mb-4 font-display text-lg font-medium text-sl-on-surface">
              Yonetim Raporu
            </h2>
            <div className="rounded-lg border border-sl-outline-variant/15 bg-sl-surface-lowest p-5">
              <CustomerTable customers={data.customers} />
            </div>
          </section>

          <section className="mb-12">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <TopPanel title="Top 10 Vadesi Gecen" customers={data.topOverdue} />
              <TopPanel title="Top 10 Vadesi Bekleyen" customers={data.topPending} />
            </div>
          </section>

          <section className="mb-12">
            <h2 className="mb-4 font-display text-lg font-medium text-sl-on-surface">
              Yogunlasma Metrikleri
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                title="Top 5 Pay"
                value={formatPercent(data.concentration.top5Share)}
                trend={data.concentration.top5Share > 0.5 ? 'down' : 'up'}
              />
              <KpiCard
                title="Top 10 Pay"
                value={formatPercent(data.concentration.top10Share)}
                trend={data.concentration.top10Share > 0.7 ? 'down' : 'up'}
              />
            </div>
          </section>
        </>
      )}
    </div>
  )
}
