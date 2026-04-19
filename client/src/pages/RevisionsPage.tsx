export function RevisionsPage() {
  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Revizyonlar</h1>
        <p className="page-subtitle">Bütçe revizyon akışı ve değişiklik geçmişi</p>
      </header>

      <div className="card mt-6 p-8 text-center">
        <span
          className="material-symbols-outlined text-primary"
          style={{ fontSize: 48 }}
        >
          schedule
        </span>
        <h2 className="mt-4 text-xl font-semibold">Yakında</h2>
        <p className="mt-2 text-on-surface-variant">
          Revizyon yönetimi bir sonraki sürümde devreye girecek. Şimdilik Bütçe
          Planlama → Versiyonlar sekmesinden versiyon geçmişine ulaşabilirsiniz.
        </p>
      </div>
    </div>
  )
}
