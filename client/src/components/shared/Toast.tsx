import { useEffect, useState } from 'react'

interface ToastState {
  id: number
  message: string
  level: 'success' | 'error'
}

let nextId = 1
const listeners: Array<(t: ToastState) => void> = []

/**
 * Tetikleyici — herhangi bir bileşenden çağrılabilir.
 *   showToast('Kayıt başarılı.', 'success')
 *   showToast('Hata oluştu.', 'error')
 */
export function showToast(message: string, level: 'success' | 'error' = 'success') {
  const t: ToastState = { id: nextId++, message, level }
  for (const l of listeners) l(t)
}

/**
 * App köküne yerleştirilen container. setTimeout ile 3 sn sonra kaybolur.
 * a11y: role="status" aria-live="polite" — screen reader için.
 */
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastState[]>([])

  useEffect(() => {
    const handler = (t: ToastState) => {
      setToasts((prev) => [...prev, t])
      setTimeout(
        () => setToasts((prev) => prev.filter((p) => p.id !== t.id)),
        3000,
      )
    }
    listeners.push(handler)
    return () => {
      const i = listeners.indexOf(handler)
      if (i >= 0) listeners.splice(i, 1)
    }
  }, [])

  return (
    <div
      className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-md shadow-lg max-w-sm pointer-events-auto text-sm font-medium ${
            t.level === 'success'
              ? 'bg-success text-white'
              : 'bg-error text-white'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
