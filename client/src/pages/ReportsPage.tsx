import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '../lib/api'
import { useActiveVersion } from '../lib/useActiveVersion'
import { PageIntro } from '../components/shared/PageIntro'

type ReportKind = 'budget-excel' | 'management-pdf'

interface ReportCard {
  id: ReportKind | 'soon'
  icon: string
  title: string
  description: string
  tags: readonly { label: string; variant?: 'neutral' | 'info' }[]
  endpoint?: string
  filename?: string
  accent: 'primary' | 'tertiary'
}

export function ReportsPage() {
  const { versionId, versionName, year, isLoading } = useActiveVersion()
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<ReportKind | null>(null)

  const reports: readonly ReportCard[] = [
    {
      id: 'budget-excel',
      icon: 'table_view',
      title: 'Bütçe Excel Export',
      description: 'Aktif versiyon müşteri × ay kırılımıyla Excel (ClosedXML) — revenue/claim + FX.',
      tags: [{ label: 'XLSX' }, { label: versionName ?? 'Aktif Versiyon' }],
      endpoint: '/reports/budget/excel',
      filename: `butce-fy${year}-${versionName ?? 'plan'}.xlsx`,
      accent: 'primary',
    },
    {
      id: 'management-pdf',
      icon: 'picture_as_pdf',
      title: 'Yönetim Raporu PDF',
      description: 'KPI özeti + teknik marj + EBITDA (QuestPDF) — CFO/CEO paketi.',
      tags: [{ label: 'PDF' }, { label: 'Aylık' }],
      endpoint: '/reports/management/pdf',
      filename: `yonetim-raporu-fy${year}.pdf`,
      accent: 'tertiary',
    },
    {
      id: 'soon',
      icon: 'slideshow',
      title: 'Yönetim Kurulu Paketi',
      description: '12 slayt EBITDA köprüsü + Segment P&L + stratejik girişimler (sprint devamı).',
      tags: [{ label: 'PPTX', variant: 'info' }, { label: 'Yakında' }],
      accent: 'primary',
    },
    {
      id: 'soon',
      icon: 'policy',
      title: 'BDDK / SPK Şablonu',
      description: 'Solvency, yükümlülük karşılama, teknik karşılıklar (sprint devamı).',
      tags: [{ label: 'XLSX', variant: 'info' }, { label: 'Yakında' }],
      accent: 'primary',
    },
    {
      id: 'soon',
      icon: 'handshake',
      title: 'Sigorta Şirketi Raporu',
      description: 'SLA, dosya istatistiği, loss ratio, brand performansı (sprint devamı).',
      tags: [{ label: 'PDF', variant: 'info' }, { label: 'Yakında' }],
      accent: 'tertiary',
    },
    {
      id: 'soon',
      icon: 'tune',
      title: 'Özel Rapor Oluştur',
      description: 'Sürükle-bırak rapor builder; boyut × metrik × zaman (sprint devamı).',
      tags: [{ label: 'Ad-hoc', variant: 'info' }, { label: 'Yakında' }],
      accent: 'primary',
    },
  ]

  const downloadMutation = useMutation({
    mutationFn: async (card: ReportCard) => {
      if (!card.endpoint || !card.filename) return
      if (versionId === null) throw new Error('Aktif bütçe versiyonu yok')
      setDownloading(card.id as ReportKind)
      const response = await api.get(card.endpoint, {
        params: { versionId },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(response.data as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = card.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    onSettled: () => setDownloading(null),
    onError: (e: unknown) =>
      setError(e instanceof Error ? e.message : 'İndirme başarısız'),
  })

  const ready = reports.filter((r) => r.id !== 'soon' && r.endpoint)
  const upcoming = reports.filter((r) => r.id === 'soon')

  return (
    <section>
      <PageIntro
        title="Raporlar"
        purpose="Aktif versiyondan resmi rapor üretimi (Excel + PDF). Her rapor bir karar/iletişim aracıdır — Excel ham veri analizi için, PDF yönetim/yönetim kurulu paylaşımı için."
        context={
          versionName && year ? (
            <p className="text-sm text-on-surface-variant">
              Aktif: FY{year} · {versionName}
            </p>
          ) : undefined
        }
      />

      {error ? <div className="card mb-4 text-sm text-error">{error}</div> : null}

      <ReportSection
        heading="Kullanıma Hazır"
        description="Şu anda indirilebilir raporlar — aktif versiyonu kullanır."
        reports={ready}
        downloading={downloading}
        disabled={isLoading || versionId === null}
        onDownload={(r) => {
          setError(null)
          downloadMutation.mutate(r)
        }}
      />

      <ReportSection
        heading="Yakında"
        description="Sprint devamında eklenecek raporlar — kart açıklamasında scope detayı."
        reports={upcoming}
        downloading={downloading}
        disabled
        onDownload={() => {}}
      />
    </section>
  )
}

function ReportSection({
  heading,
  description,
  reports,
  downloading,
  disabled,
  onDownload,
}: {
  heading: string
  description: string
  reports: readonly ReportCard[]
  downloading: ReportKind | null
  disabled: boolean
  onDownload: (card: ReportCard) => void
}) {
  if (reports.length === 0) return null
  return (
    <div className="mb-8">
      <div className="flex items-baseline gap-3 mb-3">
        <h3 className="text-lg font-bold text-on-surface">{heading}</h3>
        <p className="text-xs text-on-surface-variant">{description}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((r, idx) => {
          const isReady = r.id !== 'soon' && r.endpoint
          const isBusy = downloading === r.id
          return (
            <button
              key={`${r.title}-${idx}`}
              type="button"
              className="card hover:shadow-lg transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={disabled || !isReady || isBusy}
              onClick={() => {
                if (!isReady) return
                onDownload(r)
              }}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${
                  r.accent === 'primary'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-tertiary/10 text-tertiary'
                }`}
              >
                <span className="material-symbols-outlined">{r.icon}</span>
              </div>
              <h3 className="font-bold text-on-surface">{r.title}</h3>
              <p className="text-xs text-on-surface-variant mt-2">{r.description}</p>
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                {r.tags.map((t) => (
                  <span key={t.label} className={`chip chip-${t.variant ?? 'neutral'}`}>
                    {t.label}
                  </span>
                ))}
                {isBusy ? <span className="chip chip-info">İndiriliyor…</span> : null}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
