import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '../../lib/api'

interface Props {
  versionId: number
  onClose: () => void
  onSuccess: () => void
}

interface PreviewRow {
  customerCode?: string
  customerName?: string
  month: number
  entryType: string
  amountOriginal: number
  currencyCode: string
  errors?: string[]
}

interface PreviewResult {
  rows: PreviewRow[]
  totalRowCount: number
  validRowCount: number
  errorRowCount: number
}

/**
 * Excel İçe Aktar akışı — /reports/budget/import/preview → /commit iki
 * adımlı pipeline. Preview'de validation sonucu gösterilir, commit ile
 * hedef version'a aktarılır.
 */
export function ExcelImportModal({ versionId, onClose, onSuccess }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const previewMutation = useMutation({
    mutationFn: async (f: File) => {
      const form = new FormData()
      form.append('file', f)
      form.append('versionId', String(versionId))
      const { data } = await api.post<PreviewResult>(
        '/reports/budget/import/preview',
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      return data
    },
    onSuccess: (r) => setPreview(r),
    onError: (e: unknown) =>
      setError(e instanceof Error ? e.message : 'Önizleme başarısız'),
  })

  const commitMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Dosya seçilmedi')
      const form = new FormData()
      form.append('file', file)
      form.append('versionId', String(versionId))
      await api.post('/reports/budget/import/commit', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => {
      onSuccess()
      onClose()
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'İçe aktarma başarısız'),
  })

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-on-surface">Excel İçe Aktar</h3>
          <button
            type="button"
            className="text-on-surface-variant hover:text-on-surface"
            onClick={onClose}
            aria-label="Kapat"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null
            setFile(f)
            setPreview(null)
            setError(null)
            if (f) previewMutation.mutate(f)
          }}
        />

        {!file ? (
          <button
            type="button"
            className="border-2 border-dashed border-outline rounded-lg p-8 w-full text-center hover:bg-surface-container-low"
            onClick={() => inputRef.current?.click()}
          >
            <span className="material-symbols-outlined block" style={{ fontSize: 36 }}>
              upload_file
            </span>
            <span className="block text-sm font-semibold mt-2">Excel dosyası seçin</span>
            <span className="block text-xs text-on-surface-variant">
              .xlsx veya .xls · Türkçe sabit başlıklar
            </span>
          </button>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-4 p-3 bg-surface-container-low rounded">
              <span className="material-symbols-outlined">description</span>
              <span className="flex-1 text-sm">{file.name}</span>
              <button
                type="button"
                className="text-on-surface-variant hover:text-error"
                onClick={() => {
                  setFile(null)
                  setPreview(null)
                  setError(null)
                }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {previewMutation.isPending ? (
              <p className="text-sm text-on-surface-variant">Önizleme hazırlanıyor…</p>
            ) : null}

            {preview ? (
              <div className="text-sm space-y-2">
                <p>
                  <strong>{preview.totalRowCount}</strong> satır okundu ·{' '}
                  <span className="text-success">
                    <strong>{preview.validRowCount}</strong> geçerli
                  </span>{' '}
                  ·{' '}
                  <span className="text-error">
                    <strong>{preview.errorRowCount}</strong> hatalı
                  </span>
                </p>
                {preview.errorRowCount > 0 ? (
                  <p className="text-xs text-on-surface-variant">
                    Hatalı satırlar commit'te atlanır. Tüm satırlar için Excel'i düzeltin.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        )}

        {error ? <p className="text-sm text-error mt-4">{error}</p> : null}

        <div className="flex justify-end gap-2 mt-6">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Vazgeç
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!preview || preview.validRowCount === 0 || commitMutation.isPending}
            onClick={() => commitMutation.mutate()}
          >
            {commitMutation.isPending ? 'Aktarılıyor…' : 'İçe Aktar'}
          </button>
        </div>
      </div>
    </div>
  )
}
