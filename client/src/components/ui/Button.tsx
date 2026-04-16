import { type ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'tertiary'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-br from-sl-primary to-sl-primary-container text-white shadow-[0_4px_12px_rgba(181,3,3,0.15)] hover:shadow-[0_8px_20px_rgba(181,3,3,0.25)] hover:brightness-110 active:scale-[0.97]',
  secondary:
    'bg-sl-secondary-container text-sl-on-secondary-container hover:bg-sl-secondary-container/80',
  tertiary:
    'bg-transparent text-sl-primary hover:bg-sl-surface-high',
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`rounded-md px-4 py-2 font-body text-sm font-medium transition-all duration-200 disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
