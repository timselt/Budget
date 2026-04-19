import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '../../lib/api'
import { showToast } from '../shared/toast-bus'

interface Props {
  versionId: number
  onClose: () => void
  onSuccess: () => void
}

interface PreviewResult {
  totalRows: number
  validRows: number
  errorRows: number
  errors: Array<{
    rowNumber: number
    code: string
    message: string
  }>
  warnings: string[]
}

interface CommitResult {
  importedCount: number
  skippedCount: number
  warnings: string[]
}

const TEMPLATE_HEADERS = [
  'Müşteri',
  'Not',
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
] as const

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

  const downloadTemplate = () => {
    const sampleRow = [
      'Örnek Müşteri',
      '',
      '1000',
      '1000',
      '1000',
      '1000',
      '1000',
      '1000',
      '1000',
      '1000',
      '1000',
      '1000',
      '1000',
      '1000',
    ]
    const csv = [TEMPLATE_HEADERS.join(';'), sampleRow.join(';')].join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'butce-import-sablonu.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const downloadErrors = () => {
    if (!preview || preview.errors.length === 0) return
    const rows = [
      ['Satır', 'Kod', 'Mesaj'].join(';'),
      ...preview.errors.map((item) => [item.rowNumber, item.code, item.message].join(';')),
    ]
    const blob = new Blob([`\uFEFF${rows.join('\n')}`], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'butce-import-hatalari.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const previewMutation = useMutation({
    mutationFn: async (f: File) => {
      const form = new FormData()
      form.append('file', f)
      const { data } = await api.post<PreviewResult>(
        `/reports/budget/import/preview?versionId=${versionId}`,
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
      const { data } = await api.post<CommitResult>(
        `/reports/budget/import/commit?versionId=${versionId}`,
        form,
        {
        headers: { 'Content-Type': 'multipart/form-data' },
        },
      )
      return data
    },
    onSuccess: (result) => {
      showToast(
        `✓ ${result.importedCount} satır içe aktarıldı${result.skippedCount > 0 ? ` · ${result.skippedCount} satır atlandı` : ''}.`,
      )
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
          <div className="flex items-center gap-2">
            <button type="button" className="btn-secondary" onClick={downloadTemplate}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                download
              </span>
              Şablon İndir
            </button>
            <button
              type="button"
              className="text-on-surface-variant hover:text-on-surface"
              onClick={onClose}
              aria-label="Kapat"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-on-surface-variant mb-4">
          İlk sütunda müşteri adı, ikinci sütunda serbest not alanı, sonraki sütunlarda Ocak-Aralık tutarları olmalı.
        </p>

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
                className="btn-secondary"
                onClick={() => inputRef.current?.click()}
              >
                Farklı Dosya Seç
              </button>
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
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded border border-outline-variant/60 bg-surface-container-low px-3 py-2">
                    <div className="text-[11px] text-on-surface-variant uppercase tracking-wide">Toplam</div>
                    <div className="text-lg font-bold num">{preview.totalRows}</div>
                  </div>
                  <div className="rounded border border-success/20 bg-success-container/30 px-3 py-2">
                    <div className="text-[11px] text-success uppercase tracking-wide">Geçerli</div>
                    <div className="text-lg font-bold num text-success">{preview.validRows}</div>
                  </div>
                  <div className="rounded border border-error/20 bg-error-container/30 px-3 py-2">
                    <div className="text-[11px] text-error uppercase tracking-wide">Hatalı</div>
                    <div className="text-lg font-bold num text-error">{preview.errorRows}</div>
                  </div>
                </div>
                {preview.errorRows > 0 ? (
                  <p className="text-xs text-on-surface-variant">
                    Hatalı satırlar commit'te atlanır. Tüm satırlar için Excel'i düzeltin.
                  </p>
                ) : null}
                {preview.errors.length > 0 ? (
                  <div className="rounded border border-error/20 bg-error-container/30 p-3">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-xs font-semibold text-error">İlk hatalar</p>
                      <button type="button" className="btn-secondary" onClick={downloadErrors}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                          download
                        </span>
                        Hataları İndir
                      </button>
                    </div>
                    <ul className="space-y-1 text-xs text-on-surface">
                      {preview.errors.slice(0, 5).map((item) => (
                        <li key={`${item.rowNumber}-${item.code}`}>
                          Satır {item.rowNumber}: {item.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {preview.warnings.length > 0 ? (
                  <div className="rounded border border-warning/20 bg-warning-container/30 p-3">
                    <p className="text-xs font-semibold text-warning mb-2">Uyarılar</p>
                    <ul className="space-y-1 text-xs text-on-surface">
                      {preview.warnings.slice(0, 5).map((item, index) => (
                        <li key={`${index}-${item}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
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
            disabled={!preview || preview.validRows === 0 || commitMutation.isPending}
            onClick={() => commitMutation.mutate()}
          >
            {commitMutation.isPending ? 'Aktarılıyor…' : 'İçe Aktar'}
          </button>
        </div>
      </div>
    </div>
  )
}
