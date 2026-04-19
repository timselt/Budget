import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

type Tab = 'dashboard' | 'periods' | 'import'

interface SegmentRow {
  id: number
  code: string
  name: string
  displayOrder: number
  isActive: boolean
}

interface ImportPeriodRow {
  id: number
  segmentId: number
  segmentName: string
  importDate: string
  fileName: string
  periodLabel: string | null
  totalAmount: number
  overdueAmount: number
  pendingAmount: number
  status: string
}

interface SegmentSummary {
  segmentId: number
  segmentName: string
  totalReceivable: number
  overdue: number
  pending: number
  overdueRatio: number
  customerCount: number
  highRiskCount: number
  mediumRiskCount: number
  lowRiskCount: number
}

interface TopOverdueCustomer {
  customerId: number
  customerName: string
  amount: number
  sharePercent: number
}

interface RiskDistribution {
  highCount: number
  mediumCount: number
  lowCount: number
  highAmount: number
  mediumAmount: number
  lowAmount: number
}

interface ConsolidatedDashboard {
  totalReceivable: number
  totalOverdue: number
  totalPending: number
  overdueRatio: number
  segments: SegmentSummary[]
  topOverdueCustomers: TopOverdueCustomer[]
  riskDistribution: RiskDistribution
}

interface ImportResult {
  periodId: number
  customersProcessed: number
  invoicesProcessed: number
  totalAmount: number
  warnings: string[]
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'periods', label: 'Dönemler', icon: 'calendar_month' },
  { id: 'import', label: 'İçeri Aktar', icon: 'upload_file' },
]

async function getSegments(): Promise<SegmentRow[]> {
  const { data } = await api.get<SegmentRow[]>('/segments')
  return data
}

async function getPeriods(segmentId?: number): Promise<ImportPeriodRow[]> {
  const url = segmentId ? `/collections/periods?segmentId=${segmentId}` : '/collections/periods'
  const { data } = await api.get<ImportPeriodRow[]>(url)
  return data
}

async function getDashboard(periodId?: number): Promise<ConsolidatedDashboard> {
  const url = periodId
    ? `/collections/dashboard/consolidated?periodId=${periodId}`
    : '/collections/dashboard/consolidated'
  const { data } = await api.get<ConsolidatedDashboard>(url)
  return data
}

function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    const millions = value / 1_000_000
    return `${millions.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`
  }
  return value.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatAmount(value: number): string {
  return value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatPct(value: number): string {
  return `%${value.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`
}

export function CollectionsPage() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [periodFilter, setPeriodFilter] = useState<number | null>(null)
  const [segmentFilter, setSegmentFilter] = useState<number | null>(null)

  const segmentsQuery = useQuery({ queryKey: ['segments'], queryFn: getSegments })
  const periodsQuery = useQuery({
    queryKey: ['collection-periods', segmentFilter],
    queryFn: () => getPeriods(segmentFilter ?? undefined),
  })
  const dashboardQuery = useQuery({
    queryKey: ['collection-dashboard', periodFilter],
    queryFn: () => getDashboard(periodFilter ?? undefined),
  })

  const segments = segmentsQuery.data ?? []
  const periods = periodsQuery.data ?? []
  const dashboard = dashboardQuery.data

  return (
    <section>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-on-surface">Tahsilat</h2>
        </div>
      </div>

      <div className="flex gap-1 mb-4 bg-surface-container-low rounded-lg p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: 16 }}>
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' ? (
        <DashboardTab
          dashboard={dashboard}
          isLoading={dashboardQuery.isLoading}
          isError={dashboardQuery.isError}
          periods={periods}
          periodFilter={periodFilter}
          onPeriodChange={setPeriodFilter}
        />
      ) : null}

      {tab === 'periods' ? (
        <PeriodsTab
          periods={periods}
          segments={segments}
          segmentFilter={segmentFilter}
          onSegmentChange={setSegmentFilter}
          isLoading={periodsQuery.isLoading}
        />
      ) : null}

      {tab === 'import' ? <ImportTab segments={segments} /> : null}
    </section>
  )
}

