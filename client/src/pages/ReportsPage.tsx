import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '../lib/api'
import { useActiveVersion } from '../lib/useActiveVersion'

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

  return (
    <section>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-[#002366]">Raporlar</h2>
          {versionName && year ? (
            <p className="text-sm text-on-surface-variant mt-1">
              Aktif: FY{year} · {versionName}
            </p>
          ) : null}
        </div>
      </div>

      {error ? <div className="card mb-4 text-sm text-error">{error}</div> : null}

      <div className="grid grid-cols-3 gap-6">
        {reports.map((r, idx) => {
          const isReady = r.id !== 'soon' && r.endpoint
          const isBusy = downloading === r.id
          return (
            <button
              key={`${r.title}-${idx}`}
              type="button"
              className="card hover:shadow-lg transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={!isReady || isLoading || versionId === null || isBusy}
              onClick={() => {
                if (!isReady) return
                setError(null)
                downloadMutation.mutate(r)
              }}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${
                  r.accent === 'primary' ? 'bg-primary/10 text-primary' : 'bg-tertiary/10 text-tertiary'
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
    </section>
  )
}
