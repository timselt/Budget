import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { BudgetYearRow } from './types'
import { copyFromYear, growByPercent } from './api'
import type { CopyFromYearResult, GrowByPercentResult } from './api'

interface CommonProps {
  versionId: number
  customerId: number | null
  onClose: () => void
  onSuccess: () => void
}

export function CopyFromYearModal({
  versionId,
  customerId,
  years,
  currentYearId,
  onClose,
  onSuccess,
}: CommonProps & { years: BudgetYearRow[]; currentYearId: number | null }) {
  const otherYears = years.filter((y) => y.id !== currentYearId)
  const [sourceYearId, setSourceYearId] = useState<number | null>(otherYears[0]?.id ?? null)
  const [includeOnlyThisCustomer, setIncludeOnlyThisCustomer] = useState(customerId != null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CopyFromYearResult | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      if (sourceYearId == null) throw new Error('Kaynak yıl seçin')
      return copyFromYear(versionId, {
        sourceBudgetYearId: sourceYearId,
        customerId: includeOnlyThisCustomer ? customerId : null,
      })
    },
    onSuccess: (r) => {
      setResult(r)
      onSuccess()
    },
    onError: (e: unknown) => {
      setError(e instanceof Error ? e.message : 'Kopyalama başarısız')
    },
  })

  return (
    <ModalShell title="Geçen Yıl Kopyala" onClose={onClose}>
      <label className="label-sm">Kaynak Yıl</label>
      <select
        className="select w-full"
        value={sourceYearId ?? ''}
        onChange={(e) => setSourceYearId(e.target.value === '' ? null : Number(e.target.value))}
      >
        <option value="">—</option>
        {otherYears.map((y) => (
          <option key={y.id} value={y.id}>
            FY {y.year}
            {y.isLocked ? ' (kilitli)' : ''}
          </option>
        ))}
      </select>

      {customerId != null ? (
        <label className="flex items-center gap-2 mt-4 text-sm">
          <input
            type="checkbox"
            checked={includeOnlyThisCustomer}
            onChange={(e) => setIncludeOnlyThisCustomer(e.target.checked)}
          />
          Sadece seçili müşteri için kopyala
        </label>
      ) : null}

      <p className="text-xs text-on-surface-variant mt-4">
        Kaynak yılın <strong>ACTIVE</strong> versiyonu esas alınır. Hedef versiyondaki çakışan
        satırlar <strong>üzerine yazılır</strong>. FX hedef yılın kurlarıyla yeniden hesaplanır.
      </p>

      {error ? <p className="text-sm text-error mt-4">{error}</p> : null}
      {result ? (
        <p className="text-sm text-success mt-4">
          {result.copiedEntryCount} yeni, {result.overwrittenEntryCount} güncellenen satır
          kopyalandı.
        </p>
      ) : null}

      <div className="flex justify-end gap-2 mt-6">
        <button type="button" className="btn-secondary" onClick={onClose}>
          {result ? 'Kapat' : 'Vazgeç'}
        </button>
        {!result ? (
          <button
            type="button"
            className="btn-primary"
            disabled={sourceYearId == null || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Kopyalanıyor…' : 'Kopyala'}
          </button>
        ) : null}
      </div>
    </ModalShell>
  )
}

export function GrowByPercentModal({
  versionId,
  customerId,
  onClose,
  onSuccess,
}: CommonProps) {
  const [percent, setPercent] = useState('10')
  const [includeOnlyThisCustomer, setIncludeOnlyThisCustomer] = useState(customerId != null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GrowByPercentResult | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const pct = Number(percent.replace(',', '.'))
      if (!Number.isFinite(pct)) throw new Error('Yüzde değeri geçersiz')
      if (pct < -99 || pct > 200) throw new Error('Yüzde -99 ile 200 arasında olmalı')
      return growByPercent(versionId, {
        percent: pct,
        customerId: includeOnlyThisCustomer ? customerId : null,
      })
    },
    onSuccess: (r) => {
      setResult(r)
      onSuccess()
    },
    onError: (e: unknown) => {
      setError(e instanceof Error ? e.message : 'Büyütme başarısız')
    },
  })

  return (
    <ModalShell title="+%X Büyüt / Küçült" onClose={onClose}>
      <label className="label-sm">Yüzde (negatif küçültür)</label>
      <div className="flex items-center gap-2">
        <input
          className="input w-32"
          inputMode="decimal"
          value={percent}
          onChange={(e) => setPercent(e.target.value)}
        />
        <span className="text-on-surface-variant">%</span>
      </div>

      {customerId != null ? (
        <label className="flex items-center gap-2 mt-4 text-sm">
          <input
            type="checkbox"
            checked={includeOnlyThisCustomer}
            onChange={(e) => setIncludeOnlyThisCustomer(e.target.checked)}
          />
          Sadece seçili müşteri için uygula
        </label>
      ) : null}

      <p className="text-xs text-on-surface-variant mt-4">
        AmountOriginal değeri <code>× (1 + %/100)</code> ile çarpılır, FX yeniden hesaplanır.
        Aralık: -99 ile 200 arasında.
      </p>

      {error ? <p className="text-sm text-error mt-4">{error}</p> : null}
      {result ? (
        <p className="text-sm text-success mt-4">
          {result.updatedEntryCount} satır güncellendi.
        </p>
      ) : null}

      <div className="flex justify-end gap-2 mt-6">
        <button type="button" className="btn-secondary" onClick={onClose}>
          {result ? 'Kapat' : 'Vazgeç'}
        </button>
        {!result ? (
          <button
            type="button"
            className="btn-primary"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Uygulanıyor…' : 'Uygula'}
          </button>
        ) : null}
      </div>
    </ModalShell>
  )
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-on-surface">{title}</h3>
          <button
            type="button"
            className="text-on-surface-variant hover:text-on-surface"
            onClick={onClose}
            aria-label="Kapat"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
