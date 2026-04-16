import type { AuditLogDto } from '../../hooks/useAuditLogs'

interface AuditLogTableProps {
  items: AuditLogDto[]
  isLoading: boolean
}

const ACTION_LABELS: Record<string, string> = {
  Insert: 'Ekleme',
  Update: 'Guncelleme',
  Delete: 'Silme',
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(iso))
}

export function AuditLogTable({ items, isLoading }: AuditLogTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-text-muted">
        Yukleniryor...
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-text-muted">
        Kayit bulunamadi.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-sl-outline-variant/15">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-sl-outline-variant/15 bg-surface-alt text-left">
            <th className="px-4 py-3 font-medium text-text-muted">Tarih</th>
            <th className="px-4 py-3 font-medium text-text-muted">Kullanici</th>
            <th className="px-4 py-3 font-medium text-text-muted">Islem</th>
            <th className="px-4 py-3 font-medium text-text-muted">Entity</th>
            <th className="px-4 py-3 font-medium text-text-muted">Anahtar</th>
            <th className="px-4 py-3 font-medium text-text-muted">IP</th>
          </tr>
        </thead>
        <tbody className="">
          {items.map((item) => (
            <tr key={item.id} className="transition-colors hover:bg-surface-alt/50">
              <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                {formatDate(item.createdAt)}
              </td>
              <td className="px-4 py-3">
                {item.userDisplayName ?? `#${item.userId ?? '-'}`}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex rounded-md bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                  {ACTION_LABELS[item.action] ?? item.action}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-xs">{item.entityName}</td>
              <td className="px-4 py-3 font-mono text-xs">{item.entityKey}</td>
              <td className="px-4 py-3 tabular-nums text-text-muted">
                {item.ipAddress ?? '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
