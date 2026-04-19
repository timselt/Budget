import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

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

interface ExpenseCategoryRow {
  id: number
  code: string
  name: string
  classification: string
  isActive: boolean
}

interface ExpenseEntryRow {
  id: number
  versionId: number | null
  budgetYearId: number
  categoryId: number
  categoryName: string | null
  month: number
  entryType: 'BUDGET' | 'ACTUAL'
  amountOriginal: number
  currencyCode: string
  amountTryFixed: number
  amountTrySpot: number
}

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

const CLASSIFICATION_LABEL: Record<string, string> = {
  Technical: 'Teknik',
  General: 'Genel',
  Financial: 'Finansal',
  Extraordinary: 'Olağandışı',
}

const CLASSIFICATION_CHIP: Record<string, string> = {
  Technical: 'chip-error',
  General: 'chip-neutral',
  Financial: 'chip-info',
  Extraordinary: 'chip-warning',
}

async function getYears(): Promise<BudgetYearRow[]> {
  const { data } = await api.get<BudgetYearRow[]>('/budget/years')
  return data
}

async function getVersions(yearId: number): Promise<BudgetVersionRow[]> {
  const { data } = await api.get<BudgetVersionRow[]>(`/budget/years/${yearId}/versions`)
  return data
}

async function getCategories(): Promise<ExpenseCategoryRow[]> {
  const { data } = await api.get<ExpenseCategoryRow[]>('/expense-categories')
  return data
}

async function getExpenses(yearId: number, versionId: number): Promise<ExpenseEntryRow[]> {
  const { data } = await api.get<ExpenseEntryRow[]>(
    `/expenses/${yearId}/entries?versionId=${versionId}`,
  )
  return data
}

function formatAmount(value: number): string {
  return value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    const millions = value / 1_000_000
    return `${millions.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`
  }
  return formatAmount(value)
}

