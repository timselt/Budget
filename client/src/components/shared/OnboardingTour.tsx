import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const STORAGE_KEY = 'finopstur-onboarding-completed-v1'

interface Step {
  title: string
  body: string
  href?: string
  hrefLabel?: string
}

const STEPS: Step[] = [
  {
    title: '👋 Hoş geldin',
    body:
      'FinOps Tur, çoklu kiracı bütçe planlama platformudur. Kısa bir tanıtım göstereyim — istediğin zaman atlayabilirsin.',
  },
  {
    title: '1. Önce bütçe yılı oluştur',
    body:
      'Bütçe Planlama → Versiyonlar tab → Yeni Yıl. Her yıl kendi sürümleriyle yönetilir.',
    href: '/budget/planning',
    hrefLabel: 'Bütçe Planlama →',
  },
  {
    title: '2. Yıl için taslak versiyon aç',
    body:
      'Yıl seçildikten sonra Yeni Versiyon → Taslak. Sadece Taslak ve Reddedilen versiyonlar düzenlenebilir.',
  },
  {
    title: '3. Tutarları gir',
    body:
      'Müşteri Odaklı Giriş tab\'ında her müşteri için aylık gelir/hasar planı doldur. İlerleme banner\'ı kaç müşteri tamamlandığını gösterir.',
  },
  {
    title: '4. Onaya gönder',
    body:
      'Tüm müşteriler tamam olunca Onaya Gönder butonu açılır. Akış: Taslak → Finans Kontrolünde → CFO Onayında → Yürürlükte.',
    href: '/approvals',
    hrefLabel: 'Onay Akışı →',
  },
  {
    title: '✓ Hazırsın',
    body:
      'Görev Merkezi (Dashboard üstü) sana sıradaki aksiyonu her zaman söyler. Yardım için her ekranda bağlam metni var.',
  },
]

export function OnboardingTour() {
  const [step, setStep] = useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY) === '1'
    if (!completed) setOpen(true)
  }, [])

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  if (!open) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm">
      <div className="card shadow-2xl border-l-4 border-l-primary">
        <div className="flex justify-between items-start mb-2">
          <h4 className="text-base font-bold text-on-surface">{current.title}</h4>
          <button
            type="button"
            className="text-on-surface-variant hover:text-on-surface"
            onClick={dismiss}
            title="Tanıtımı kapat"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              close
            </span>
          </button>
        </div>
        <p className="text-sm text-on-surface-variant mb-3">{current.body}</p>
        {current.href && current.hrefLabel ? (
          <Link
            to={current.href}
            className="text-xs text-primary inline-block mb-3"
            onClick={dismiss}
          >
            {current.hrefLabel}
          </Link>
        ) : null}
        <div className="flex justify-between items-center">
          <span className="text-xs text-on-surface-variant">
            {step + 1}/{STEPS.length}
          </span>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '.3rem .6rem', fontSize: '.7rem' }}
                onClick={() => setStep((s) => s - 1)}
              >
                ← Geri
              </button>
            )}
            {!isLast ? (
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '.3rem .6rem', fontSize: '.7rem' }}
                onClick={() => setStep((s) => s + 1)}
              >
                İleri →
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '.3rem .6rem', fontSize: '.7rem' }}
                onClick={dismiss}
              >
                ✓ Tamamla
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Admin ekranından "Tanıtımı tekrar göster" için reset. */
export function resetOnboardingTour() {
  localStorage.removeItem(STORAGE_KEY)
}
