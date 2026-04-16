import { StatusBadge } from './StatusBadge'

interface TimelineEntry {
  status: string
  date: string
  user?: string
  note?: string
}

interface ApprovalTimelineProps {
  entries: readonly TimelineEntry[]
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function ApprovalTimeline({ entries }: ApprovalTimelineProps) {
  if (entries.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-text-muted">
        Henüz durum geçişi yok.
      </p>
    )
  }

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-2.5 top-1 bottom-1 w-px bg-border" />

      <ol className="space-y-4">
        {entries.map((entry, index) => (
          <li key={`${entry.status}-${entry.date}`} className="relative">
            {/* Dot */}
            <div
              className={`absolute -left-6 top-1.5 h-2 w-2 rounded-full ring-2 ring-white ${
                index === 0
                  ? 'bg-primary-500'
                  : 'bg-border'
              }`}
            />

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <StatusBadge status={entry.status} />
                <span className="text-xs text-text-muted">
                  {formatDate(entry.date)}
                </span>
              </div>

              {entry.user && (
                <p className="text-xs text-text-muted">{entry.user}</p>
              )}

              {entry.note && (
                <p className="mt-0.5 rounded-md bg-surface-alt px-2.5 py-1.5 text-xs text-text-muted italic">
                  {entry.note}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

export type { TimelineEntry }
