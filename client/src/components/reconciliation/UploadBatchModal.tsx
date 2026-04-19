import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  uploadBatch,
  type ReconciliationFlow,
  type ReconciliationSourceType,
  type BatchDetail,
} from './api'

interface Props {
  defaultFlow?: ReconciliationFlow
  onClose: () => void
  onSuccess: (detail: BatchDetail) => void
}

interface FormErrors {
  file?: string
  periodCode?: string
  flow?: string
  sourceType?: string
  server?: string
}

const PERIOD_REGEX = /^(20\d{2})-(0[1-9]|1[0-2])$/

/**
 * Sprint 1 — Yeni mutabakat batch upload modal'ı (spec §6.1-6.2).
 * Form alanları: file + flow + period_code + source_type + opsiyonel notes.
 * Server-side validation hataları (duplicate, unreadable) i18n key'lere
 * map'lenir; UI Türkçe default + EN mirror.
 */
export function UploadBatchModal({ defaultFlow, onClose, onSuccess }: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [file, setFile] = useState<File | null>(null)
  const [flow, setFlow] = useState<ReconciliationFlow>(defaultFlow ?? 'Insurance')
  const [periodCode, setPeriodCode] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [sourceType, setSourceType] = useState<ReconciliationSourceType>(
    flow === 'Insurance' ? 'InsurerList' : 'TarsPowerBi',
  )
  const [notes, setNotes] = useState<string>('')
  const [errors, setErrors] = useState<FormErrors>({})

  // ESC ile kapatma
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Flow değişimi → varsayılan source type
  useEffect(() => {
    if (flow === 'Insurance' && sourceType === 'TarsPowerBi') {
      setSourceType('InsurerList')
    } else if (flow === 'Automotive' && sourceType === 'InsurerList') {
      setSourceType('TarsPowerBi')
    }
  }, [flow, sourceType])

  const mutation = useMutation({
    mutationFn: uploadBatch,
    onSuccess: (detail) => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-batches'] })
      onSuccess(detail)
    },
    onError: (err: unknown) => {
      const e = err as {
        response?: {
          status?: number
          data?: { detail?: string; existing_batch_id?: number; title?: string }
        }
      }
      const status = e?.response?.status
      const detail = e?.response?.data?.detail
      const existingId = e?.response?.data?.existing_batch_id

      if (status === 409 && existingId) {
        setErrors({
          server: t('reconciliation.upload.duplicateError', { existingBatchId: existingId }),
        })
      } else if (status === 422) {
        setErrors({ server: t('reconciliation.upload.readError') })
      } else {
        setErrors({ server: detail ?? t('errors.unexpected') })
      }
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next: FormErrors = {}
    if (!file) next.file = t('reconciliation.upload.validation.fileRequired')
    if (!PERIOD_REGEX.test(periodCode)) {
      next.periodCode = t('reconciliation.upload.validation.periodFormat')
    }
    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }
    setErrors({})
    mutation.mutate({
      file: file!,
      flow,
      periodCode,
      sourceType,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-xl"
        style={{ padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h3 className="text-lg font-bold text-on-surface">
            {t('reconciliation.upload.modalTitle')}
          </h3>
          <button
            type="button"
            className="p-1 text-on-surface-variant hover:text-primary transition-colors"
            onClick={onClose}
            aria-label={t('reconciliation.upload.cancel')}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form className="grid grid-cols-2 gap-4 px-6 py-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="label-sm block mb-1.5">
              {t('reconciliation.upload.stepFlow')}
            </span>
            <select
              className="select w-full"
              value={flow}
              onChange={(e) => setFlow(e.target.value as ReconciliationFlow)}
              disabled={mutation.isPending}
            >
              <option value="Insurance">{t('reconciliation.batchList.flow.insurance')}</option>
              <option value="Automotive">{t('reconciliation.batchList.flow.automotive')}</option>
            </select>
          </label>

          <label className="block">
            <span className="label-sm block mb-1.5">
              {t('reconciliation.upload.stepSource')}
            </span>
            <select
              className="select w-full"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as ReconciliationSourceType)}
              disabled={mutation.isPending}
            >
              <option value="InsurerList">
                {t('reconciliation.batchList.sourceType.insurerList')}
              </option>
              <option value="TarsPowerBi">
                {t('reconciliation.batchList.sourceType.tarsPowerBi')}
              </option>
              <option value="ManualCsv">
                {t('reconciliation.batchList.sourceType.manualCsv')}
              </option>
            </select>
          </label>

          <label className="block col-span-2">
            <span className="label-sm block mb-1.5">
              {t('reconciliation.upload.stepPeriod')}
            </span>
            <input
              type="text"
              className="input w-full"
              placeholder="2026-04"
              value={periodCode}
              onChange={(e) => setPeriodCode(e.target.value)}
              maxLength={7}
              disabled={mutation.isPending}
            />
            {errors.periodCode && (
              <p className="text-xs text-error mt-1">{errors.periodCode}</p>
            )}
          </label>

          <label className="block col-span-2">
            <span className="label-sm block mb-1.5">
              {t('reconciliation.upload.stepFile')}
            </span>
            <input
              type="file"
              className="input w-full"
              accept=".xlsx,.csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={mutation.isPending}
            />
            <p className="text-xs text-on-surface-variant mt-1">
              {t('reconciliation.upload.fileHint')}
            </p>
            {errors.file && <p className="text-xs text-error mt-1">{errors.file}</p>}
          </label>

          <label className="block col-span-2">
            <span className="label-sm block mb-1.5">
              {t('reconciliation.upload.stepNotes')}
            </span>
            <textarea
              className="input w-full"
              rows={2}
              maxLength={1000}
              value={notes}
              placeholder={t('reconciliation.upload.notesPlaceholder')}
              onChange={(e) => setNotes(e.target.value)}
              disabled={mutation.isPending}
            />
          </label>

          {errors.server && (
            <p className="col-span-2 text-sm text-error border-l-4 border-l-error pl-3 py-2 bg-error/5 rounded">
              {errors.server}
            </p>
          )}

          <div className="col-span-2 flex gap-2 justify-end mt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              {t('reconciliation.upload.cancel')}
            </button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending
                ? t('reconciliation.upload.submitting')
                : t('reconciliation.upload.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
