import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { PageIntro } from '../components/shared/PageIntro'

interface AuditLogDto {
  id: number
  userId: number | null
  userDisplayName: string | null
  entityName: string
  entityKey: string
  action: string
  oldValuesJson: string | null
  newValuesJson: string | null
  ipAddress: string | null
  createdAt: string
}

interface PagedAuditResult {
  items: AuditLogDto[]
  totalCount: number
  page: number
  limit: number
}

const ACTION_CHIP: Record<string, string> = {
  UPDATE: 'chip-info',
  CREATE: 'chip-success',
  APPROVE: 'chip-success',
  IMPORT: 'chip-success',
  DELETE: 'chip-error',
  EXPORT: 'chip-neutral',
  LOGIN: 'chip-neutral',
  LOGOUT: 'chip-neutral',
}

export function AuditLogPage() {
  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  const [days, setDays] = useState<number | null>(7)

  const fromDate = useMemo(() => {
    if (days == null) return null
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d.toISOString()
  }, [days])

  const auditQuery = useQuery({
    queryKey: ['audit-logs', page, limit, fromDate],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (fromDate) params.set('from', fromDate)
      const { data } = await api.get<PagedAuditResult>(`/audit-logs?${params}`)
      return data
    },
  })

  const result = auditQuery.data
  const items = useMemo(() => result?.items ?? [], [result])
  const totalPages = result ? Math.ceil(result.totalCount / result.limit) : 1

  const formatDateTime = (iso: string): string => {
    try {
      const d = new Date(iso)
      return d.toLocaleString('tr-TR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      })
    } catch {
      return iso
    }
  }

  return (
    <section>
      <PageIntro
        title="İşlem Geçmişi"
        purpose="Sistemdeki tüm CRUD + onay + import/export işlemlerinin append-only kaydı (KVKK + audit gereksinimi). 7 yıl retention."
        actions={
          <select
            className="select"
            value={days ?? ''}
            onChange={(e) => {
              const v = e.target.value
              setDays(v === '' ? null : Number(v))
              setPage(1)
            }}
          >
            <option value="7">Son 7 gün</option>
            <option value="30">Son 30 gün</option>
            <option value="">Tüm</option>
          </select>
        }
      />

      <div className="card p-0 overflow-hidden">
        {auditQuery.isLoading ? (
          <p className="p-6 text-sm text-on-surface-variant">Yükleniyor…</p>
        ) : auditQuery.isError ? (
          <p className="p-6 text-sm text-error">
            Audit kayıtları alınamadı. Yetki veya bağlantı sorunu olabilir.
          </p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-on-surface-variant">
            Seçili aralıkta audit kaydı bulunmuyor.
          </p>
        ) : (
          <>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Tarih/Saat</th>
                  <th>Kullanıcı</th>
                  <th>IP</th>
                  <th>Varlık</th>
                  <th>Anahtar</th>
                  <th>Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono text-xs">{formatDateTime(r.createdAt)}</td>
                    <td>
                      {r.userDisplayName ?? (r.userId != null ? `User #${r.userId}` : 'System')}
                    </td>
                    <td className="font-mono text-xs">{r.ipAddress ?? '—'}</td>
                    <td>{r.entityName}</td>
                    <td className="font-mono text-xs">{r.entityKey}</td>
                    <td>
                      <span
                        className={`chip ${
                          ACTION_CHIP[r.action.toUpperCase()] ?? 'chip-neutral'
                        }`}
                      >
                        {r.action}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 ? (
              <div className="flex items-center justify-between px-6 py-3 border-t border-outline-variant">
                <span className="text-xs text-on-surface-variant">
                  Toplam {result?.totalCount} kayıt · Sayfa {page} / {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Önceki
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  )
}
