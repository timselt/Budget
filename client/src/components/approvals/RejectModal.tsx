import { useState, useRef, useEffect } from 'react'

interface RejectModalProps {
  isOpen: boolean
  versionName: string
  onConfirm: (reason: string) => void
  onCancel: () => void
  isLoading?: boolean
}

export function RejectModal({
  isOpen,
  versionName,
  onConfirm,
  onCancel,
  isLoading = false,
}: RejectModalProps) {
  const [reason, setReason] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) {
      setReason('')
      const timer = setTimeout(() => textareaRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isOpen) return null

  const canSubmit = reason.trim().length > 0 && !isLoading

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (canSubmit) {
      onConfirm(reason.trim())
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-modal-title"
    >
      <div
        className="mx-4 w-full max-w-md rounded-2xl border border-sl-outline-variant/15 bg-sl-surface-lowest p-6 shadow-[var(--sl-shadow-ambient)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="reject-modal-title"
          className="text-lg font-semibold text-text"
        >
          Versiyonu Reddet
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          <span className="font-medium text-text">{versionName}</span> versiyonu
          reddedilecek. Lütfen red gerekçenizi yazın.
        </p>

        <form onSubmit={handleSubmit} className="mt-4">
          <label htmlFor="reject-reason" className="sr-only">
            Red gerekçesi
          </label>
          <textarea
            ref={textareaRef}
            id="reject-reason"
            rows={4}
            required
            placeholder="Red gerekçesi (zorunlu)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full resize-none rounded-lg border border-sl-outline-variant/15 bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted/60 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
          />

          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="rounded-lg px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-alt disabled:opacity-50"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {isLoading ? 'Reddediliyor...' : 'Reddet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
