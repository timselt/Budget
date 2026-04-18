import '../lib/chart-config'
import { FinOpsTrendChart, FinOpsSegmentDonut } from '../components/dashboard/FinOpsTrendChart'
import {
  EbitdaBridgeChart,
  LossRatioChart,
  OpexBreakdownChart,
} from '../components/dashboard/FinOpsSecondaryCharts'

interface ServiceLine {
  icon: string
  title: string
  subtitle: string
  amount: string
  share: string
  highlighted?: boolean
}

const SERVICE_LINES: readonly ServiceLine[] = [
  {
    icon: 'directions_car',
    title: 'Oto Asistans',
    subtitle: 'Yol yardım, çekici, ikame araç',
    amount: '1.190,2M',
    share: '%53 of total',
    highlighted: true,
  },
  {
    icon: 'medical_services',
    title: 'Sağlık Asistans',
    subtitle: 'Tamamlayıcı sağlık, TUR Medical',
    amount: '485,4M',
    share: '%22 of total',
  },
  {
    icon: 'home_work',
    title: 'Konut Asistans',
    subtitle: 'KonutKonfor, acil bakım',
    amount: '346,1M',
    share: '%15 of total',
  },
  {
    icon: 'verified_user',
    title: 'Warranty & SGK Teşvik',
    subtitle: 'OEM warranty, teşvik gelirleri',
    amount: '223,5M',
    share: '%10 of total',
  },
]

interface Alert {
  title: string
  body: string
  chip: 'error' | 'warning' | 'info' | 'success'
  chipLabel: string
  actionable?: boolean
}

const ALERTS: readonly Alert[] = [
  {
    title: "Oto hasar dosya maliyeti Q1'de +%9",
    body: 'Tedarikçi fiyat artışı ve ikame araç süresi uzadı',
    chip: 'error',
    chipLabel: 'YÜKSEK',
    actionable: true,
  },
  {
    title: 'Sağlık Asistans gelirleri %6 planın altında',
    body: '2 kritik sigortacı yeniden fiyatlama talep ediyor',
    chip: 'warning',
    chipLabel: 'ORTA',
  },
  {
    title: 'Konut Asistans dosya sayısı +%21',
    body: 'Pozitif sapma — KonutKonfor kampanyası',
    chip: 'info',
    chipLabel: 'BİLGİ',
  },
  {
    title: 'EBITDA Q1 cumulative planın %3 üstünde',
    body: 'Personel giderleri ve teknoloji amortismanı tasarrufu',
    chip: 'success',
    chipLabel: 'OLUMLU',
  },
]

