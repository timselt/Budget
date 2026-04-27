import { useEffect, type RefObject } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'

interface Options {
  initialFocusRef?: RefObject<HTMLElement | null>
  restoreFocus?: boolean
}

/**
 * Tab/Shift-Tab loop'unu container içine hapsederek modal/dialog için focus
 * trap sağlar. `active=true` olduğunda ilk focusable veya
 * `initialFocusRef.current` element'ine focus verir; deactivate edildiğinde
 * önceden focus'ta olan element'e geri döndürür.
 */
export function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  options: Options = {},
) {
  const { initialFocusRef, restoreFocus = true } = options

  useEffect(() => {
    if (!active) return

    const container = containerRef.current
    if (!container) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    const initial = initialFocusRef?.current
    if (initial) {
      initial.focus()
    } else {
      const first = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      first?.focus()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null)

      if (focusables.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const activeEl = document.activeElement as HTMLElement | null

      if (event.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          event.preventDefault()
          last.focus()
        }
      } else if (activeEl === last) {
        event.preventDefault()
        first.focus()
      }
    }

    container.addEventListener('keydown', handleKeyDown)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      if (restoreFocus && previouslyFocused?.focus) {
        previouslyFocused.focus()
      }
    }
  }, [active, containerRef, initialFocusRef, restoreFocus])
}
