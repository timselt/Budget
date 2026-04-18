import { useState } from 'react'

/**
 * Üst bar — sadece bildirim + yardım. Şirket/yıl/senaryo ve arama
 * filtreleri ilgili sayfaların içine taşındı (global bar kaldırıldı).
 */
export function TopNavBar() {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)

  return (
    <header className="fixed top-0 left-64 right-0 z-40 h-16 px-6 flex items-center justify-end gap-2 bg-white/80 backdrop-blur-md shadow-[0_1px_0_rgba(25,28,31,0.04)]">
      <button
        type="button"
        className="text-on-surface-variant hover:text-primary transition-all relative"
        title="Bildirimler"
        onClick={() => {
          setIsNotificationsOpen((value) => !value)
          setIsHelpOpen(false)
        }}
      >
        <span className="material-symbols-outlined">notifications</span>
        <span className="absolute top-0 right-0 w-2 h-2 bg-primary-container rounded-full" />
      </button>
      <button
        type="button"
        className="text-on-surface-variant hover:text-primary transition-all"
        title="Yardım"
        onClick={() => {
          setIsHelpOpen((value) => !value)
          setIsNotificationsOpen(false)
        }}
      >
        <span className="material-symbols-outlined">help_outline</span>
      </button>

      {isNotificationsOpen ? (
        <div className="absolute right-20 top-14 w-80 card-floating p-4">
          <p className="label-sm">Bildirimler</p>
          <p className="text-sm font-semibold text-on-surface mt-2">Henüz yeni bildirim yok</p>
          <p className="text-xs text-on-surface-variant mt-1">
            Onay akışı veya sapma alarmları burada listelenecek.
          </p>
        </div>
      ) : null}

      {isHelpOpen ? (
        <div className="absolute right-6 top-14 w-80 card-floating p-4">
          <p className="label-sm">Yardım</p>
          <p className="text-sm font-semibold text-on-surface mt-2">Hızlı kullanım</p>
          <p className="text-xs text-on-surface-variant mt-1">
            Her sayfanın kendi filtresi ve arama çubuğu vardır; sol menüden hızlıca geçiş yapın.
          </p>
          <p className="text-sm font-semibold text-on-surface mt-3">Kısayollar</p>
          <p className="text-xs text-on-surface-variant mt-1">
            Bütçe Planlama sayfasında A = Hiyerarşik, C = Müşteri Odaklı giriş.
          </p>
        </div>
      ) : null}
    </header>
  )
}
