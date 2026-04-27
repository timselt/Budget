import { useEffect } from 'react'

let lockCount = 0
let originalOverflow: string | null = null

/**
 * Modal/drawer/popover açıkken body scroll'unu disable eder.
 * Birden fazla layer aynı anda lock isteyebilir; reference counting ile
 * son layer kapanana kadar lock kalır.
 */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return

    if (lockCount === 0) {
      originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    lockCount += 1

    return () => {
      lockCount -= 1
      if (lockCount === 0) {
        document.body.style.overflow = originalOverflow ?? ''
        originalOverflow = null
      }
    }
  }, [active])
}
