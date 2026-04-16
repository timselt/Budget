import { type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, id, className = '', ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          className="mb-2 block font-body text-xs uppercase tracking-wider text-sl-on-surface-variant"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full rounded-md bg-sl-surface-high px-3 py-2.5 font-body text-sm text-sl-on-surface outline-none transition-all focus:bg-sl-surface-lowest focus:ring-2 focus:ring-sl-primary/40 ${className}`}
        {...props}
      />
    </div>
  )
}
