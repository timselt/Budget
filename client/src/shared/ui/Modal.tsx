import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import { useFocusTrap } from '../hooks/useFocusTrap'

const SIZE_CLASS: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnBackdropClick?: boolean
  closeOnEscape?: boolean
  initialFocusRef?: RefObject<HTMLElement | null>
  headerActions?: ReactNode
  footer?: ReactNode
  labelledBy?: string
  children: ReactNode
}

/**
 * Tüm modal/dialog kullanım noktaları için a11y-compliant primitive.
 *
 * Sağladıkları:
 * - role="dialog" + aria-modal + aria-labelledby/describedby
 * - Tab/Shift-Tab focus trap (useFocusTrap)
 * - Body scroll lock (useBodyScrollLock)
 * - Escape ile kapatma
 * - Backdrop click ile kapatma (opt-out)
 * - Portal mount → document.body
 * - Kapandığında trigger element'e focus restore
 *
 * Plan: docs/plans/2026-04-27-modal-consolidation-plan.md
 */
export function Modal(props: ModalProps) {
  const {
    open,
    onClose,
    title,
    description,
    size = 'md',
    closeOnBackdropClick = true,
    closeOnEscape = true,
    initialFocusRef,
    headerActions,
    footer,
    labelledBy,
    children,
  } = props

  const containerRef = useRef<HTMLDivElement | null>(null)
  const generatedId = useId()
  const titleId = labelledBy ?? `${generatedId}-title`
  const descriptionId = description ? `${generatedId}-description` : undefined

  useBodyScrollLock(open)
  useFocusTrap(open, containerRef, { initialFocusRef })

  useEffect(() => {
    if (!open || !closeOnEscape) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, closeOnEscape, onClose])

  if (!open) return null

  const handleBackdropClick = () => {
    if (closeOnBackdropClick) onClose()
  }

  const sizeClass = SIZE_CLASS[size]

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={`card w-full ${sizeClass}`}
        style={{ padding: 0 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-6 py-4">
          <div className="flex-1 min-w-0">
            <h3 id={titleId} className="text-lg font-bold text-on-surface truncate">
              {title}
            </h3>
            {description ? (
              <p
                id={descriptionId}
                className="text-sm text-on-surface-variant mt-0.5"
              >
                {description}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {headerActions}
            <button
              type="button"
              aria-label="Kapat"
              className="p-1 text-on-surface-variant hover:text-primary transition-colors"
              onClick={onClose}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div className={`px-6 ${footer ? 'pb-4' : 'pb-6'}`}>{children}</div>

        {footer ? (
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-surface-container-low">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
