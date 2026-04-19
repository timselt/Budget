import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import {
  formatAmount,
  formatCompactAmount,
  formatPercent,
  formatSignedPercent,
} from '../lib/number-format'
import { METRIC_LABELS } from '../lib/metric-labels'
import { PageIntro } from '../components/shared/PageIntro'

interface BudgetYearRow {
  id: number
  year: number
  isLocked: boolean
}

interface BudgetVersionRow {
  id: number
  budgetYearId: number
  name: string
  status: string
  isActive: boolean
}

interface ScenarioRow {
  id: number
  name: string
  budgetVersionId: number
  parameters: {
    revenueChangePct: number
    claimsChangePct: number
    expenseChangePct: number
  }
  createdAt: string
}

interface ScenarioPnlResult {
  scenarioId: number
  scenarioName: string
  base: PnlLineItems
  scenario: PnlLineItems
  delta: PnlLineItems
}

interface PnlLineItems {
  totalRevenue: number
  totalClaims: number
  technicalMargin: number
  generalExpenses: number
  technicalExpenses: number
  technicalProfit: number
  financialIncome: number
  financialExpenses: number
  netProfit: number
  ebitda: number
  lossRatio: number
  combinedRatio: number
  profitRatio: number
}

interface ScenarioComparisonResult {
  base: PnlLineItems
  scenarios: ScenarioComparisonItem[]
}

interface ScenarioComparisonItem {
  scenarioId: number
  scenarioName: string
  parameters: {
    revenueChangePct: number
    claimsChangePct: number
    expenseChangePct: number
  }
  pnl: PnlLineItems
  delta: PnlLineItems
}

async function getYears(): Promise<BudgetYearRow[]> {
  const { data } = await api.get<BudgetYearRow[]>('/budget/years')
  return data
}

async function getVersions(yearId: number): Promise<BudgetVersionRow[]> {
  const { data } = await api.get<BudgetVersionRow[]>(`/budget/years/${yearId}/versions`)
  return data
}

async function getScenarios(versionId: number): Promise<ScenarioRow[]> {
  const { data } = await api.get<ScenarioRow[]>(`/scenarios?versionId=${versionId}`)
  return data
}

async function getScenarioPnl(scenarioId: number): Promise<ScenarioPnlResult> {
  const { data } = await api.get<ScenarioPnlResult>(`/scenarios/${scenarioId}/pnl`)
  return data
}

async function compareScenarios(scenarioIds: number[]): Promise<ScenarioComparisonResult> {
  const { data } = await api.post<ScenarioComparisonResult>('/scenarios/compare', {
    scenarioIds,
  })
  return data
}

