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
      <header className="mb-12">
        <h1 className="font-headline text-4xl font-bold tracking-[-0.02em] text-sl-on-surface">
          Döviz Kurları
        </h1>
        <p className="font-body text-lg text-sl-on-surface-variant mt-2 max-w-2xl">
          TCMB kurları ve manuel giriş
        </p>
      </header>

      <div className="mb-12 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="fx-filter-date" className="mb-1 block font-body text-xs font-medium text-sl-on-surface-variant">
            Tarih
          </label>
          <input
            id="fx-filter-date"
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="rounded-md border border-sl-outline-variant/15 bg-sl-surface-lowest px-3 py-1.5 font-body text-sm text-sl-on-surface"
          />
        </div>

        <div>
          <label htmlFor="fx-filter-currency" className="mb-1 block font-body text-xs font-medium text-sl-on-surface-variant">
            Para Birimi
          </label>
          <select
            id="fx-filter-currency"
            value={filterCurrency}
            onChange={(e) => setFilterCurrency(e.target.value)}
            className="rounded-md border border-sl-outline-variant/15 bg-sl-surface-lowest px-3 py-1.5 font-body text-sm text-sl-on-surface"
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
          className="rounded-md bg-sl-primary px-4 py-1.5 font-body text-sm font-medium text-sl-on-primary transition-colors hover:bg-sl-primary-container disabled:opacity-50"
        >
          {syncMutation.isPending ? 'Senkronize ediliyor...' : 'TCMB Senkronize Et'}
        </button>

        {syncMutation.isSuccess && (
          <span className="font-body text-xs text-sl-on-tertiary-container">
            {syncMutation.data.syncedCount} kur senkronize edildi
          </span>
        )}

        {syncMutation.isError && (
          <span className="font-body text-xs text-sl-error">
            Senkronizasyon hatası
          </span>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-sl-error-container/30 p-3 font-body text-sm text-sl-error">
          Kurlar yüklenirken hata oluştu.
        </div>
      )}

      {isLoading ? (
        <p className="font-body text-sm text-sl-on-surface-variant">Yükleniyor...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-sl-surface-lowest shadow-[0_12px_32px_rgba(25,28,31,0.04)]">
          <table className="w-full font-body text-sm">
            <thead>
              <tr className="bg-sl-surface-low">
                <th className="px-4 py-2.5 text-left font-medium text-sl-on-surface-variant">Tarih</th>
                <th className="px-4 py-2.5 text-left font-medium text-sl-on-surface-variant">Para Birimi</th>
                <th className="px-4 py-2.5 text-right font-medium text-sl-on-surface-variant">Kur</th>
                <th className="px-4 py-2.5 text-left font-medium text-sl-on-surface-variant">Kaynak</th>
                <th className="px-4 py-2.5 text-center font-medium text-sl-on-surface-variant">Yıl Başı Sabit</th>
              </tr>
            </thead>
            <tbody>
              {rates?.map((rate: FxRate) => (
                <tr key={rate.id} className="transition-colors hover:bg-sl-surface-low/50">
                  <td className="px-4 py-2 text-sl-on-surface-variant">{formatDate(rate.rateDate)}</td>
                  <td className="px-4 py-2 font-medium text-sl-on-surface">{rate.currencyCode}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-sl-on-surface">{formatRate(rate.rateValue)}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      rate.source === 'TCMB'
                        ? 'bg-sl-primary-fixed text-sl-primary-container'
                        : 'bg-sl-surface-high text-sl-secondary'
                    }`}>
                      {sourceLabel(rate.source)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center text-sl-on-surface-variant">
                    {rate.isYearStartFixed ? 'Evet' : 'Hayır'}
                  </td>
                </tr>
              ))}
              {(!rates || rates.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sl-on-surface-variant">
                    Kur bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <section className="mt-12">
        <h2 className="mb-4 font-headline text-xl font-bold tracking-tight text-sl-on-surface">
          Manuel Kur Girişi
        </h2>

        <form onSubmit={handleManualSubmit} className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="manual-currency" className="mb-1 block font-body text-xs font-medium text-sl-on-surface-variant">
              Para Birimi
            </label>
            <select
              id="manual-currency"
              value={formCurrency}
              onChange={(e) => setFormCurrency(e.target.value)}
              className="rounded-md border border-sl-outline-variant/15 bg-sl-surface-lowest px-3 py-1.5 font-body text-sm text-sl-on-surface"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="manual-date" className="mb-1 block font-body text-xs font-medium text-sl-on-surface-variant">
              Tarih
            </label>
            <input
              id="manual-date"
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              required
              className="rounded-md border border-sl-outline-variant/15 bg-sl-surface-lowest px-3 py-1.5 font-body text-sm text-sl-on-surface"
            />
          </div>

          <div>
            <label htmlFor="manual-rate" className="mb-1 block font-body text-xs font-medium text-sl-on-surface-variant">
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
              className="w-32 rounded-md border border-sl-outline-variant/15 bg-sl-surface-lowest px-3 py-1.5 font-body text-sm text-sl-on-surface"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="manual-fixed"
              type="checkbox"
              checked={formFixed}
              onChange={(e) => setFormFixed(e.target.checked)}
              className="rounded border-sl-outline-variant/15"
            />
            <label htmlFor="manual-fixed" className="font-body text-xs font-medium text-sl-on-surface-variant">
              Yıl Başı Sabit Kur
            </label>
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-md bg-sl-primary px-4 py-1.5 font-body text-sm font-medium text-sl-on-primary transition-colors hover:bg-sl-primary-container disabled:opacity-50"
          >
            {createMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </button>

          {createMutation.isError && (
            <span className="font-body text-xs text-sl-error">Kaydetme hatası</span>
          )}

          {createMutation.isSuccess && (
            <span className="font-body text-xs text-sl-on-tertiary-container">Kur kaydedildi</span>
          )}
        </form>
      </section>
    </div>
  )
}
