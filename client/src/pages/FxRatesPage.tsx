import { useState, type FormEvent } from 'react'
import { useFxRates, useCreateManualRate, useSyncTcmb } from '../hooks/useFxRates'
import type { FxRate } from '../hooks/useFxRates'

const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP'] as const

function formatRate(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR')
}

function sourceLabel(source: string): string {
  switch (source) {
    case 'TCMB':
      return 'TCMB'
    case 'MANUAL':
      return 'Manuel'
    default:
      return source
  }
}

export function FxRatesPage() {
  const [filterDate, setFilterDate] = useState('')
  const [filterCurrency, setFilterCurrency] = useState('')

  const { data: rates, isLoading, error } = useFxRates(
    filterDate || undefined,
    filterCurrency || undefined,
  )

  const syncMutation = useSyncTcmb()
  const createMutation = useCreateManualRate()

  const [formCurrency, setFormCurrency] = useState<string>('USD')
  const [formDate, setFormDate] = useState('')
  const [formRate, setFormRate] = useState('')
  const [formFixed, setFormFixed] = useState(false)

  function handleManualSubmit(e: FormEvent) {
    e.preventDefault()

    if (!formDate || !formRate) return

    createMutation.mutate({
      currencyCode: formCurrency,
      rateDate: formDate,
      rateValue: parseFloat(formRate),
      isYearStartFixed: formFixed,
    })
  }

  function handleSync() {
    syncMutation.mutate(filterDate || undefined)
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Döviz Kurları</h1>
        <p className="text-sm text-text-muted">
          TCMB kurları ve manuel giriş
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="fx-filter-date" className="block text-xs font-medium text-text-muted mb-1">
            Tarih
          </label>
          <input
            id="fx-filter-date"
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm"
          />
        </div>

        <div>
          <label htmlFor="fx-filter-currency" className="block text-xs font-medium text-text-muted mb-1">
            Para Birimi
          </label>
          <select
            id="fx-filter-currency"
            value={filterCurrency}
            onChange={(e) => setFilterCurrency(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm"
          >
            <option value="">Tümü</option>
            {CURRENCY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleSync}
          disabled={syncMutation.isPending}
          className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {syncMutation.isPending ? 'Senkronize ediliyor...' : 'TCMB Senkronize Et'}
        </button>

        {syncMutation.isSuccess && (
          <span className="text-xs text-green-600">
            {syncMutation.data.syncedCount} kur senkronize edildi
          </span>
        )}

        {syncMutation.isError && (
          <span className="text-xs text-red-600">
            Senkronizasyon hatası
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Kurlar yüklenirken hata oluştu.
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-text-muted">Yükleniyor...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-elevated">
                <th className="px-4 py-2.5 text-left font-medium text-text-muted">Tarih</th>
                <th className="px-4 py-2.5 text-left font-medium text-text-muted">Para Birimi</th>
                <th className="px-4 py-2.5 text-right font-medium text-text-muted">Kur</th>
                <th className="px-4 py-2.5 text-left font-medium text-text-muted">Kaynak</th>
                <th className="px-4 py-2.5 text-center font-medium text-text-muted">Yıl Başı Sabit</th>
              </tr>
            </thead>
            <tbody>
              {rates?.map((rate: FxRate) => (
                <tr key={rate.id} className="border-b border-border last:border-b-0 hover:bg-surface-elevated/50 transition-colors">
                  <td className="px-4 py-2">{formatDate(rate.rateDate)}</td>
                  <td className="px-4 py-2 font-medium">{rate.currencyCode}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatRate(rate.rateValue)}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      rate.source === 'TCMB'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {sourceLabel(rate.source)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    {rate.isYearStartFixed ? 'Evet' : 'Hayır'}
                  </td>
                </tr>
              ))}
              {(!rates || rates.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                    Kur bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Manuel Kur Girişi</h2>

        <form onSubmit={handleManualSubmit} className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="manual-currency" className="block text-xs font-medium text-text-muted mb-1">
              Para Birimi
            </label>
            <select
              id="manual-currency"
              value={formCurrency}
              onChange={(e) => setFormCurrency(e.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="manual-date" className="block text-xs font-medium text-text-muted mb-1">
              Tarih
            </label>
            <input
              id="manual-date"
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              required
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="manual-rate" className="block text-xs font-medium text-text-muted mb-1">
              Kur Değeri
            </label>
            <input
              id="manual-rate"
              type="number"
              step="0.0001"
              min="0"
              value={formRate}
              onChange={(e) => setFormRate(e.target.value)}
              required
              placeholder="0.0000"
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm w-32"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="manual-fixed"
              type="checkbox"
              checked={formFixed}
              onChange={(e) => setFormFixed(e.target.checked)}
              className="rounded border-border"
            />
            <label htmlFor="manual-fixed" className="text-xs font-medium text-text-muted">
              Yıl Başı Sabit Kur
            </label>
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </button>

          {createMutation.isError && (
            <span className="text-xs text-red-600">Kaydetme hatası</span>
          )}

          {createMutation.isSuccess && (
            <span className="text-xs text-green-600">Kur kaydedildi</span>
          )}
        </form>
      </section>
    </div>
  )
}