export function ScenariosPage() {
  const [yearOverride, setYearOverride] = useState<number | null>(null)
  const [versionOverride, setVersionOverride] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [previewScenarioIdOverride, setPreviewScenarioIdOverride] = useState<number | null>(null)
  const [compareIdsOverride, setCompareIdsOverride] = useState<number[]>([])
  const queryClient = useQueryClient()

  const yearsQuery = useQuery({ queryKey: ['budget-years'], queryFn: getYears })

  const years = useMemo(() => yearsQuery.data ?? [], [yearsQuery.data])
  const yearId = useMemo(() => {
    if (yearOverride !== null && years.some((y) => y.id === yearOverride)) {
      return yearOverride
    }
    return years[0]?.id ?? null
  }, [yearOverride, years])

  const versionsQuery = useQuery({
    queryKey: ['budget-versions', yearId],
    queryFn: () => (yearId ? getVersions(yearId) : Promise.resolve([])),
    enabled: yearId !== null,
  })

  const versions = useMemo(() => versionsQuery.data ?? [], [versionsQuery.data])
  const versionId = useMemo(() => {
    if (versionOverride !== null && versions.some((v) => v.id === versionOverride)) {
      return versionOverride
    }
    return versions[0]?.id ?? null
  }, [versionOverride, versions])

  const scenariosQuery = useQuery({
    queryKey: ['scenarios', versionId],
    queryFn: () => (versionId ? getScenarios(versionId) : Promise.resolve([])),
    enabled: versionId !== null,
  })

  const scenarios = scenariosQuery.data ?? []
  const selectedYear = years.find((y) => y.id === yearId) ?? null
  const selectedVersion = versions.find((v) => v.id === versionId) ?? null
  const previewScenarioId = useMemo(() => {
    if (
      previewScenarioIdOverride !== null &&
      scenarios.some((scenario) => scenario.id === previewScenarioIdOverride)
    ) {
      return previewScenarioIdOverride
    }
    return scenarios[0]?.id ?? null
  }, [previewScenarioIdOverride, scenarios])

  const previewQuery = useQuery({
    queryKey: ['scenario-pnl-preview', previewScenarioId],
    queryFn: () =>
      previewScenarioId ? getScenarioPnl(previewScenarioId) : Promise.resolve(null),
    enabled: previewScenarioId !== null,
  })
  const compareIds = useMemo(() => {
    const validIds = compareIdsOverride.filter((id) =>
      scenarios.some((scenario) => scenario.id === id),
    )
    if (validIds.length === 2) return validIds
    return scenarios.slice(0, 2).map((scenario) => scenario.id)
  }, [compareIdsOverride, scenarios])

  const compareQuery = useQuery({
    queryKey: ['scenario-compare', compareIds],
    queryFn: () =>
      compareIds.length === 2 ? compareScenarios(compareIds) : Promise.resolve(null),
    enabled: compareIds.length === 2,
  })

  const setYearId = setYearOverride
  const setVersionId = setVersionOverride

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['scenarios', versionId] })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/scenarios/${id}`)
    },
    onSuccess: () => invalidate(),
  })

  return (
    <section>
      <PageIntro
        title="Senaryolar"
        purpose="Gelir/hasar/gider varsayımlarını % bazında değiştirerek bütçenin hassasiyet analizini yapın. Senaryolar baz bütçeyi değiştirmez — Dashboard ve raporlarda karşılaştırmalı görünür."
        context={
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className="chip chip-info">Baz bütçeyi değiştirmez</span>
            <span className="chip chip-neutral">Karşılaştırma ve hassasiyet analizi</span>
          </div>
        }
        actions={
          <button
            type="button"
            className="btn-primary"
            disabled={!versionId}
            onClick={() => setShowModal(true)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              add
            </span>
            Yeni Senaryo
          </button>
        }
      />

      <div className="card mb-4">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <div className="flex gap-3 flex-wrap items-center">
              <label className="label-sm">Yıl</label>
              <select
                className="select"
                value={yearId ?? ''}
                onChange={(e) => setYearId(e.target.value === '' ? null : Number(e.target.value))}
              >
                <option value="">—</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.year}
                  </option>
                ))}
              </select>
              <label className="label-sm">Versiyon</label>
              <select
                className="select"
                value={versionId ?? ''}
                onChange={(e) => setVersionId(e.target.value === '' ? null : Number(e.target.value))}
                disabled={!yearId}
              >
                <option value="">—</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} — {v.status}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-3 text-sm text-on-surface-variant">
              Bu ekranda oluşturduğunuz senaryolar, seçili versiyonun bütçesini
              değiştirmez. Ama yönetim ekranlarında ve raporlarda “eğer gelir artsa /
              hasar yükselse / gider düşse ne olur?” sorusuna cevap verir.
            </p>
          </div>

          <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Çalışma Bağlamı
            </p>
            <p className="mt-2 text-sm font-semibold text-on-surface">
              {selectedYear ? `FY ${selectedYear.year}` : 'Yıl seçilmedi'}
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">
              {selectedVersion
                ? `${selectedVersion.name} — ${selectedVersion.status}`
                : 'Versiyon seçilmedi'}
            </p>
            <div className="mt-3 flex gap-2 flex-wrap">
              <span className="chip chip-success">{scenarios.length} senaryo</span>
              <span className="chip chip-warning">En fazla 5</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="card">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary">looks_one</span>
            <div>
              <h3 className="text-sm font-semibold text-on-surface">Baz Bütçe Sabit Kalır</h3>
              <p className="mt-1 text-sm text-on-surface-variant">
                Senaryo, bütçe planlama ekranındaki hücreleri değiştirmez; sadece
                alternatif sonuç üretir.
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary">looks_two</span>
            <div>
              <h3 className="text-sm font-semibold text-on-surface">3 Kaldıraçla Çalışır</h3>
              <p className="mt-1 text-sm text-on-surface-variant">
                Gelir, hasar ve gider için yüzde değişim verirsiniz; sistem bunları
                seçili versiyonun KPI sonuçlarına uygular.
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary">looks_3</span>
            <div>
              <h3 className="text-sm font-semibold text-on-surface">En Doğru Kullanım</h3>
              <p className="mt-1 text-sm text-on-surface-variant">
                İyimser, baz ve kötümser gibi varyasyonlar oluşturup yönetim
                raporlarında hangisinin daha riskli olduğunu karşılaştırın.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-bold text-on-surface">Senaryo Listesi</h3>
          <p className="text-sm text-on-surface-variant mt-1">
            Aynı versiyon için oluşturduğunuz varsayım setleri burada tutulur.
          </p>
        </div>
        <span className="chip chip-neutral">Karşılaştırmaya hazır</span>
      </div>

      {previewScenarioId ? (
        <div className="card mb-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-base font-bold text-on-surface">Canlı Karşılaştırma Önizlemesi</h3>
              <p className="text-sm text-on-surface-variant mt-1">
                Seçili senaryonun baz bütçeye göre etkisini gerçek P&amp;L hesabıyla görün.
              </p>
            </div>
            <select
              className="select"
              value={previewScenarioId}
              onChange={(e) => setPreviewScenarioIdOverride(Number(e.target.value))}
            >
              {scenarios.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.name}
                </option>
              ))}
            </select>
          </div>

          {previewQuery.isLoading ? (
            <p className="mt-4 text-sm text-on-surface-variant">Önizleme hesaplanıyor...</p>
          ) : previewQuery.data ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
                <ScenarioMetricCard
                  label={METRIC_LABELS.ebitda}
                  base={previewQuery.data.base.ebitda}
                  scenario={previewQuery.data.scenario.ebitda}
                  delta={previewQuery.data.delta.ebitda}
                  kind="amount"
                />
                <ScenarioMetricCard
                  label={METRIC_LABELS.netProfit}
                  base={previewQuery.data.base.netProfit}
                  scenario={previewQuery.data.scenario.netProfit}
                  delta={previewQuery.data.delta.netProfit}
                  kind="amount"
                />
                <ScenarioMetricCard
                  label={METRIC_LABELS.lossRatio}
                  base={previewQuery.data.base.lossRatio}
                  scenario={previewQuery.data.scenario.lossRatio}
                  delta={previewQuery.data.delta.lossRatio}
                  kind="ratio"
                />
                <ScenarioMetricCard
                  label={METRIC_LABELS.combinedRatio}
                  base={previewQuery.data.base.combinedRatio}
                  scenario={previewQuery.data.scenario.combinedRatio}
                  delta={previewQuery.data.delta.combinedRatio}
                  kind="ratio"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                <MiniDeltaCard
                  title="Gelir Etkisi"
                  value={previewQuery.data.delta.totalRevenue}
                  help="Gelir varsayımının baz bütçeye göre yarattığı toplam fark."
                />
                <MiniDeltaCard
                  title="Hasar Etkisi"
                  value={previewQuery.data.delta.totalClaims}
                  help="Hasar varsayımının baz bütçeye göre yarattığı toplam fark."
                />
                <MiniDeltaCard
                  title="Teknik Marj Etkisi"
                  value={previewQuery.data.delta.technicalMargin}
                  help="Gelir ve hasar varsayımlarının birlikte teknik marja etkisi."
                />
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {compareIds.length === 2 ? (
        <div className="card mb-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-base font-bold text-on-surface">Yan Yana Senaryo Karşılaştırması</h3>
              <p className="text-sm text-on-surface-variant mt-1">
                İki senaryonun baz bütçeye göre etkisini aynı tabloda kıyaslayın.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <select
                className="select"
                value={compareIds[0]}
                onChange={(e) => {
                  const next = Number(e.target.value)
                  setCompareIdsOverride([next, compareIds[1]])
                }}
              >
                {scenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.name}
                  </option>
                ))}
              </select>
              <select
                className="select"
                value={compareIds[1]}
                onChange={(e) => {
                  const next = Number(e.target.value)
                  setCompareIdsOverride([compareIds[0], next])
                }}
              >
                {scenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {compareQuery.isLoading ? (
            <p className="mt-4 text-sm text-on-surface-variant">Karşılaştırma hazırlanıyor...</p>
          ) : compareQuery.data ? (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
                {compareQuery.data.scenarios.map((scenario) => (
                  <ScenarioCompareCard key={scenario.scenarioId} item={scenario} />
                ))}
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Metrik</th>
                      <th className="text-right">Baz</th>
                      {compareQuery.data.scenarios.map((scenario) => (
                        <th key={scenario.scenarioId} className="text-right">
                          {scenario.scenarioName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <CompareRow
                      label={METRIC_LABELS.ebitda}
                      base={compareQuery.data.base.ebitda}
                      values={compareQuery.data.scenarios.map((scenario) => scenario.pnl.ebitda)}
                      kind="amount"
                    />
                    <CompareRow
                      label={METRIC_LABELS.netProfit}
                      base={compareQuery.data.base.netProfit}
                      values={compareQuery.data.scenarios.map((scenario) => scenario.pnl.netProfit)}
                      kind="amount"
                    />
                    <CompareRow
                      label={METRIC_LABELS.lossRatio}
                      base={compareQuery.data.base.lossRatio}
                      values={compareQuery.data.scenarios.map((scenario) => scenario.pnl.lossRatio)}
                      kind="ratio"
                    />
                    <CompareRow
                      label={METRIC_LABELS.combinedRatio}
                      base={compareQuery.data.base.combinedRatio}
                      values={compareQuery.data.scenarios.map((scenario) => scenario.pnl.combinedRatio)}
                      kind="ratio"
                    />
                    <CompareRow
                      label={METRIC_LABELS.technicalMargin}
                      base={compareQuery.data.base.technicalMargin}
                      values={compareQuery.data.scenarios.map((scenario) => scenario.pnl.technicalMargin)}
                      kind="amount"
                    />
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="card p-0 overflow-hidden">
        {!versionId ? (
          <p className="p-6 text-sm text-on-surface-variant">
            Senaryo eklemek için önce yıl ve versiyon seçin.
          </p>
        ) : scenariosQuery.isLoading ? (
          <p className="p-6 text-sm text-on-surface-variant">Yükleniyor...</p>
        ) : scenarios.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-on-surface-variant">
              Bu versiyon için henüz senaryo yok. "Yeni Senaryo" ile iyimser, baz
              veya kötümser varsayımlar oluşturabilirsiniz.
            </p>
            <div className="mt-4 flex gap-2 flex-wrap">
              <span className="chip chip-success">İyimser</span>
              <span className="chip chip-neutral">Baz</span>
              <span className="chip chip-warning">Kötümser</span>
            </div>
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Ad</th>
                <th className="text-right">Gelir Δ%</th>
                <th className="text-right">Hasar Δ%</th>
                <th className="text-right">Gider Δ%</th>
                <th>Oluşturuldu</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s) => (
                <tr key={s.id}>
                  <td className="font-semibold">{s.name}</td>
                  <td className="text-right num">
                    {formatPct(s.parameters.revenueChangePct)}
                  </td>
                  <td className="text-right num">
                    {formatPct(s.parameters.claimsChangePct)}
                  </td>
                  <td className="text-right num">
                    {formatPct(s.parameters.expenseChangePct)}
                  </td>
                  <td className="text-xs text-on-surface-variant">
                    {new Date(s.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="p-1 text-on-surface-variant hover:text-error transition-colors"
                      title="Sil"
                      onClick={() => {
                        if (confirm(`"${s.name}" senaryosu silinecek. Emin misiniz?`)) {
                          deleteMutation.mutate(s.id)
                        }
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                        delete
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && versionId ? (
        <ScenarioModal
          versionId={versionId}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            invalidate()
            setShowModal(false)
          }}
        />
      ) : null}
    </section>
  )
}

function formatPct(value: number): string {
  return formatSignedPercent(value)
}

function ScenarioMetricCard({
  label,
  base,
  scenario,
  delta,
  kind,
}: {
  label: string
  base: number
  scenario: number
  delta: number
  kind: 'amount' | 'ratio'
}) {
  const deltaChipClass =
    delta > 0 ? 'chip-success' : delta < 0 ? 'chip-error' : 'chip-neutral'

  return (
    <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black text-on-surface num">
            {kind === 'amount'
              ? formatCompactAmount(scenario)
              : formatPercent(scenario * 100, 1)}
          </p>
        </div>
        <span className={`chip ${deltaChipClass}`}>
          {kind === 'amount'
            ? formatSignedAmount(delta)
            : formatSignedPercent(delta * 100, 1)}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-on-surface-variant">Baz</p>
          <p className="font-semibold text-on-surface num">
            {kind === 'amount'
              ? formatCompactAmount(base)
              : formatPercent(base * 100, 1)}
          </p>
        </div>
        <div>
          <p className="text-on-surface-variant">Senaryo</p>
          <p className="font-semibold text-on-surface num">
            {kind === 'amount'
              ? formatCompactAmount(scenario)
              : formatPercent(scenario * 100, 1)}
          </p>
        </div>
      </div>
    </div>
  )
}

function MiniDeltaCard({
  title,
  value,
  help,
}: {
  title: string
  value: number
  help: string
}) {
  const chipClass =
    value > 0 ? 'chip-success' : value < 0 ? 'chip-error' : 'chip-neutral'

  return (
    <div className="rounded-xl border border-outline-variant/60 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-on-surface">{title}</p>
          <p className="text-xs text-on-surface-variant mt-1">{help}</p>
        </div>
        <span className={`chip ${chipClass}`}>{formatSignedAmount(value)}</span>
      </div>
      <p className="mt-4 text-xl font-black text-on-surface num">
        {formatAmount(value)}
      </p>
    </div>
  )
}

function formatSignedAmount(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${formatCompactAmount(value)}`
}

