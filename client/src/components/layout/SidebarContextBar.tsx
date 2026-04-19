import { useEffect } from 'react'
import { useAppContextStore } from '../../stores/appContext'
import { useActiveVersion } from '../../lib/useActiveVersion'

function statusLabel(status: string | null): string {
  if (!status) return ''
  const map: Record<string, string> = {
    Draft: 'Taslak',
    Submitted: 'Gönderildi',
    DeptApproved: 'Dept. Onaylı',
    FinanceApproved: 'Finans Onaylı',
    CfoApproved: 'CFO Onaylı',
    Active: 'Aktif',
    Archived: 'Arşiv',
  }
  return map[status] ?? status
}

function statusClass(status: string | null): string {
  switch (status) {
    case 'Active':
      return 'bg-green-500/20 text-green-300'
    case 'Draft':
      return 'bg-amber-500/20 text-amber-300'
    case 'CfoApproved':
    case 'FinanceApproved':
    case 'DeptApproved':
      return 'bg-blue-500/20 text-blue-300'
    default:
      return 'bg-white/10 text-white/70'
  }
}

export function SidebarContextBar() {
  const selectedVersionId = useAppContextStore((s) => s.selectedVersionId)
  const selectedVersionLabel = useAppContextStore((s) => s.selectedVersionLabel)
  const selectedVersionStatus = useAppContextStore(
    (s) => s.selectedVersionStatus,
  )
  const setVersion = useAppContextStore((s) => s.setVersion)
  const selectedYear = useAppContextStore((s) => s.selectedYear)
  const active = useActiveVersion()

  // Store boşsa server auto-select ile hydrate et.
  // Status bilgisi useActiveVersion tarafından dönmüyor → "Active" varsayımı
  // (hook zaten aktif olanı önceliyor). Doğru status BudgetEntryPage seçim
  // yaptığında store'a yazılır.
  useEffect(() => {
    if (
      selectedVersionId === null &&
      active.versionId !== null &&
      active.versionName
    ) {
      setVersion({
        id: active.versionId,
        label: active.versionName,
        status: 'Active',
      })
    }
  }, [active.versionId, active.versionName, selectedVersionId, setVersion])

  // Hiçbir bağlam yoksa satırı gösterme
  if (!selectedVersionLabel && !selectedYear) return null

  return (
    <div className="px-3 pb-4">
      <div className="rounded-lg bg-white/5 px-3 py-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-white/50 uppercase tracking-wider text-[0.625rem]">
              Aktif Bağlam
            </div>
            <div className="text-white font-semibold truncate">
              {selectedYear}
              {selectedVersionLabel ? ` / ${selectedVersionLabel}` : ''}
            </div>
          </div>
          {selectedVersionStatus && (
            <span
              className={`px-2 py-0.5 rounded text-[0.625rem] font-semibold ${statusClass(selectedVersionStatus)}`}
            >
              {statusLabel(selectedVersionStatus)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
