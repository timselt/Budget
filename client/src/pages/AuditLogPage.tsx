interface AuditRow {
  datetime: string
  user: string
  ip: string
  module: string
  action: 'update' | 'create' | 'approve' | 'import' | 'delete' | 'export'
  actionLabel: string
  oldValue: string
  newValue: string
}

const ACTION_CHIP: Record<AuditRow['action'], string> = {
  update: 'chip-info',
  create: 'chip-success',
  approve: 'chip-success',
  import: 'chip-success',
  delete: 'chip-error',
  export: 'chip-neutral',
}

const ROWS: readonly AuditRow[] = [
  { datetime: '17.04.2026 14:23:11', user: 'Timur Turan', ip: '10.12.4.22', module: 'Bütçe', action: 'update', actionLabel: 'UPDATE', oldValue: '98,0M', newValue: '112,0M' },
  { datetime: '17.04.2026 13:45:02', user: 'M. Yılmaz', ip: '10.12.8.14', module: 'Master Data', action: 'create', actionLabel: 'CREATE', oldValue: '-', newValue: 'Yeni hesap 600.04' },
  { datetime: '17.04.2026 11:02:49', user: 'A. Çelik', ip: '10.12.6.31', module: 'Onay', action: 'approve', actionLabel: 'APPROVE', oldValue: 'Pending', newValue: 'Approved' },
  { datetime: '17.04.2026 09:15:33', user: 'B. Ayhan', ip: '10.12.2.7', module: 'Forecast', action: 'update', actionLabel: 'UPDATE', oldValue: 'EBITDA 360M', newValue: 'EBITDA 378M' },
  { datetime: '16.04.2026 17:44:20', user: 'S. Özkan', ip: '10.12.9.5', module: 'Actual', action: 'import', actionLabel: 'IMPORT', oldValue: '-', newValue: 'ERP sync 18.462 kayıt' },
  { datetime: '16.04.2026 15:12:58', user: 'A. Koç', ip: '10.12.3.18', module: 'Master Data', action: 'delete', actionLabel: 'DELETE', oldValue: 'Hesap 740.99', newValue: '-' },
  { datetime: '16.04.2026 10:30:04', user: 'System', ip: '127.0.0.1', module: 'Rapor', action: 'export', actionLabel: 'EXPORT', oldValue: '-', newValue: 'YK Paketi PDF üretildi' },
]

export function AuditLogPage() {
  return (
    <section>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-on-surface">Audit Log</h2>
          <p className="text-sm text-on-surface-variant mt-2 max-w-2xl">
            Değişmez değişiklik kaydı — KVKK + SOC 2 + iç denetim gereksinimleri.
          </p>
        </div>
        <div className="flex gap-3">
          <select className="select">
            <option>Son 7 gün</option>
            <option>Son 30 gün</option>
            <option>Tüm</option>
          </select>
          <button type="button" className="btn-secondary">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              download
            </span>
            Dışa Aktar
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="tbl">
          <thead>
            <tr>
              <th>Tarih/Saat</th>
              <th>Kullanıcı</th>
              <th>IP</th>
              <th>Modül</th>
              <th>Aksiyon</th>
              <th>Eski Değer</th>
              <th>Yeni Değer</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={`${r.datetime}-${r.user}`}>
                <td className="font-mono text-xs">{r.datetime}</td>
                <td>{r.user}</td>
                <td className="font-mono text-xs">{r.ip}</td>
                <td>{r.module}</td>
                <td>
                  <span className={`chip ${ACTION_CHIP[r.action]}`}>{r.actionLabel}</span>
                </td>
                <td className={r.oldValue.includes('M') ? 'num' : ''}>{r.oldValue}</td>
                <td className={r.newValue.includes('M') ? 'num' : ''}>{r.newValue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
