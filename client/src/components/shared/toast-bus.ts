export interface ToastState {
  id: number
  message: string
  level: 'success' | 'error'
}

let nextId = 1
const listeners: Array<(t: ToastState) => void> = []

export function subscribeToast(handler: (t: ToastState) => void): () => void {
  listeners.push(handler)
  return () => {
    const i = listeners.indexOf(handler)
    if (i >= 0) listeners.splice(i, 1)
  }
}

/**
 * Tetikleyici — herhangi bir bileşenden çağrılabilir.
 *   showToast('Kayıt başarılı.', 'success')
 *   showToast('Hata oluştu.', 'error')
 */
export function showToast(message: string, level: 'success' | 'error' = 'success') {
  const t: ToastState = { id: nextId++, message, level }
  for (const l of listeners) l(t)
}
