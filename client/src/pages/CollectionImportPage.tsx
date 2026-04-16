import { useState, useCallback, useRef } from 'react'
import { useCollectionImport } from '../hooks/useCollectionImport'
import { useCollectionPeriods } from '../hooks/useCollectionPeriods'
import type { ImportPeriodStatus } from '../types/collections'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function StatusBadge({ status }: { status: ImportPeriodStatus }) {
  const styles: Record<ImportPeriodStatus, string> = {
    Completed: 'bg-sl-tertiary-container text-sl-tertiary',
    Processing: 'bg-amber-50 text-amber-700',
    Failed: 'bg-sl-error-container text-sl-error',
  }

  const labels: Record<ImportPeriodStatus, string> = {
    Completed: 'Tamamlandi',
    Processing: 'Isleniyor',
    Failed: 'Basarisiz',
  }

  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

const SEGMENTS = [
  { id: 1, name: 'Segment 1' },
  { id: 2, name: 'Segment 2' },
  { id: 3, name: 'Segment 3' },
  { id: 4, name: 'Segment 4' },
] as const

export function CollectionImportPage() {
  const [selectedSegment, setSelectedSegment] = useState<number>(SEGMENTS[0].id)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const importMutation = useCollectionImport()
  const { data: periods, isLoading: periodsLoading } = useCollectionPeriods()

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      setSelectedFile(file)
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
  }, [])

  const handleUpload = () => {
    if (!selectedFile) return
    importMutation.mutate(
      { segmentId: selectedSegment, file: selectedFile },
      {
        onSuccess: () => {
          setSelectedFile(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        },
      },
    )
  }

  return (
    <div>
      <header className="mb-10">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-sl-on-surface">
          Veri Yukle
        </h1>
        <p className="font-body text-sm text-sl-on-surface-variant">
          Excel dosyalarindan tahsilat verisi aktarimi
        </p>
      </header>

      <section className="mb-12">
        <div className="rounded-lg border border-sl-outline-variant/15 bg-sl-surface-lowest p-6">
          <div className="mb-5">
            <label
              htmlFor="segment-select"
              className="mb-1.5 block font-body text-xs font-medium uppercase tracking-wider text-sl-on-surface-variant"
            >
              Segment
            </label>
            <select
              id="segment-select"
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(Number(e.target.value))}
              className="w-full max-w-xs rounded-md border border-sl-outline-variant/30 bg-sl-surface-low px-3 py-2 font-body text-sm text-sl-on-surface outline-none transition-colors focus:border-sl-primary focus:ring-1 focus:ring-sl-primary"
            >
              {SEGMENTS.map((seg) => (
                <option key={seg.id} value={seg.id}>
                  {seg.name}
                </option>
              ))}
            </select>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 transition-colors ${
              isDragging
                ? 'border-sl-primary bg-sl-primary/5'
                : 'border-sl-outline-variant/30 hover:border-sl-outline-variant/60'
            }`}
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sl-surface-high">
              <span className="text-xl text-sl-on-surface-variant">+</span>
            </div>
            {selectedFile ? (
              <p className="font-body text-sm font-medium text-sl-on-surface">
                {selectedFile.name}
              </p>
            ) : (
              <>
                <p className="font-body text-sm font-medium text-sl-on-surface">
                  Dosya surukleyin veya tiklayarak secin
                </p>
                <p className="mt-1 font-body text-xs text-sl-on-surface-variant">
                  .xlsx, .xls dosya formatlarini destekler
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={handleUpload}
              disabled={!selectedFile || importMutation.isPending}
              className="rounded-lg bg-gradient-to-br from-sl-primary to-sl-secondary px-6 py-2.5 font-body text-sm font-medium text-white shadow-[var(--sl-shadow-sm)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importMutation.isPending ? 'Yukleniyor...' : 'Yukle'}
            </button>
            {selectedFile && (
              <button
                onClick={() => {
                  setSelectedFile(null)
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
                }}
                className="rounded-md px-3 py-2 font-body text-sm text-sl-on-surface-variant transition-colors hover:bg-sl-surface-high hover:text-sl-on-surface"
              >
                Iptal
              </button>
            )}
          </div>

          {importMutation.isSuccess && (
            <div className="mt-4 rounded-lg bg-sl-tertiary-container p-4">
              <p className="font-body text-sm font-medium text-sl-tertiary">
                Basariyla yuklendi: {importMutation.data.customersProcessed} musteri,{' '}
                {importMutation.data.invoicesProcessed} fatura islendi.
              </p>
              {Array.isArray(importMutation.data.warnings) &&
                importMutation.data.warnings.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {importMutation.data.warnings.map((warning, i) => (
                      <li
                        key={i}
                        className="font-body text-xs text-amber-700"
                      >
                        {warning}
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          )}

          {importMutation.isError && (
            <div className="mt-4 rounded-lg bg-sl-error-container/30 p-4">
              <p className="font-body text-sm text-sl-error">
                Yukleme basarisiz:{' '}
                {importMutation.error?.message ?? 'Bilinmeyen hata'}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 font-display text-lg font-medium text-sl-on-surface">
          Yukleme Gecmisi
        </h2>

        {periodsLoading && (
          <div className="flex h-32 items-center justify-center">
            <p className="font-body text-sl-on-surface-variant">Yukleniyor...</p>
          </div>
        )}

        {!periodsLoading && (!Array.isArray(periods) || periods.length === 0) && (
          <div className="rounded-lg border border-sl-outline-variant/15 bg-sl-surface-lowest p-8">
            <p className="text-center font-body text-sm text-sl-on-surface-variant">
              Henuz yukleme yapilmamis.
            </p>
          </div>
        )}

        {Array.isArray(periods) && periods.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-sl-outline-variant/15 bg-sl-surface-lowest">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-sl-outline-variant/15">
                  <th className="px-5 py-3 font-body text-xs font-medium uppercase tracking-wider text-sl-on-surface-variant">
                    Tarih
                  </th>
                  <th className="px-5 py-3 font-body text-xs font-medium uppercase tracking-wider text-sl-on-surface-variant">
                    Segment
                  </th>
                  <th className="px-5 py-3 font-body text-xs font-medium uppercase tracking-wider text-sl-on-surface-variant">
                    Dosya
                  </th>
                  <th className="px-5 py-3 text-right font-body text-xs font-medium uppercase tracking-wider text-sl-on-surface-variant">
                    Toplam
                  </th>
                  <th className="px-5 py-3 text-right font-body text-xs font-medium uppercase tracking-wider text-sl-on-surface-variant">
                    Vadesi Gecen
                  </th>
                  <th className="px-5 py-3 font-body text-xs font-medium uppercase tracking-wider text-sl-on-surface-variant">
                    Durum
                  </th>
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => (
                  <tr
                    key={period.id}
                    className="border-b border-sl-outline-variant/8 transition-colors hover:bg-sl-surface-high/50"
                  >
                    <td className="px-5 py-3 font-body text-sm text-sl-on-surface">
                      {formatDate(period.importDate)}
                    </td>
                    <td className="px-5 py-3 font-body text-sm text-sl-on-surface">
                      {period.segmentName}
                    </td>
                    <td className="px-5 py-3 font-body text-sm text-sl-on-surface-variant">
                      {period.fileName}
                    </td>
                    <td className="px-5 py-3 text-right font-body text-sm tabular-nums text-sl-on-surface">
                      {formatCurrency(period.totalAmount)}
                    </td>
                    <td className="px-5 py-3 text-right font-body text-sm tabular-nums text-sl-error">
                      {formatCurrency(period.overdueAmount)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={period.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
