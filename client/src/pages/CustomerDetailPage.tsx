import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useCustomerDetail } from '../hooks/useCustomerDetail'
import { useCollectionCustomerInvoices } from '../hooks/useCollectionCustomerInvoices'
import { KpiCard } from '../components/ui/KpiCard'
import { ChartCard } from '../components/dashboard/ChartCard'
import { CHART_COLORS, formatTryCurrency, formatFullCurrency, formatPercent } from '../components/dashboard/chart-utils'
import type { CustomerMonthly } from '../hooks/useCustomers'
import type { CustomerInvoiceDetail, InvoiceCollectionStatus } from '../types/collections'

type TabKey = 'genel' | 'tahsilat'

const TAB_ITEMS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: 'genel', label: 'Genel' },
  { key: 'tahsilat', label: 'Tahsilat' },
] as const

function formatCurrencyTrTry(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDateTr(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('tr-TR')
}

const STATUS_CHIP_CLASSES: Record<InvoiceCollectionStatus, string> = {
  Overdue: 'bg-sl-error-container text-sl-error',
  Pending: 'bg-amber-100 text-amber-800',
  Paid: 'bg-sl-on-tertiary-container/10 text-sl-tertiary',
}

const STATUS_LABELS: Record<InvoiceCollectionStatus, string> = {
  Overdue: 'Gecikmiş',
  Pending: 'Bekleyen',
  Paid: 'Tahsil Edildi',
}

interface TrendDataPoint extends CustomerMonthly {
  lossRatioPercent: number
}

interface TrendTooltipProps {
  active?: boolean
  payload?: Array<{ payload: TrendDataPoint }>
  label?: string
}

function TrendTooltip({ active, payload, label }: TrendTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }
  const row = payload[0].payload
  return (
    <div
      className="rounded-lg border border-sl-outline-variant/15 bg-sl-surface-lowest px-3 py-2 font-body text-sm shadow-[var(--sl-shadow-sm)]"
    >
      <p className="mb-1 font-medium text-sl-on-surface">{label}</p>
      <p style={{ color: CHART_COLORS.primary }}>
        Gelir: {formatFullCurrency(row.revenue)}
      </p>
      <p style={{ color: CHART_COLORS.danger }}>
        Hasar: {formatFullCurrency(row.claims)}
      </p>
      <p style={{ color: CHART_COLORS.warning }}>
        LR: {formatPercent(row.lossRatio)}
      </p>
    </div>
  )
}

function computeCollectionSummary(invoices: CustomerInvoiceDetail[]) {
  const totalReceivable = invoices.reduce((sum, inv) => sum + inv.amount, 0)
  const overdue = invoices
    .filter((inv) => inv.status === 'Overdue')
    .reduce((sum, inv) => sum + inv.amount, 0)
  const pending = invoices
    .filter((inv) => inv.status === 'Pending')
    .reduce((sum, inv) => sum + inv.amount, 0)
  const overdueRatio = totalReceivable > 0 ? overdue / totalReceivable : 0
  return { totalReceivable, overdue, pending, overdueRatio }
}

interface TahsilatTabProps {
  customerId: number | null
}

