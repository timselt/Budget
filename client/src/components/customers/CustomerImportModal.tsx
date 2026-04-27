import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '../../lib/api'
import { showToast } from '../shared/toast-bus'
import { Modal } from '../../shared/ui/Modal'

interface Props {
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

export function CustomerImportModal({ onClose, onSuccess }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const previewMutation = useMutation({
    mutationFn: async (selectedFile: File) => {
      const form = new FormData()
      form.append('file', selectedFile)
      const { data } = await api.post<PreviewResult>(
        '/customers/import/preview',
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      return data
    },
    onSuccess: (result) => setPreview(result),
    onError: (e: unknown) =>
      setError(e instanceof Error ? e.message : 'Önizleme hazırlanamadı.'),
  })

  const commitMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Dosya seçilmedi')
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post<CommitResult>(
        '/customers/import/commit',
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      return data
    },
    onSuccess: (result) => {
      showToast(
        `✓ ${result.importedCount} müşteri eklendi${result.skippedCount > 0 ? ` · ${result.skippedCount} kayıt atlandı` : ''}.`,
      )
      onSuccess()
      onClose()
    },
    onError: (e: unknown) =>
      setError(e instanceof Error ? e.message : 'İçe aktarma başarısız.'),
  })

  const downloadTemplate = () => {
    const csv = [
      ['Kod', 'Firma Adi', 'Kategori', 'Kaynak Sayfa', 'Gelir Satiri', 'Hasar Satiri'].join(';'),
      ['ORNEK', 'Örnek Müşteri', 'Sigorta', 'Butce 2026', '5', '66'].join(';'),
    ].join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'musteri-import-sablonu.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const canCommit =
    !!file &&
    !!preview &&
    preview.validRows > 0 &&
    preview.errorRows === 0 &&
    !commitMutation.isPending

  return (
    <Modal
      open
      onClose={onClose}
      title="Müşteri Excel İçe Aktar"
      description="Excel'de en az şu kolonlar olmalı: Kod, Firma Adi, Kategori. Kategori değerleri: Sigorta, Otomotiv, Filo, Alternatif."
      size="lg"
      headerActions={
        <button type="button" className="btn-secondary" onClick={downloadTemplate}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            download
          </span>
          Şablon İndir
        </button>
      }
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Vazgeç
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!canCommit}
            onClick={() => commitMutation.mutate()}
          >
            {commitMutation.isPending ? 'İçe aktarılıyor…' : 'Müşterileri İçe Aktar'}
          </button>
        </>
      }
    >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const selected = e.target.files?.[0] ?? null
            setFile(selected)
            setPreview(null)
            setError(null)
            if (selected) previewMutation.mutate(selected)
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
            <span className="block text-sm font-semibold mt-2">Müşteri Excel dosyası seçin</span>
            <span className="block text-xs text-on-surface-variant">.xlsx veya .xls</span>
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-surface-container-low rounded">
              <span className="material-symbols-outlined">description</span>
              <span className="flex-1 text-sm">{file.name}</span>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => inputRef.current?.click()}
              >
                Farklı Dosya Seç
              </button>
            </div>

            {previewMutation.isPending ? (
              <p className="text-sm text-on-surface-variant">Önizleme hazırlanıyor…</p>
            ) : null}

            {preview ? (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-3 gap-3">
                  <StatCard title="Toplam" value={preview.totalRows} tone="neutral" />
                  <StatCard title="İçe Aktarılabilir" value={preview.validRows} tone="success" />
                  <StatCard title="Hatalı" value={preview.errorRows} tone="error" />
                </div>

                {preview.warnings.length > 0 ? (
                  <div className="rounded border border-warning/20 bg-warning-container/25 p-3">
                    <p className="text-xs font-semibold text-on-surface mb-1">Uyarılar</p>
                    <ul className="space-y-1 text-xs text-on-surface-variant">
                      {preview.warnings.slice(0, 8).map((warning) => (
                        <li key={warning}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {preview.errors.length > 0 ? (
                  <div className="rounded border border-error/20 bg-error-container/30 p-3">
                    <p className="text-xs font-semibold text-error mb-1">Hatalar</p>
                    <ul className="space-y-1 text-xs text-on-surface-variant">
                      {preview.errors.slice(0, 8).map((item) => (
                        <li key={`${item.rowNumber}-${item.code}`}>
                          • Satır {item.rowNumber}: {item.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            {error ? <p className="text-sm text-error">{error}</p> : null}
          </div>
        )}
    </Modal>
  )
}

function StatCard({
  title,
  value,
  tone,
}: {
  title: string
  value: number
  tone: 'neutral' | 'success' | 'error'
}) {
  const toneClass =
    tone === 'success'
      ? 'border-success/20 bg-success-container/30'
      : tone === 'error'
        ? 'border-error/20 bg-error-container/30'
        : 'border-outline-variant/60 bg-surface-container-low'

  return (
    <div className={`rounded border px-3 py-2 ${toneClass}`}>
      <div className="text-[11px] text-on-surface-variant uppercase tracking-wide">{title}</div>
      <div className="text-lg font-bold num">{value}</div>
    </div>
  )
}