function ScenarioCompareCard({ item }: { item: ScenarioComparisonItem }) {
  return (
    <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-bold text-on-surface">{item.scenarioName}</h4>
          <p className="text-sm text-on-surface-variant mt-1">
            Gelir {formatSignedPercent(item.parameters.revenueChangePct)} ·
            Hasar {formatSignedPercent(item.parameters.claimsChangePct)} ·
            Gider {formatSignedPercent(item.parameters.expenseChangePct)}
          </p>
        </div>
        <span className={`chip ${item.delta.netProfit >= 0 ? 'chip-success' : 'chip-error'}`}>
          {METRIC_LABELS.netProfit} {formatSignedAmount(item.delta.netProfit)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="rounded-lg bg-white p-3">
          <p className="text-xs text-on-surface-variant uppercase tracking-wide">{METRIC_LABELS.ebitda}</p>
          <p className="mt-2 text-lg font-black text-on-surface num">
            {formatCompactAmount(item.pnl.ebitda)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-3">
          <p className="text-xs text-on-surface-variant uppercase tracking-wide">{METRIC_LABELS.combinedRatio}</p>
          <p className="mt-2 text-lg font-black text-on-surface num">
            {formatPercent(item.pnl.combinedRatio * 100, 1)}
          </p>
        </div>
      </div>
    </div>
  )
}

function CompareRow({
  label,
  base,
  values,
  kind,
}: {
  label: string
  base: number
  values: number[]
  kind: 'amount' | 'ratio'
}) {
  return (
    <tr>
      <td className="font-semibold">{label}</td>
      <td className="text-right num">
        {kind === 'amount' ? formatCompactAmount(base) : formatPercent(base * 100, 1)}
      </td>
      {values.map((value, index) => (
        <td key={`${label}-${index}`} className="text-right num">
          {kind === 'amount' ? formatCompactAmount(value) : formatPercent(value * 100, 1)}
        </td>
      ))}
    </tr>
  )
}

interface ScenarioPreset {
  id: 'optimistic' | 'base' | 'pessimistic' | 'custom'
  label: string
  emoji: string
  description: string
  revenue: number
  claims: number
  expense: number
  defaultName: string
}

const SCENARIO_PRESETS: ReadonlyArray<ScenarioPreset> = [
  {
    id: 'optimistic',
    label: 'İyimser',
    emoji: '🟢',
    description: 'Pazar büyümesi + hasar kontrolü + maliyet disiplini',
    revenue: 10,
    claims: -5,
    expense: -3,
    defaultName: 'İyimser Senaryo',
  },
  {
    id: 'base',
    label: 'Baz (Plan)',
    emoji: '🟡',
    description: 'Mevcut plan varsayımları — değişiklik yok',
    revenue: 0,
    claims: 0,
    expense: 0,
    defaultName: 'Baz Senaryo',
  },
  {
    id: 'pessimistic',
    label: 'Kötümser',
    emoji: '🔴',
    description: 'Resesyon + hasar artışı + maliyet baskısı',
    revenue: -10,
    claims: 15,
    expense: 5,
    defaultName: 'Kötümser Senaryo',
  },
  {
    id: 'custom',
    label: 'Özel',
    emoji: '⚙️',
    description: 'Kendi varsayımlarınızı manuel girin',
    revenue: 0,
    claims: 0,
    expense: 0,
    defaultName: '',
  },
]

function ScenarioModal({
  versionId,
  onClose,
  onSaved,
}: {
  versionId: number
  onClose: () => void
  onSaved: () => void
}) {
  const [presetId, setPresetId] = useState<ScenarioPreset['id']>('base')
  const [name, setName] = useState('Baz Senaryo')
  const [revenue, setRevenue] = useState(0)
  const [claims, setClaims] = useState(0)
  const [expense, setExpense] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const selectPreset = (preset: ScenarioPreset) => {
    setPresetId(preset.id)
    setName(preset.defaultName)
    setRevenue(preset.revenue)
    setClaims(preset.claims)
    setExpense(preset.expense)
  }

  // Mini etki özeti — kullanıcı varsayımları değiştirdikçe canlı hesap.
  // Net etki tahmini = gelir - hasar - gider (basitleştirilmiş net marj
  // delta, pp cinsinden). Gerçek backend sonucu /scenarios/{id}/pnl'den.
  const netImpactPp = revenue - claims - expense

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/scenarios', {
        name: name.trim(),
        versionId,
        parameters: {
          revenueChangePct: revenue,
          claimsChangePct: claims,
          expenseChangePct: expense,
        },
      })
    },
    onSuccess: () => onSaved(),
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Oluşturulamadı'),
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-lg"
        style={{ padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="text-lg font-bold text-on-surface">Yeni Senaryo</h3>
          <button
            type="button"
            className="p-1 text-on-surface-variant hover:text-primary transition-colors"
            onClick={onClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form
          className="grid grid-cols-3 gap-4 px-6 pb-6"
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            mutation.mutate()
          }}
        >
          <div className="col-span-3 rounded-xl border border-outline-variant/60 bg-surface-container-low p-3 text-sm text-on-surface-variant">
            Bu ekran baz bütçeyi değiştirmez. Girdiğiniz yüzdeler, seçili versiyonun
            KPI ve P&amp;L sonuçlarına alternatif görünüm olarak uygulanır.
          </div>
          <div className="col-span-3">
            <span className="label-sm block mb-2">Hızlı Başlangıç</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {SCENARIO_PRESETS.map((preset) => {
                const selected = presetId === preset.id
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => selectPreset(preset)}
                    className={`text-left p-2 rounded-lg border transition-colors ${
                      selected
                        ? 'border-primary bg-primary/5'
                        : 'border-outline-variant hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="text-sm font-semibold flex items-center gap-1">
                      <span aria-hidden>{preset.emoji}</span>
                      {preset.label}
                    </div>
                    <p className="text-[0.65rem] text-on-surface-variant mt-1">
                      {preset.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          <label className="block col-span-3">
            <span className="label-sm block mb-1.5">Senaryo Adı</span>
            <input
              className="input w-full"
              value={name}
              required
              maxLength={100}
              placeholder="Ör: Optimistic, Resesyon, Volatil Kur"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="label-sm block mb-1.5">Gelir Δ%</span>
            <input
              type="number"
              step="0.1"
              className="input w-full"
              value={revenue}
              onChange={(e) => {
                setRevenue(Number(e.target.value))
                setPresetId('custom')
              }}
            />
          </label>
          <label className="block">
            <span className="label-sm block mb-1.5">Hasar Δ%</span>
            <input
              type="number"
              step="0.1"
              className="input w-full"
              value={claims}
              onChange={(e) => {
                setClaims(Number(e.target.value))
                setPresetId('custom')
              }}
            />
          </label>
          <label className="block">
            <span className="label-sm block mb-1.5">Gider Δ%</span>
            <input
              type="number"
              step="0.1"
              className="input w-full"
              value={expense}
              onChange={(e) => {
                setExpense(Number(e.target.value))
                setPresetId('custom')
              }}
            />
          </label>

          {/* Mini etki özeti — kullanıcı değişimi anlık görür. */}
          <div
            className={`col-span-3 rounded-lg p-3 border-l-4 ${
              netImpactPp > 5
                ? 'bg-success/5 border-l-success'
                : netImpactPp < -5
                  ? 'bg-error/5 border-l-error'
                  : 'bg-surface-container-low border-l-on-surface-variant'
            }`}
          >
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Tahmini Net Etki (Marj Δpp)
            </p>
            <p className="text-2xl font-black num mt-1">
              {netImpactPp > 0 ? '+' : ''}
              {netImpactPp.toFixed(1)} pp
            </p>
            <p className="text-xs text-on-surface-variant mt-1">
              Gelir Δ − Hasar Δ − Gider Δ. Backend gerçek P&L hesabını
              /scenarios/&#123;id&#125;/pnl'den döner.
            </p>
          </div>

          {error ? <p className="col-span-3 text-sm text-error">{error}</p> : null}

          <div className="col-span-3 flex gap-2 justify-end mt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Vazgeç
            </button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Oluşturuluyor…' : 'Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
