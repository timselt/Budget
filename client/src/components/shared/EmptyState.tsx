import type { ReactNode } from 'react'

interface EmptyStateProps {
  /** Material Symbols icon adı (örn. 'inbox', 'calendar_add_on'). */
  icon: string
  title: string
  description?: string
  /** Tek primary CTA. Link veya button JSX (PageIntro'nın action prop'u
   *  gibi opaque). */
  cta?: ReactNode
  /** Outer card padding'ini override etmek istersen. Default p-8. */
  className?: string
}

/**
 * Standart boş durum kartı — "henüz X yok / nasıl başlanır?" pattern'ı.
 * Audit Sprint 2/3: liste ekranlarında ham tablo yerine eğitici boş
 * durum + CTA. Mevcut ad-hoc `<div className="p-8 text-center">...`
 * blokları bu component'le değiştirilir.
 */
export function EmptyState({
  icon,
  title,
  description,
  cta,
  className = 'p-8 text-center',
}: EmptyStateProps) {
  return (
    <div className={className}>
      <span
        className="material-symbols-outlined text-on-surface-variant"
        style={{ fontSize: 48 }}
        aria-hidden
      >
        {icon}
      </span>
      <p className="text-base font-semibold text-on-surface mt-3">{title}</p>
      {description && (
        <p className="text-sm text-on-surface-variant mt-1 max-w-md mx-auto">
          {description}
        </p>
      )}
      {cta && <div className="mt-4 inline-flex">{cta}</div>}
    </div>
  )
}
