import type { ReactNode } from 'react'

type ChipVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral'

interface ChipProps {
  variant: ChipVariant
  children: ReactNode
  icon?: string
  className?: string
}

const VARIANT_CLASSES: Record<ChipVariant, string> = {
  success: 'bg-sl-success-container text-sl-success',
  warning: 'bg-sl-warning-container text-sl-warning',
  error: 'bg-sl-error-container text-sl-error',
  info: 'bg-sl-tertiary-container text-sl-tertiary',
  neutral: 'bg-sl-surface-container text-sl-on-surface-variant',
}

export function Chip({ variant, children, icon, className = '' }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {icon && (
        <span className="material-symbols-outlined text-[14px]">{icon}</span>
      )}
      {children}
    </span>
  )
}