export function ActualsPage() {
  const [yearId, setYearId] = useState<number | null>(null)
  const [versionId, setVersionId] = useState<number | null>(null)

  const yearsQuery = useQuery({ queryKey: ['budget-years'], queryFn: getYears })
  const versionsQuery = useQuery({
    queryKey: ['budget-versions', yearId],
    queryFn: () => (yearId ? getVersions(yearId) : Promise.resolve([])),
    enabled: yearId !== null,
  })
  const categoriesQuery = useQuery({ queryKey: ['expense-categories'], queryFn: getCategories })
  const expensesQuery = useQuery({
    queryKey: ['expense-entries-actuals', yearId, versionId],
    queryFn: () => (yearId && versionId ? getExpenses(yearId, versionId) : Promise.resolve([])),
    enabled: yearId !== null && versionId !== null,
  })

  const years = yearsQuery.data ?? []
  const versions = versionsQuery.data ?? []
  const categories = categoriesQuery.data ?? []
  const allExpenses = expensesQuery.data ?? []
  const actuals = allExpenses.filter((e) => e.entryType === 'ACTUAL')
  const budgets = allExpenses.filter((e) => e.entryType === 'BUDGET')

  useEffect(() => {
    if (yearId === null && years.length > 0) setYearId(years[0].id)
  }, [years, yearId])

  useEffect(() => {
    if (versionId === null && versions.length > 0) setVersionId(versions[0].id)
    if (versions.length === 0) setVersionId(null)
  }, [versions, versionId])

  const actualByCategory = useMemo(() => {
    const map = new Map<number, { category: ExpenseCategoryRow | null; monthly: number[]; total: number }>()
    for (const e of actuals) {
      const cat = categories.find((c) => c.id === e.categoryId) ?? null
      const entry = map.get(e.categoryId) ?? {
        category: cat,
        monthly: Array.from({ length: 12 }, () => 0),
        total: 0,
      }
      entry.monthly[e.month - 1] += e.amountTryFixed
      entry.total += e.amountTryFixed
      map.set(e.categoryId, entry)
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [actuals, categories])

  const budgetTotalByCategory = useMemo(() => {
    const map = new Map<number, number>()
    for (const e of budgets) {
      map.set(e.categoryId, (map.get(e.categoryId) ?? 0) + e.amountTryFixed)
    }
    return map
  }, [budgets])

  const actualTotal = actuals.reduce((sum, e) => sum + e.amountTryFixed, 0)
  const budgetTotal = budgets.reduce((sum, e) => sum + e.amountTryFixed, 0)
  const usedPct = budgetTotal > 0 ? (actualTotal / budgetTotal) * 100 : 0

  const classificationTotals = useMemo(() => {
    const result: Record<string, number> = {}
    for (const row of actualByCategory) {
      const cls = row.category?.classification ?? 'Unknown'
      result[cls] = (result[cls] ?? 0) + row.total
    }
    return result
  }, [actualByCategory])

  return (
    <section>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-on-surface">Gerçekleşen</h2>
        </div>
      </div>

      <div className="card mb-4 flex flex-wrap items-center gap-3">
        <label className="label-sm">Yıl</label>
        <select
          className="select"
          value={yearId ?? ''}
          onChange={(e) => {
            setYearId(e.target.value === '' ? null : Number(e.target.value))
            setVersionId(null)
          }}
        >
          <option value="">—</option>
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              FY {y.year}
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

      <div className="grid grid-cols-12 gap-4 mb-6">
        <KpiCard title="Gerçekleşen Toplam" value={formatCompact(actualTotal)} subtitle="TRY" />
        <KpiCard title="Bütçe Toplam" value={formatCompact(budgetTotal)} subtitle="TRY" />
        <KpiCard
          title="Bütçe Kullanımı"
          value={`%${formatAmount(usedPct)}`}
          subtitle={usedPct > 100 ? 'Bütçe aşıldı' : 'Bütçe içinde'}
          chip={usedPct > 100 ? 'chip-error' : usedPct > 85 ? 'chip-warning' : 'chip-success'}
        />
        <KpiCard
          title="Kayıt Sayısı"
          value={`${actuals.length}`}
          subtitle={`${actualByCategory.length} kategori`}
        />
      </div>

      {Object.keys(classificationTotals).length > 0 ? (
        <div className="grid grid-cols-12 gap-4 mb-6">
          {Object.entries(classificationTotals).map(([cls, total]) => (
            <div key={cls} className="col-span-12 md:col-span-3 card">
              <span className={`chip ${CLASSIFICATION_CHIP[cls] ?? 'chip-neutral'}`}>
                {CLASSIFICATION_LABEL[cls] ?? cls}
              </span>
              <p className="text-2xl font-black tracking-display num mt-3">
                {formatCompact(total)}
              </p>
              <p className="text-xs text-on-surface-variant mt-1">Sınıflandırma toplamı</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-outline-variant flex items-center justify-between">
          <h3 className="text-base font-bold text-on-surface">Kategori × Ay Detayı</h3>
          <span className="text-xs text-on-surface-variant">TRY (sabit kur)</span>
        </div>
        {!versionId ? (
          <p className="p-6 text-sm text-on-surface-variant">
            Gerçekleşen tabloyu görmek için yıl ve versiyon seçin.
          </p>
        ) : expensesQuery.isLoading ? (
          <p className="p-6 text-sm text-on-surface-variant">Yükleniyor...</p>
        ) : actualByCategory.length === 0 ? (
          <p className="p-6 text-sm text-on-surface-variant">
            Bu versiyon için henüz gerçekleşen gider yok.{' '}
            <Link className="text-primary underline" to="/expenses">
              Gider Girişi
            </Link>{' '}
            sayfasından ACTUAL tipinde kayıt ekleyin.
          </p>
        ) : (
          <div className="max-h-[60vh] overflow-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ minWidth: 200 }}>Kategori</th>
                  <th>Sınıf</th>
                  {MONTHS.map((m) => (
                    <th key={m} className="text-right">
                      {m}
                    </th>
                  ))}
                  <th className="text-right bg-[#1e293b] text-white">Gerçek</th>
                  <th className="text-right">Bütçe</th>
                  <th className="text-right">Kullanım</th>
                </tr>
              </thead>
              <tbody>
                {actualByCategory.map(({ category, monthly, total }) => {
                  const budgetForCat = budgetTotalByCategory.get(category?.id ?? -1) ?? 0
                  const usage = budgetForCat > 0 ? (total / budgetForCat) * 100 : 0
                  const usageChip =
                    budgetForCat === 0
                      ? 'chip-neutral'
                      : usage > 100
                        ? 'chip-error'
                        : usage > 85
                          ? 'chip-warning'
                          : 'chip-success'
                  return (
                    <tr key={category?.id ?? 'unknown'}>
                      <td className="font-semibold">
                        {category?.name ?? 'Bilinmeyen kategori'}
                        {category?.code ? (
                          <span className="text-xs text-on-surface-variant ml-2 font-mono">
                            {category.code}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        {category ? (
                          <span className={`chip ${CLASSIFICATION_CHIP[category.classification] ?? 'chip-neutral'}`}>
                            {CLASSIFICATION_LABEL[category.classification] ?? category.classification}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      {monthly.map((value, i) => (
                        <td key={i} className="text-right num">
                          {value === 0 ? '—' : formatAmount(value)}
                        </td>
                      ))}
                      <td className="text-right num font-bold bg-surface-container-low">
                        {formatAmount(total)}
                      </td>
                      <td className="text-right num text-on-surface-variant">
                        {budgetForCat === 0 ? '—' : formatAmount(budgetForCat)}
                      </td>
                      <td className="text-right">
                        <span className={`chip ${usageChip}`}>
                          {budgetForCat === 0 ? '—' : `%${formatAmount(usage)}`}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

function KpiCard({
  title,
  value,
  subtitle,
  chip,
}: {
  title: string
  value: string
  subtitle: string
  chip?: string
}) {
  return (
    <div className="col-span-12 md:col-span-3 card">
      <div className="flex items-center gap-2">
        <span className="label-sm">{title}</span>
        {chip ? <span className={`chip ${chip}`} /> : null}
      </div>
      <p className="text-2xl font-black tracking-display num mt-2">{value}</p>
      <p className="text-xs text-on-surface-variant mt-1">{subtitle}</p>
    </div>
  )
}
