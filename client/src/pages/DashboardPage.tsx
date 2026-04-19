import '../lib/chart-config'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { useActiveVersion } from '../lib/useActiveVersion'
import { FinOpsTrendChart, FinOpsSegmentDonut } from '../components/dashboard/FinOpsTrendChart'
import { TaskCenter } from '../components/dashboard/TaskCenter'
import { HelpHint } from '../components/shared/Tooltip'
import {
  EbitdaBridgeChart,
  LossRatioChart,
  OpexBreakdownChart,
} from '../components/dashboard/FinOpsSecondaryCharts'

interface KpiResult {
  totalRevenue: number
  totalClaims: number
  technicalMargin: number
  lossRatio: number
  generalExpenses: number
  technicalExpenses: number
  technicalProfit: number
  financialIncome: number
  financialExpenses: number
  tKatilim: number
  depreciation: number
  netProfit: number
  ebitda: number
  expenseRatio: number
  combinedRatio: number
  ebitdaMargin: number
  technicalProfitRatio: number
  profitRatio: number
  muallakRatio: number
}

interface ConcentrationRow {
  customerId: number
  customerName: string
  revenue: number
  sharePercent: number
}

interface ConcentrationResult {
  topCustomers: ConcentrationRow[]
  herfindahlIndex: number
  topNSharePercent: number
}

function fmtM(value: number): string {
  const m = value / 1_000_000
  return `${m.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`
}