function TahsilatTab({ customerId }: TahsilatTabProps) {
  const { data: invoices, isLoading, error } = useCollectionCustomerInvoices(customerId)

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="font-body text-sl-on-surface-variant">Tahsilat verileri yükleniyor...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-sl-error-container/30 p-4">
        <p className="font-body text-sm text-sl-error">
          Tahsilat verileri yüklenemedi.
        </p>
      </div>
    )
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-sl-outline-variant/15 bg-sl-surface-lowest">
        <p className="font-body text-sm text-sl-on-surface-variant">
          Bu müşteriye ait fatura bulunamadı.
        </p>
      </div>
    )
  }

  const summary = computeCollectionSummary(invoices)
  const sorted = [...invoices].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  )

  return (
    <div>
      {/* Summary cards */}
      <section className="mb-10">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Toplam Alacak"
            value={formatCurrencyTrTry(summary.totalReceivable)}
          />
          <KpiCard
            title="Vadesi Geçen"
            value={formatCurrencyTrTry(summary.overdue)}
            trend="down"
          />
          <KpiCard
            title="Vadesi Bekleyen"
            value={formatCurrencyTrTry(summary.pending)}
            trend="neutral"
          />
          <KpiCard
            title="Gecikme Oranı"
            value={formatPercent(summary.overdueRatio)}
            trend={summary.overdueRatio > 0.3 ? 'down' : 'up'}
          />
        </div>
      </section>

      {/* Invoice table */}
      <section>
        <h2 className="mb-4 font-display text-lg font-semibold tracking-tight text-sl-on-surface">
          Fatura Detayları
        </h2>
        <div className="overflow-x-auto rounded-lg border border-sl-outline-variant/15 bg-sl-surface-lowest">
          <table className="w-full text-left font-body text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-sl-on-surface-variant">
                <th className="px-4 py-3 font-medium">Fatura No</th>
                <th className="px-4 py-3 font-medium">İşlem Tarihi</th>
                <th className="px-4 py-3 font-medium">Vade Tarihi</th>
                <th className="px-4 py-3 font-medium text-right">Gün Farkı</th>
                <th className="px-4 py-3 font-medium text-right">Tutar</th>
                <th className="px-4 py-3 font-medium text-center">Durum</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((inv) => (
                <tr
                  key={inv.invoiceNo}
                  className="border-t border-sl-outline-variant/8 transition-colors hover:bg-sl-surface-low/50"
                >
                  <td className="px-4 py-3 font-medium text-sl-on-surface">
                    {inv.invoiceNo}
                  </td>
                  <td className="px-4 py-3 text-sl-on-surface-variant">
                    {formatDateTr(inv.transactionDate)}
                  </td>
                  <td className="px-4 py-3 text-sl-on-surface-variant">
                    {formatDateTr(inv.dueDate)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums ${
                      inv.daysDiff < 0 ? 'text-sl-error' : 'text-sl-on-surface-variant'
                    }`}
                  >
                    {inv.daysDiff}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-sl-on-surface">
                    {formatCurrencyTrTry(inv.amount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CHIP_CLASSES[inv.status]}`}
                    >
                      {STATUS_LABELS[inv.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const customerId = id ? Number(id) : null
  const [activeTab, setActiveTab] = useState<TabKey>('genel')
  const { data: customer, isLoading, error } = useCustomerDetail(customerId)

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="font-body text-sl-on-surface-variant">Yükleniyor...</p>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div>
        <Link
          to="/customers"
          className="mb-4 inline-block font-body text-sm text-sl-primary underline-offset-2 hover:underline"
        >
          &larr; Müşteri Listesi
        </Link>
        <div className="rounded-lg bg-sl-error-container/30 p-4">
          <p className="font-body text-sm text-sl-error">
            Müşteri detayı yüklenemedi.
          </p>
        </div>
      </div>
    )
  }

  const avgLossRatio = customer.monthlyTrend.length > 0
    ? customer.monthlyTrend.reduce((sum, m) => sum + m.lossRatio, 0) / customer.monthlyTrend.length
    : customer.lossRatio

  const chartData: TrendDataPoint[] = customer.monthlyTrend.map((m) => ({
    ...m,
    lossRatioPercent: Math.round(m.lossRatio * 1000) / 10,
  }))

  return (
    <div>
      {/* Breadcrumb */}
      <Link
        to="/customers"
        className="mb-4 inline-block font-body text-sm text-sl-primary underline-offset-2 hover:underline"
      >
        &larr; Müşteri Listesi
      </Link>

      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-sl-on-surface">
          {customer.name}
        </h1>
        <p className="mt-1 font-body text-sm text-sl-on-surface-variant">
          <span className="inline-block rounded-full bg-sl-primary-fixed px-2.5 py-0.5 text-xs font-medium text-sl-primary-container">
            {customer.segment}
          </span>
        </p>
      </header>

      {/* Tab navigation */}
      <nav className="mb-10 flex gap-1" role="tablist" aria-label="Müşteri detay sekmeleri">
        {TAB_ITEMS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-5 py-2 font-body text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-sl-primary text-sl-on-primary'
                : 'text-sl-on-surface-variant hover:bg-sl-surface-low'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      {activeTab === 'genel' && (
        <div>
          {/* Summary cards */}
          <section className="mb-12">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                title="Toplam Gelir"
                value={formatFullCurrency(customer.revenue)}
              />
              <KpiCard
                title="Toplam Hasar"
                value={formatFullCurrency(customer.claims)}
                trend="down"
              />
              <KpiCard
                title="Ortalama LR"
                value={formatPercent(avgLossRatio)}
                trend={avgLossRatio > 0.7 ? 'down' : 'up'}
              />
              <KpiCard
                title="Kâr"
                value={formatFullCurrency(customer.profit)}
                trend={customer.profit >= 0 ? 'up' : 'down'}
              />
            </div>
          </section>

          {/* Monthly trend chart */}
          <section>
            <ChartCard title="Aylık Gelir / Hasar / LR Trendi">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={chartData} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.border} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      stroke={CHART_COLORS.muted}
                    />
                    <YAxis
                      yAxisId="currency"
                      tickFormatter={formatTryCurrency}
                      tick={{ fontSize: 12 }}
                      stroke={CHART_COLORS.muted}
                    />
                    <YAxis
                      yAxisId="percent"
                      orientation="right"
                      domain={[0, 100]}
                      tickFormatter={(v: number) => `%${v}`}
                      tick={{ fontSize: 12 }}
                      stroke={CHART_COLORS.muted}
                    />
                    <Tooltip content={<TrendTooltip />} />
                    <Legend />
                    <Line
                      yAxisId="currency"
                      type="monotone"
                      dataKey="revenue"
                      name="Gelir"
                      stroke={CHART_COLORS.primary}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      yAxisId="currency"
                      type="monotone"
                      dataKey="claims"
                      name="Hasar"
                      stroke={CHART_COLORS.danger}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      yAxisId="percent"
                      type="monotone"
                      dataKey="lossRatioPercent"
                      name="LR%"
                      stroke={CHART_COLORS.warning}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-48 items-center justify-center font-body text-sm text-sl-on-surface-variant">
                  Aylık veri bulunamadı.
                </div>
              )}
            </ChartCard>
          </section>
        </div>
      )}

      {activeTab === 'tahsilat' && (
        <TahsilatTab customerId={customerId} />
      )}
    </div>
  )
}
