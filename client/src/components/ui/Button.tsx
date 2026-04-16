import { type ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'tertiary'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-sl-primary to-sl-primary-container text-white hover:opacity-90',
  secondary:
    'bg-sl-surface-high text-sl-on-surface hover:bg-sl-surface-low',
  tertiary:
    'bg-transparent text-sl-primary hover:bg-sl-surface-low',
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`rounded-md px-4 py-2 font-body text-sm font-medium transition-colors disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