function fmtPct(value: number, digits = 1): string {
  return `%${value.toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}

export function DashboardPage() {
  const { versionId, versionName, year, isLoading: versionLoading } = useActiveVersion()

  const kpisQuery = useQuery({
    queryKey: ['dashboard-kpis', versionId],
    queryFn: async () => {
      const { data } = await api.get<KpiResult>(`/dashboard/${versionId}/kpis`)
      return data
    },
    enabled: versionId !== null,
  })

  const concentrationQuery = useQuery({
    queryKey: ['dashboard-concentration', versionId],
    queryFn: async () => {
      const { data } = await api.get<ConcentrationResult>(
        `/dashboard/${versionId}/top-customers?topN=5`,
      )
      return data
    },
    enabled: versionId !== null,
  })

  const kpis = kpisQuery.data ?? null
  const concentration = concentrationQuery.data ?? null
  const topCustomers = useMemo(() => concentration?.topCustomers ?? [], [concentration])

  const marginPercent = kpis && kpis.totalRevenue > 0
    ? (kpis.technicalMargin / kpis.totalRevenue) * 100
    : 0

  if (versionLoading) {
    return (
      <section>
        <h2 className="text-3xl font-extrabold tracking-display text-[#002366] mb-6">
          Ana Sayfa
        </h2>
        <div className="card p-6 text-sm text-on-surface-variant">Yükleniyor…</div>
      </section>
    )
  }

  if (versionId === null) {
    return (
      <section>
        <h2 className="text-3xl font-extrabold tracking-display text-[#002366] mb-6">
          Ana Sayfa
        </h2>
        <div className="card p-8 text-center">
          <span
            className="material-symbols-outlined text-on-surface-variant"
            style={{ fontSize: 48 }}
          >
            calendar_add_on
          </span>
          <p className="text-base font-semibold text-on-surface mt-3">
            Henüz aktif bütçe versiyonu yok
          </p>
          <p className="text-sm text-on-surface-variant mt-1 max-w-md mx-auto">
            Çalışmaya başlamak için bir bütçe yılı + versiyon oluşturun.
            Tüm dashboard, sapma ve raporlar bu versiyon üzerinden hesaplanır.
          </p>
          <Link
            to="/budget/planning?tab=versions"
            className="btn-primary mt-4 inline-flex"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              add
            </span>
            Yeni Versiyon Oluştur
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-[#002366]">
            Ana Sayfa
          </h2>
          {versionName && year ? (
            <p className="text-sm text-on-surface-variant mt-1">
              FY{year} · {versionName}
            </p>
          ) : null}
        </div>
      </div>

      <TaskCenter />

      {kpisQuery.isError ? (
        <div className="card mb-6 text-sm text-error">KPI hesaplanırken hata oluştu.</div>
      ) : null}

      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-12 lg:col-span-4 card-tonal">
          <span className="label-sm block mb-4">Toplam Gelir — FY{year} Plan</span>
          <div className="flex items-baseline gap-2">
            <span className="text-[3.5rem] font-extrabold tracking-display leading-none text-[#002366] num">
              {kpis ? fmtM(kpis.totalRevenue) : '—'}
            </span>
            <span className="text-sm font-bold text-on-surface-variant">TL</span>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <span className="text-[0.65rem] text-on-surface-variant font-semibold">12 aylık</span>
          </div>
        </div>

        <div className="col-span-6 lg:col-span-2 card">
          <span className="label-sm">
            Teknik Marj
            <HelpHint text="Teknik Marj = Prim Geliri − Hasar Maliyeti. Reasürans öncesi sigortacılık karlılığı." />
          </span>
          <p className="text-2xl font-extrabold tracking-display num mt-2 text-[#002366]">
            {kpis ? fmtM(kpis.technicalMargin) : '—'}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">
            {kpis ? `${fmtPct(marginPercent)} marj` : '—'}
          </p>
        </div>

        <div className="col-span-6 lg:col-span-2 card">
          <span className="label-sm">
            EBITDA
            <HelpHint text="EBITDA = Faiz, Vergi, Amortisman ve İtfa öncesi kar. Operasyonel performans göstergesi." />
          </span>
          <p className="text-2xl font-extrabold tracking-display num mt-2 text-[#002366]">
            {kpis ? fmtM(kpis.ebitda) : '—'}
          </p>
          <p className="text-xs text-success font-bold mt-1">
            {kpis ? `${fmtPct(kpis.ebitdaMargin * 100)} EBITDA margin` : '—'}
          </p>
        </div>

        <div className="col-span-6 lg:col-span-2 card">
          <span className="label-sm">
            Loss Ratio
            <HelpHint text="Loss Ratio = Hasar / Prim. ≤55% iyi, 55-70% normal, >70% riskli." />
          </span>
          <p className="text-2xl font-extrabold tracking-display num mt-2 text-[#002366]">
            {kpis ? fmtPct(kpis.lossRatio * 100) : '—'}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">Hasar/Prim</p>
        </div>

        <div className="col-span-6 lg:col-span-2 card">
          <span className="label-sm">
            Combined Ratio
            <HelpHint text="Combined Ratio = (Hasar + Gider) / Prim. <100% sigortacılık karlı, ≥100% zararlı." />
          </span>
          <p className="text-2xl font-extrabold tracking-display num mt-2 text-[#002366]">
            {kpis ? fmtPct(kpis.combinedRatio * 100) : '—'}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">Hasar + Gider / Prim</p>
        </div>
      </div>

      {/* Grafikler — yerel sample data (ayrı iyileştirme konusu) */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-12 lg:col-span-8 card">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-bold tracking-tight text-[#002366]">
                Gelir / Hasar / Teknik Marj — Aylık Trend
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Grafik: örnek zaman serisi (aylık agregasyon endpoint'i sprint devamında gelecek)
              </p>
            </div>
          </div>
          <div style={{ height: 220 }}>
            <FinOpsTrendChart />
          </div>
        </div>
        <div className="col-span-12 lg:col-span-4 card">
          <h3 className="text-lg font-bold tracking-tight text-[#002366] mb-4">
            Top 5 Müşteri (Konsantrasyon)
          </h3>
          {topCustomers.length === 0 ? (
            <p className="text-xs text-on-surface-variant">Henüz veri yok.</p>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((c) => (
                <TopCustomerRow
                  key={c.customerId}
                  label={c.customerName}
                  share={c.sharePercent}
                />
              ))}
            </div>
          )}
          {concentration ? (
            <p className="text-[0.65rem] text-on-surface-variant mt-4">
              HHI: {(concentration.herfindahlIndex ?? 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
              {' · '}
              Top-{topCustomers.length} pay: {fmtPct(concentration.topNSharePercent ?? 0)}
            </p>
          ) : null}
        </div>
      </div>

      {/* Grafik alt satırı — mevcut chart bileşenleri (sample series) */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-4 card">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-bold tracking-tight text-[#002366]">EBITDA Köprüsü</h3>
            <span className="chip chip-info">Demo</span>
          </div>
          <div style={{ height: 220 }}>
            <EbitdaBridgeChart />
          </div>
        </div>
        <div className="col-span-12 lg:col-span-4 card">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-bold tracking-tight text-[#002366]">Loss Ratio (aylık)</h3>
            <span className="chip chip-warning">Demo</span>
          </div>
          <div style={{ height: 220 }}>
            <LossRatioChart />
          </div>
        </div>
        <div className="col-span-12 lg:col-span-4 card">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-bold tracking-tight text-[#002366]">Gider Kırılımı</h3>
            <span className="chip chip-neutral">Demo</span>
          </div>
          <div style={{ height: 220 }}>
            <OpexBreakdownChart />
          </div>
          <div style={{ height: 180, display: 'none' }}>
            <FinOpsSegmentDonut />
          </div>
        </div>
      </div>
    </section>
  )
}

function TopCustomerRow({ label, share }: { label: string; share: number }) {
  const safeShare = share ?? 0
  const width = Math.min(100, Math.max(0, safeShare))
  return (
    <div>
      <div className="flex justify-between items-end mb-1.5">
        <span className="text-sm font-bold text-on-surface truncate max-w-[70%]">{label}</span>
        <span className="text-sm font-extrabold num">
          {safeShare.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
        </span>
      </div>
      <div className="progress-track">
        <div className="progress-fill bg-primary" style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}