export function DashboardPage() {
  return (
    <section>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-[#002366]">
            Executive Dashboard
          </h2>
        </div>
        <div className="flex gap-3">
          <button type="button" className="btn-secondary">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              tune
            </span>
            Filtre
          </button>
          <button type="button" className="btn-primary">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              file_download
            </span>
            Dışa Aktar
          </button>
        </div>
      </div>

      {/* KPI BENTO — tonal cards, no border accents (No-Line Rule) */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-12 lg:col-span-4 card-tonal">
          <span className="label-sm block mb-4">Toplam Gelir — FY26 Plan</span>
          <div className="flex items-baseline gap-2">
            <span className="text-[3.5rem] font-extrabold tracking-display leading-none text-[#002366] num">
              2.245,2M
            </span>
            <span className="text-sm font-bold text-on-surface-variant">TL</span>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <span className="chip chip-success">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                trending_up
              </span>
              +18,4% vs FY25
            </span>
            <span className="text-[0.65rem] text-on-surface-variant font-semibold">12 aylık</span>
          </div>
        </div>

        <div className="col-span-6 lg:col-span-2 card">
          <span className="label-sm">Teknik Marj</span>
          <p className="text-2xl font-extrabold tracking-display num mt-2 text-[#002366]">920,6M</p>
          <p className="text-xs text-on-surface-variant mt-1">%41,0 marj</p>
          <div className="progress-track mt-3">
            <div className="progress-fill bg-primary" style={{ width: '82%' }} />
          </div>
          <p className="text-[0.65rem] text-on-surface-variant mt-2">Hedef: 1.125M TL</p>
        </div>

        <div className="col-span-6 lg:col-span-2 card">
          <span className="label-sm">EBITDA</span>
          <p className="text-2xl font-extrabold tracking-display num mt-2 text-[#002366]">360,4M</p>
          <p className="text-xs text-success font-bold mt-1">%16,1 EBITDA margin</p>
          <div className="progress-track mt-3">
            <div className="progress-fill bg-success" style={{ width: '91%' }} />
          </div>
          <p className="text-[0.65rem] text-on-surface-variant mt-2">Hedef: 395M TL</p>
        </div>

        <div className="col-span-6 lg:col-span-2 card">
          <span className="label-sm">Loss Ratio</span>
          <p className="text-2xl font-extrabold tracking-display num mt-2 text-[#002366]">%59,0</p>
          <p className="text-xs text-on-surface-variant mt-1">Hasar/Prim</p>
          <div className="progress-track mt-3">
            <div className="progress-fill bg-warning" style={{ width: '59%' }} />
          </div>
          <p className="text-[0.65rem] text-on-surface-variant mt-2">Benchmark: %55</p>
        </div>

        <div className="col-span-6 lg:col-span-2 card">
          <span className="label-sm">Toplam Dosya</span>
          <p className="text-2xl font-extrabold tracking-display num mt-2 text-[#002366]">1,24M</p>
          <p className="text-xs text-success font-bold mt-1">+%12,6</p>
          <div className="progress-track mt-3">
            <div className="progress-fill bg-success" style={{ width: '65%' }} />
          </div>
          <p className="text-[0.65rem] text-on-surface-variant mt-2">Araç + Sağlık + Konut</p>
        </div>
      </div>

      {/* Trend + Segment */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-12 lg:col-span-8 card">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-bold tracking-tight text-[#002366]">
                Gelir / Hasar / Teknik Marj — Aylık Trend
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">FY26 Plan, MTL</p>
            </div>
            <div className="flex gap-2">
              <span className="chip chip-error">Gelir</span>
              <span className="chip chip-warning">Hasar</span>
              <span className="chip chip-info">Teknik Marj</span>
            </div>
          </div>
          <div style={{ height: 220 }}>
            <FinOpsTrendChart />
          </div>
        </div>
        <div className="col-span-12 lg:col-span-4 card">
          <h3 className="text-lg font-bold tracking-tight text-[#002366] mb-4">
            Gelir Segmentasyonu
          </h3>
          <div style={{ height: 180 }}>
            <FinOpsSegmentDonut />
          </div>
          <div className="mt-4 space-y-3">
            <SegmentRow label="Sigorta Şirketleri" share={62} color="bg-primary" />
            <SegmentRow label="Banka / Kart Programı" share={18} color="bg-secondary" />
            <SegmentRow label="B2B2C Programlar" share={14} color="bg-outline" />
            <SegmentRow label="B2C Direkt + Ad-Hoc" share={6} color="bg-outline-variant" />
          </div>
        </div>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-12 lg:col-span-4 card">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-bold tracking-tight text-[#002366]">EBITDA Köprüsü</h3>
            <span className="chip chip-info">FY25→FY26</span>
          </div>
          <div style={{ height: 220 }}>
            <EbitdaBridgeChart />
          </div>
        </div>
        <div className="col-span-12 lg:col-span-4 card">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-bold tracking-tight text-[#002366]">
              Loss Ratio (aylık)
            </h3>
            <span className="chip chip-warning">%59 ort.</span>
          </div>
          <div style={{ height: 220 }}>
            <LossRatioChart />
          </div>
        </div>
        <div className="col-span-12 lg:col-span-4 card">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-bold tracking-tight text-[#002366]">Gider Kırılımı</h3>
            <span className="chip chip-neutral">FY26</span>
          </div>
          <div style={{ height: 220 }}>
            <OpexBreakdownChart />
          </div>
        </div>
      </div>

      {/* Service Line + Alerts */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7 card p-0 overflow-hidden">
          <div className="p-6 pb-3">
            <h3 className="text-lg font-bold tracking-tight text-[#002366]">
              Service Line Performansı
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">FY26 Plan, cirodan % pay</p>
          </div>
          <div className="flex flex-col">
            {SERVICE_LINES.map((line, i) => (
              <ServiceLineRow key={line.title} line={line} zebra={i % 2 === 0} />
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold tracking-tight text-[#002366]">Kritik Uyarılar</h3>
            <span className="chip chip-error">4 aktif</span>
          </div>
          <div className="space-y-3">
            {ALERTS.map((alert) => (
              <AlertCard key={alert.title} alert={alert} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function SegmentRow({ label, share, color }: { label: string; share: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between items-end mb-1.5">
        <span className="text-sm font-bold text-on-surface">{label}</span>
        <span className="text-sm font-extrabold num">{share}%</span>
      </div>
      <div className="progress-track">
        <div className={`progress-fill ${color}`} style={{ width: `${share}%` }} />
      </div>
    </div>
  )
}

function ServiceLineRow({ line, zebra }: { line: ServiceLine; zebra: boolean }) {
  // Zebra alternating row fills replace divider lines (No-Line Rule)
  const bg = zebra ? 'bg-surface-container-low/50' : 'bg-surface-container-lowest'
  // Highlighted row uses a stronger tonal step (recessed bg) instead of a left
  // accent stripe — brand bans 1px/4px borders for emphasis.
  const highlightBg = line.highlighted ? 'bg-surface-container-high/60' : bg

  return (
    <div
      className={`flex items-center justify-between p-4 px-6 ${highlightBg} hover:bg-surface-container-high transition-colors group`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            line.highlighted
              ? 'bg-surface text-primary'
              : 'bg-surface-container text-on-secondary-container'
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            {line.icon}
          </span>
        </div>
        <div>
          <p className="font-bold text-sm text-on-surface">{line.title}</p>
          <p className="text-xs text-on-surface-variant mt-0.5">{line.subtitle}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`${line.highlighted ? 'font-extrabold text-lg' : 'font-bold text-lg'} num text-[#002366]`}>
          {line.amount}
        </p>
        <p
          className={`text-xs ${
            line.highlighted ? 'font-bold text-success' : 'font-medium text-on-surface-variant'
          }`}
        >
          {line.share}
        </p>
      </div>
    </div>
  )
}

function AlertCard({ alert }: { alert: Alert }) {
  // Severity expressed via leading chip + tonal recessed bg — no ribbon stripe.
  return (
    <div className="bg-surface-container-low rounded-lg p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-sm font-bold text-[#002366]">{alert.title}</p>
        <span className={`chip chip-${alert.chip}`}>{alert.chipLabel}</span>
      </div>
      <p className="text-xs text-on-surface-variant">{alert.body}</p>
      {alert.actionable && (
        <button type="button" className="btn-ghost mt-3 -ml-3">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            arrow_outward
          </span>
          Aksiyon Planı
        </button>
      )}
    </div>
  )
}
