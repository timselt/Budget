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
        className={`w-full border-b border-sl-outline-variant/40 bg-transparent px-0 py-2 font-body text-sm text-sl-on-surface outline-none transition-colors focus:border-b-2 focus:border-sl-primary ${className}`}
        {...props}
      />
    </div>
  )
}