function DashboardTab({
  dashboard,
  isLoading,
  isError,
  periods,
  periodFilter,
  onPeriodChange,
}: {
  dashboard: ConsolidatedDashboard | undefined
  isLoading: boolean
  isError: boolean
  periods: ImportPeriodRow[]
  periodFilter: number | null
  onPeriodChange: (id: number | null) => void
}) {
  if (isLoading) {
    return <div className="card text-sm text-on-surface-variant">Yükleniyor...</div>
  }
  if (isError || !dashboard) {
    return (
      <div className="card text-sm text-on-surface-variant">
        Konsolide dashboard verisi alınamadı. Dönem import'u yapıldıktan sonra tekrar deneyin.
      </div>
    )
  }

  return (
    <>
      <div className="card mb-4 flex items-center gap-3 flex-wrap">
        <label className="label-sm">Dönem</label>
        <select
          className="select"
          value={periodFilter ?? ''}
          onChange={(e) => onPeriodChange(e.target.value === '' ? null : Number(e.target.value))}
        >
          <option value="">Tüm dönemler</option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.segmentName} — {p.periodLabel ?? p.fileName}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-12 gap-4 mb-6">
        <KpiCard title="Toplam Alacak" value={formatCompact(dashboard.totalReceivable)} chip="chip-info" subtitle="TRY" />
        <KpiCard
          title="Vadesi Geçmiş"
          value={formatCompact(dashboard.totalOverdue)}
          chip="chip-error"
          subtitle={formatPct(dashboard.overdueRatio)}
        />
        <KpiCard title="Bekleyen" value={formatCompact(dashboard.totalPending)} chip="chip-warning" subtitle="Vadesi gelmemiş" />
        <KpiCard
          title="Yüksek Risk"
          value={`${dashboard.riskDistribution.highCount}`}
          chip="chip-error"
          subtitle={`${formatCompact(dashboard.riskDistribution.highAmount)} TRY`}
        />
      </div>

      <div className="grid grid-cols-12 gap-4 mb-6">
        <div className="col-span-12 lg:col-span-7 card p-0 overflow-hidden">
          <div className="p-4 border-b border-outline-variant">
            <h3 className="text-base font-bold text-on-surface">Segment Kırılımı</h3>
          </div>
          {dashboard.segments.length === 0 ? (
            <p className="p-6 text-sm text-on-surface-variant">Segment verisi yok.</p>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Segment</th>
                  <th className="text-right">Toplam</th>
                  <th className="text-right">Vadesi Geçmiş</th>
                  <th className="text-right">Bekleyen</th>
                  <th className="text-right">Vade %</th>
                  <th className="text-right">Müşteri</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.segments.map((s) => (
                  <tr key={s.segmentId}>
                    <td className="font-semibold">{s.segmentName}</td>
                    <td className="text-right num">{formatAmount(s.totalReceivable)}</td>
                    <td className="text-right num text-error">{formatAmount(s.overdue)}</td>
                    <td className="text-right num text-on-surface-variant">
                      {formatAmount(s.pending)}
                    </td>
                    <td className="text-right">
                      <span
                        className={`chip ${
                          s.overdueRatio > 50
                            ? 'chip-error'
                            : s.overdueRatio > 25
                              ? 'chip-warning'
                              : 'chip-success'
                        }`}
                      >
                        {formatPct(s.overdueRatio)}
                      </span>
                    </td>
                    <td className="text-right num">
                      {s.customerCount}
                      <span className="text-xs text-on-surface-variant ml-1">
                        (Y:{s.highRiskCount} O:{s.mediumRiskCount} D:{s.lowRiskCount})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="col-span-12 lg:col-span-5 card p-0 overflow-hidden">
          <div className="p-4 border-b border-outline-variant">
            <h3 className="text-base font-bold text-on-surface">En Riskli 10 Müşteri</h3>
          </div>
          {dashboard.topOverdueCustomers.length === 0 ? (
            <p className="p-6 text-sm text-on-surface-variant">Vadesi geçmiş müşteri yok.</p>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Müşteri</th>
                  <th className="text-right">Vadesi Geçmiş</th>
                  <th className="text-right">Pay</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.topOverdueCustomers.map((c) => (
                  <tr key={c.customerId}>
                    <td className="font-semibold text-sm">{c.customerName}</td>
                    <td className="text-right num">{formatAmount(c.amount)}</td>
                    <td className="text-right">
                      <span className="chip chip-warning">{formatPct(c.sharePercent)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}

function PeriodsTab({
  periods,
  segments,
  segmentFilter,
  onSegmentChange,
  isLoading,
}: {
  periods: ImportPeriodRow[]
  segments: SegmentRow[]
  segmentFilter: number | null
  onSegmentChange: (id: number | null) => void
  isLoading: boolean
}) {
  return (
    <>
      <div className="card mb-4 flex items-center gap-3 flex-wrap">
        <label className="label-sm">Segment</label>
        <select
          className="select"
          value={segmentFilter ?? ''}
          onChange={(e) => onSegmentChange(e.target.value === '' ? null : Number(e.target.value))}
        >
          <option value="">Tüm segmentler</option>
          {segments.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-on-surface-variant">Yükleniyor...</p>
        ) : periods.length === 0 ? (
          <p className="p-6 text-sm text-on-surface-variant">
            Henüz import edilmiş dönem yok. "İçeri Aktar" sekmesinden Excel dosyası yükleyin.
          </p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Segment</th>
                <th>Dönem</th>
                <th>Dosya</th>
                <th>İmport</th>
                <th className="text-right">Toplam</th>
                <th className="text-right">Vadesi Geçmiş</th>
                <th className="text-right">Bekleyen</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.id}>
                  <td className="font-semibold">{p.segmentName}</td>
                  <td>{p.periodLabel ?? '—'}</td>
                  <td className="font-mono text-xs truncate max-w-[220px]">{p.fileName}</td>
                  <td className="text-xs text-on-surface-variant">
                    {new Date(p.importDate).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="text-right num">{formatAmount(p.totalAmount)}</td>
                  <td className="text-right num text-error">{formatAmount(p.overdueAmount)}</td>
                  <td className="text-right num text-on-surface-variant">
                    {formatAmount(p.pendingAmount)}
                  </td>
                  <td>
                    <span
                      className={`chip ${
                        p.status === 'Completed'
                          ? 'chip-success'
                          : p.status === 'Failed'
                            ? 'chip-error'
                            : 'chip-info'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

function ImportTab({ segments }: { segments: SegmentRow[] }) {
  const [segmentOverride, setSegmentOverride] = useState<number | ''>('')
  const segmentId = useMemo<number | ''>(() => {
    if (segmentOverride !== '' && segments.some((s) => s.id === segmentOverride)) {
      return segmentOverride
    }
    return segments[0]?.id ?? ''
  }, [segmentOverride, segments])
  const setSegmentId = setSegmentOverride
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Lütfen Excel dosyası seçin')
      if (segmentId === '') throw new Error('Segment seçin')
      const form = new FormData()
      form.append('file', file)
      form.append('segmentId', String(segmentId))
      const { data } = await api.post<ImportResult>('/collections/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    },
    onSuccess: (data) => {
      setResult(data)
      setError(null)
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
      queryClient.invalidateQueries({ queryKey: ['collection-periods'] })
      queryClient.invalidateQueries({ queryKey: ['collection-dashboard'] })
    },
    onError: (e: unknown) => {
      setError(e instanceof Error ? e.message : 'Import başarısız')
      setResult(null)
    },
  })

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 lg:col-span-6 card">
        <h3 className="text-base font-bold text-on-surface mb-4">Excel Dosyası Yükle</h3>
        <p className="text-xs text-on-surface-variant mb-4">
          Tahsilat raporları .xlsx formatında. Bir segment için her yeni import yeni bir dönem
          kaydı oluşturur.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            uploadMutation.mutate()
          }}
          className="space-y-4"
        >
          <label className="block">
            <span className="label-sm block mb-1.5">Segment</span>
            <select
              className="select w-full"
              value={segmentId}
              required
              onChange={(e) =>
                setSegmentId(e.target.value === '' ? '' : Number(e.target.value))
              }
            >
              <option value="">—</option>
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label-sm block mb-1.5">Dosya</span>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="input w-full"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </label>
          {file ? (
            <p className="text-xs text-on-surface-variant">
              Seçilen: <span className="font-mono">{file.name}</span> (
              {(file.size / 1024).toFixed(1)} kB)
            </p>
          ) : null}
          {error ? <p className="text-sm text-error">{error}</p> : null}
          <button
            type="submit"
            className="btn-primary w-full justify-center"
            disabled={!file || uploadMutation.isPending}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              upload
            </span>
            {uploadMutation.isPending ? 'Yükleniyor…' : 'İçeri Aktar'}
          </button>
        </form>
      </div>

      <div className="col-span-12 lg:col-span-6 card">
        <h3 className="text-base font-bold text-on-surface mb-4">Sonuç</h3>
        {result ? (
          <div className="space-y-3">
            <p className="text-sm">
              <span className="chip chip-success mr-2">Tamamlandı</span>
              Dönem ID: <span className="font-mono">{result.periodId}</span>
            </p>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-surface-container-low rounded-lg p-3">
                <p className="label-sm">Müşteri</p>
                <p className="text-xl font-bold num mt-1">{result.customersProcessed}</p>
              </div>
              <div className="bg-surface-container-low rounded-lg p-3">
                <p className="label-sm">Fatura</p>
                <p className="text-xl font-bold num mt-1">{result.invoicesProcessed}</p>
              </div>
              <div className="bg-surface-container-low rounded-lg p-3">
                <p className="label-sm">Toplam</p>
                <p className="text-sm font-bold num mt-1">
                  {formatCompact(result.totalAmount)}
                </p>
              </div>
            </div>
            {result.warnings.length > 0 ? (
              <div>
                <p className="label-sm text-warning mb-2">Uyarılar ({result.warnings.length})</p>
                <ul className="text-xs text-on-surface-variant space-y-1 max-h-40 overflow-auto">
                  {result.warnings.map((w, i) => (
                    <li key={i} className="font-mono">
                      • {w}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant">
            Yüklediğiniz dosyanın sonucu burada gösterilecek.
          </p>
        )}
      </div>
    </div>
  )
}

function KpiCard({
  title,
  value,
  subtitle,
  chip,
}: {
  title: string
  value: string
  subtitle: string
  chip: string
}) {
  return (
    <div className="col-span-12 md:col-span-3 card">
      <div className="flex items-center gap-2">
        <span className="label-sm">{title}</span>
        <span className={`chip ${chip}`} />
      </div>
      <p className="text-2xl font-black tracking-display num mt-2">{value}</p>
      <p className="text-xs text-on-surface-variant mt-1">{subtitle}</p>
    </div>
  )
}
