import { Link } from 'react-router-dom'
import { useTaskCenter } from './useTaskCenter'

const PRIORITY_BORDER: Record<string, string> = {
  high: 'border-l-4 border-l-error',
  medium: 'border-l-4 border-l-warning',
  low: 'border-l-4 border-l-on-surface-variant',
}

interface TaskCenterProps {
  embedded?: boolean
}

export function TaskCenter({ embedded = false }: TaskCenterProps) {
  const { tasks, isLoading } = useTaskCenter()
  const shellClass = embedded ? '' : 'card mb-4'
  const emptyClass = embedded ? 'text-center py-4' : 'text-center py-6'

  if (isLoading) {
    return (
      <div className={shellClass}>
        <p className="label-sm">Görev Merkezi</p>
        <p className="text-sm text-on-surface-variant mt-2">Yükleniyor…</p>
      </div>
    )
  }

  return (
    <div className={shellClass}>
      <div className="flex items-center gap-2 mb-3">
        <span
          className="material-symbols-outlined text-primary"
          style={{ fontSize: 20 }}
        >
          task_alt
        </span>
        <h3 className="text-base font-bold text-on-surface">Görev Merkezi</h3>
        <span className="text-xs text-on-surface-variant ml-1">
          Bugün yapmanız gerekenler
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className={emptyClass}>
          <p className="text-sm font-semibold text-on-surface">
            ✓ Bugün için bekleyen aksiyonunuz yok.
          </p>
          <p className="text-xs text-on-surface-variant mt-1">
            Yürürlükteki bütçeyi inceleyebilir veya yeni bir revizyon başlatabilirsiniz.
          </p>
          <Link to="/budget/planning" className="btn-secondary inline-flex mt-3">
            Bütçe Planlama →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tasks.slice(0, 4).map((t) => (
            <div
              key={t.id}
              className={`flex items-start gap-3 p-3 rounded-md bg-surface-container-low ${
                PRIORITY_BORDER[t.priority] ?? ''
              }`}
            >
              <span
                className="material-symbols-outlined text-on-surface-variant"
                style={{ fontSize: 24 }}
              >
                {t.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-on-surface truncate">
                  {t.title}
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                  {t.subtitle}
                </p>
                <Link
                  to={t.ctaHref}
                  className="btn-primary mt-2 inline-flex"
                  style={{ padding: '.4rem .75rem', fontSize: '.75rem' }}
                >
                  {t.ctaLabel}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {tasks.length > 4 && (
        <Link to="/approvals" className="text-xs text-primary mt-3 inline-block">
          Tümünü gör ({tasks.length}) →
        </Link>
      )}
    </div>
  )
}
