import { useState } from 'react'

interface Props {
  text: string
  children: React.ReactNode
  /** Tooltip pozisyonu — default 'top'. */
  placement?: 'top' | 'bottom' | 'right'
}

/**
 * Hafif Tailwind hover tooltip — eksternal lib yok.
 * a11y: focus ile de açılır (klavye kullanıcısı için).
 */
export function Tooltip({ text, children, placement = 'top' }: Props) {
  const [open, setOpen] = useState(false)
  const positionClass =
    placement === 'top'
      ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
      : placement === 'bottom'
        ? 'top-full left-1/2 -translate-x-1/2 mt-2'
        : 'left-full top-1/2 -translate-y-1/2 ml-2'

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={`absolute ${positionClass} z-50 px-2 py-1 rounded bg-on-surface text-surface-container-lowest text-xs whitespace-nowrap pointer-events-none shadow-lg max-w-xs`}
        >
          {text}
        </span>
      )}
    </span>
  )
}

/**
 * Help info ikonu + tooltip — bağlamsal mikro-yardım için.
 * Ekran etiketleri yanında küçük (i) sembolü.
 */
export function HelpHint({ text, placement }: { text: string; placement?: 'top' | 'bottom' | 'right' }) {
  return (
    <Tooltip text={text} placement={placement}>
      <span
        className="material-symbols-outlined text-on-surface-variant cursor-help align-middle ml-1"
        style={{ fontSize: 14 }}
        tabIndex={0}
        aria-label={text}
      >
        info
      </span>
    </Tooltip>
  )
}
