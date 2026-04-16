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
import { KpiCard } from '../components/ui/KpiCard'
import { ChartCard } from '../components/dashboard/ChartCard'
import { CHART_COLORS, formatTryCurrency, formatFullCurrency, formatPercent } from '../components/dashboard/chart-utils'
import type { CustomerMonthly } from '../hooks/useCustomers'

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
      className="rounded-lg border bg-white px-3 py-2 text-sm shadow-md"
      style={{ borderColor: CHART_COLORS.border }}
    >
      <p className="mb-1 font-medium">{label}</p>
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

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const customerId = id ? Number(id) : null
  const { data: customer, isLoading, error } = useCustomerDetail(customerId)

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-text-muted">Yükleniyor...</p>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div>
        <Link
          to="/customers"
          className="mb-4 inline-block text-sm text-primary-600 underline-offset-2 hover:underline"
        >
          &larr; Müşteri Listesi
        </Link>
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm text-danger">Müşteri detayı yüklenemedi.</p>
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
        className="mb-4 inline-block text-sm text-primary-600 underline-offset-2 hover:underline"
      >
        &larr; Müşteri Listesi
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {customer.name}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          <span className="inline-block rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700">
            {customer.segment}
          </span>
        </p>
      </header>

      {/* Summary cards */}
      <section className="mb-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <div className="flex h-48 items-center justify-center text-sm text-text-muted">
              Aylık veri bulunamadı.
            </div>
          )}
        </ChartCard>
      </section>
    </div>
  )
}
