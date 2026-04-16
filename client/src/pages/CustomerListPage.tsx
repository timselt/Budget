import { useMemo } from 'react'
import { useCustomers, useSegments } from '../hooks/useCustomers'
import { CustomerTable } from '../components/customers/CustomerTable'
import { SegmentRadar } from '../components/customers/SegmentRadar'
import { ConcentrationChart } from '../components/customers/ConcentrationChart'
import { ChartCard } from '../components/dashboard/ChartCard'
import type { SegmentPerformance } from '../hooks/useCustomers'

function deriveSegmentPerformance(
  customers: { segment: string; revenue: number; claims: number; lossRatio: number; profit: number }[],
): SegmentPerformance[] {
  const segmentMap = new Map<string, { revenue: number; claims: number; lrSum: number; profitSum: number; count: number }>()

  for (const c of customers) {
    const existing = segmentMap.get(c.segment)
    if (existing) {
      segmentMap.set(c.segment, {
        revenue: existing.revenue + c.revenue,
        claims: existing.claims + c.claims,
        lrSum: existing.lrSum + c.lossRatio,
        profitSum: existing.profitSum + c.profit,
        count: existing.count + 1,
      })
    } else {
      segmentMap.set(c.segment, {
        revenue: c.revenue,
        claims: c.claims,
        lrSum: c.lossRatio,
        profitSum: c.profit,
        count: 1,
      })
    }
  }

  const result: SegmentPerformance[] = []
  let id = 1
  for (const [name, data] of segmentMap) {
    const avgLr = data.count > 0 ? data.lrSum / data.count : 0
    const expenseRatio = data.revenue > 0 ? 1 - (data.profitSum / data.revenue) - avgLr : 0
    const profitMargin = data.revenue > 0 ? data.profitSum / data.revenue : 0
    result.push({
      segmentId: id++,
      segmentName: name,
      revenue: data.revenue,
      claims: data.claims,
      lossRatio: avgLr,
      expenseRatio: Math.max(0, expenseRatio),
      profitMargin,
    })
  }

  return result
}

export function CustomerListPage() {
  const { data: customers, isLoading, error } = useCustomers()
  const { data: segments } = useSegments()

  const segmentNames = useMemo(() => {
    if (!segments) return []
    return segments.map((s) => s.name)
  }, [segments])

  const segmentPerformance = useMemo(() => {
    if (!customers) return []
    return deriveSegmentPerformance(customers)
  }, [customers])

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Müşteri Analizi
        </h1>
        <p className="text-sm text-text-muted">
          Kârlılık sıralaması, segment karşılaştırma ve yoğunlaşma analizi
        </p>
      </header>

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <p className="text-text-muted">Yükleniyor...</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm text-danger">Müşteri verileri yüklenemedi.</p>
        </div>
      )}

      {customers && (
        <>
          {/* Profitability Table */}
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-medium">Kârlılık Sıralaması</h2>
            <CustomerTable customers={customers} segments={segmentNames} />
          </section>

          {/* Bottom analysis panels */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard title="Segment Karşılaştırma">
              <SegmentRadar segments={segmentPerformance} />
            </ChartCard>

            <ChartCard title="Müşteri Yoğunlaşma">
              <ConcentrationChart customers={customers} />
            </ChartCard>
          </section>
        </>
      )}
    </div>
  )
}
