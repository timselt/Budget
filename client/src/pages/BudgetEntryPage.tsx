import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { COMPANIES, SCENARIOS, YEARS, useAppContextStore } from '../stores/appContext'

type BudgetMode = 'tree' | 'customer'
type SegmentId = 'sigorta' | 'otomotiv' | 'filo' | 'alternatif'

interface FirmBudget {
  id: string
  code: string
  name: string
  contract: string
  commission: number
  revenue: number[]
  claims: number[]
}

interface SegmentBudget {
  id: SegmentId
  label: string
  chipClass: string
  colorClass: string
  firms: FirmBudget[]
}

interface OpexItem {
  id: string
  name: string
  values: number[]
}

interface YearOption {
  value: string
  label: string
  revenueFactor: number
  claimFactor: number
  opexFactor: number
}

interface VersionOption {
  value: string
  label: string
  revenueFactor: number
  claimFactor: number
  opexFactor: number
}

interface ScenarioOption {
  value: string
  label: string
  revenueFactor: number
  claimFactor: number
  opexFactor: number
}

type TreeSelection =
  | { kind: 'firm'; segmentId: SegmentId; firmId: string }
  | { kind: 'opex'; itemId: string }

const MONTHS = ['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara']

const SEGMENTS: SegmentBudget[] = [
  {
    id: 'sigorta',
    label: 'Sigorta Sirketleri',
    chipClass: 'chip-error',
    colorClass: 'bg-[#b50303]',
    firms: [
      {
        id: 'anadolu',
        code: 'ANADOLU',
        name: 'Anadolu Sigorta A.S.',
        contract: '01.01.2026 - 31.12.2026',
        commission: 12,
        revenue: [8.5, 8.63, 8.68, 8.8, 8.95, 9.18, 9.1, 9.51, 9.6, 9.62, 9.97, 9.86],
        claims: [5.35, 5.4, 5.52, 5.63, 5.8, 5.96, 5.91, 6.08, 6.15, 6.14, 6.31, 6.24],
      },
      {
        id: 'sompo',
        code: 'SOMPO',
        name: 'Sompo Sigorta',
        contract: '01.01.2026 - 31.12.2026',
        commission: 11.5,
        revenue: [9.12, 9.21, 9.35, 9.41, 9.58, 9.66, 9.84, 9.92, 10.05, 10.16, 10.28, 10.34],
        claims: [5.98, 6.01, 6.13, 6.22, 6.3, 6.36, 6.52, 6.61, 6.67, 6.71, 6.82, 6.89],
      },
      {
        id: 'aksigorta',
        code: 'AKSIGORTA',
        name: 'AK Sigorta',
        contract: '01.01.2026 - 31.12.2026',
        commission: 10.8,
        revenue: [7.4, 7.52, 7.61, 7.7, 7.88, 8.02, 8.14, 8.22, 8.35, 8.44, 8.58, 8.71],
        claims: [4.86, 4.92, 4.98, 5.02, 5.16, 5.25, 5.33, 5.4, 5.52, 5.61, 5.71, 5.8],
      },
    ],
  },
  {
    id: 'otomotiv',
    label: 'Otomotiv Sirketleri',
    chipClass: 'chip-info',
    colorClass: 'bg-[#005b9f]',
    firms: [
      {
        id: 'togg',
        code: 'TOGG',
        name: 'TOGG',
        contract: '01.02.2026 - 31.12.2026',
        commission: 8.2,
        revenue: [4.9, 5.2, 5.45, 5.6, 5.8, 6.05, 6.18, 6.22, 6.28, 6.34, 6.41, 6.52],
        claims: [2.91, 3.05, 3.18, 3.26, 3.34, 3.49, 3.58, 3.62, 3.67, 3.71, 3.76, 3.84],
      },
      {
        id: 'toyota',
        code: 'TOYOTA',
        name: 'Toyota',
        contract: '01.01.2026 - 31.12.2026',
        commission: 7.6,
        revenue: [3.22, 3.28, 3.35, 3.4, 3.48, 3.54, 3.6, 3.66, 3.71, 3.77, 3.81, 3.86],
        claims: [1.86, 1.91, 1.95, 2.01, 2.07, 2.1, 2.14, 2.18, 2.22, 2.26, 2.31, 2.34],
      },
    ],
  },
  {
    id: 'filo',
    label: 'Filo Sirketleri',
    chipClass: 'chip-success',
    colorClass: 'bg-[#006d3e]',
    firms: [
      {
        id: 'otokoc',
        code: 'OTOKOC',
        name: 'Otokoc - AVIS',
        contract: '01.01.2026 - 31.12.2026',
        commission: 9.4,
        revenue: [2.4, 2.48, 2.5, 2.52, 2.59, 2.63, 2.68, 2.7, 2.74, 2.79, 2.81, 2.85],
        claims: [1.31, 1.34, 1.38, 1.41, 1.45, 1.49, 1.53, 1.56, 1.58, 1.62, 1.64, 1.66],
      },
      {
        id: 'enterprise',
        code: 'ENTERPRISE',
        name: 'Enterprise',
        contract: '01.01.2026 - 31.12.2026',
        commission: 9.1,
        revenue: [1.2, 1.18, 1.24, 1.31, 1.29, 1.36, 1.41, 1.39, 1.42, 1.46, 1.49, 1.52],
        claims: [0.76, 0.72, 0.8, 0.84, 0.82, 0.88, 0.93, 0.91, 0.95, 0.98, 1, 1.03],
      },
    ],
  },
  {
    id: 'alternatif',
    label: 'Alternatif Kanallar',
    chipClass: 'chip-warning',
    colorClass: 'bg-[#8a5300]',
    firms: [
      {
        id: 'europ',
        code: 'EUROP',
        name: 'Europ Assistance',
        contract: '01.01.2026 - 31.12.2026',
        commission: 6.5,
        revenue: [6.8, 6.9, 6.3, 6.4, 6.55, 6.72, 6.88, 6.95, 7.05, 7.18, 7.22, 7.36],
        claims: [4.55, 4.61, 4.34, 4.41, 4.49, 4.62, 4.71, 4.79, 4.87, 4.98, 5.02, 5.08],
      },
    ],
  },
]

const OPEX_ITEMS: OpexItem[] = [
  { id: 'personel', name: 'Personel Giderleri', values: [4.1, 4.05, 4.02, 4.08, 4.11, 4.12, 4.12, 4.13, 4.14, 4.16, 4.17, 4.55] },
  { id: 'it', name: 'IT Giderleri', values: [1.15, 1.28, 1.18, 1.24, 1.16, 1.14, 1.11, 1.09, 1.12, 1.11, 1.08, 1.13] },
  { id: 'pazarlama', name: 'Pazarlama Giderleri', values: [0.48, 0.44, 0.33, 0.35, 0.36, 0.38, 0.37, 0.36, 0.35, 0.34, 0.34, 0.52] },
]

const COMPANY_FACTORS: Record<string, { revenueFactor: number; claimFactor: number; opexFactor: number }> = {
  'tur-assist': { revenueFactor: 1, claimFactor: 1, opexFactor: 1 },
  otokonfor: { revenueFactor: 0.72, claimFactor: 0.76, opexFactor: 0.69 },
  'tur-medical': { revenueFactor: 0.58, claimFactor: 0.54, opexFactor: 0.63 },
  konutkonfor: { revenueFactor: 0.41, claimFactor: 0.39, opexFactor: 0.48 },
  'sigorta-acentesi': { revenueFactor: 0.66, claimFactor: 0.71, opexFactor: 0.62 },
  'rs-otomotiv': { revenueFactor: 0.77, claimFactor: 0.74, opexFactor: 0.7 },
  konsolide: { revenueFactor: 1.18, claimFactor: 1.12, opexFactor: 1.09 },
}

const YEAR_OPTIONS: YearOption[] = [
  { value: 'fy2025', label: 'FY 2025', revenueFactor: 0.92, claimFactor: 0.95, opexFactor: 0.94 },
  { value: 'fy2026', label: 'FY 2026', revenueFactor: 1, claimFactor: 1, opexFactor: 1 },
  { value: 'fy2027', label: 'FY 2027', revenueFactor: 1.11, claimFactor: 1.07, opexFactor: 1.05 },
]

const VERSION_OPTIONS: VersionOption[] = [
  { value: 'v1', label: 'v1 Ilk Plan', revenueFactor: 0.96, claimFactor: 0.98, opexFactor: 0.99 },
  { value: 'v2', label: 'v2 Revize', revenueFactor: 1, claimFactor: 1, opexFactor: 1 },
  { value: 'v3', label: 'v3 Draft', revenueFactor: 1.04, claimFactor: 1.01, opexFactor: 1.02 },
]

const SCENARIO_OPTIONS: ScenarioOption[] = [
  { value: 'base', label: 'Base', revenueFactor: 1, claimFactor: 1, opexFactor: 1 },
  { value: 'optimistic', label: 'Optimistic', revenueFactor: 1.12, claimFactor: 0.96, opexFactor: 0.98 },
  { value: 'conservative', label: 'Conservative', revenueFactor: 0.91, claimFactor: 1.08, opexFactor: 1.03 },
]

const CUSTOMER_PRODUCTS = [
  { name: 'Oto Asistans - LifeStyle Koruma', weight: 0.46, claimWeight: 0.44 },
  { name: 'Oto Asistans - Standart Paket', weight: 0.23, claimWeight: 0.26 },
  { name: 'Eksper Hizmeti', weight: 0.1, claimWeight: 0.12 },
  { name: 'Saglik Asistans - Paket', weight: 0.07, claimWeight: 0.06 },
  { name: 'Mini Onarim', weight: 0.08, claimWeight: 0.07 },
  { name: 'Ikame Arac', weight: 0.06, claimWeight: 0.05 },
]

function sum(values: number[]) {
  return values.reduce((acc, value) => acc + value, 0)
}

function fmt(value: number) {
  return value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtCompact(value: number) {
  return `${value.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`
}

function getMarginPct(revenueTotal: number, claimTotal: number) {
  if (!revenueTotal) return 0
  return ((revenueTotal - claimTotal) / revenueTotal) * 100
}

function getLossRatio(revenueTotal: number, claimTotal: number) {
  if (!revenueTotal) return 0
  return (claimTotal / revenueTotal) * 100
}

function createProductRows(values: number[], weights: 'weight' | 'claimWeight') {
  return CUSTOMER_PRODUCTS.map((product) => ({
    name: product.name,
    values: values.map((value) => Number((value * product[weights]).toFixed(2))),
  }))
}

function scaleValues(values: number[], factor: number) {
  return values.map((value) => Number((value * factor).toFixed(2)))
}

export function BudgetEntryPage() {
  const {
    selectedCompanyId,
    selectedYear,
    selectedScenario,
    searchQuery,
    setCompany,
    setYear,
    setScenario,
  } = useAppContextStore()
  const [mode, setMode] = useState<BudgetMode>('tree')
  const [treeQuery, setTreeQuery] = useState('')
  const [versionFilter, setVersionFilter] = useState<string>('v3')
  const [selection, setSelection] = useState<TreeSelection>({
    kind: 'firm',
    segmentId: 'sigorta',
    firmId: 'anadolu',
  })
  const deferredQuery = useDeferredValue(`${treeQuery} ${searchQuery}`.trim().toLowerCase())

  const selectedCompanyFactor = COMPANY_FACTORS[selectedCompanyId ?? 'tur-assist'] ?? COMPANY_FACTORS['tur-assist']
  const selectedCompanyLabel =
    COMPANIES.find((item) => item.id === (selectedCompanyId ?? 'tur-assist'))?.name ?? 'Tur Assist A.Ş.'
  const selectedYearFilter =
    YEAR_OPTIONS.find((item) => item.value === `fy${selectedYear}`) ??
    YEAR_OPTIONS.find((item) => item.value === 'fy2026')!
  const selectedVersionFilter = VERSION_OPTIONS.find((item) => item.value === versionFilter) ?? VERSION_OPTIONS[2]
  const selectedScenarioFilter =
    SCENARIO_OPTIONS.find((item) => item.value === selectedScenario) ?? SCENARIO_OPTIONS[0]

  const adjustedSegments = useMemo(() => {
    const revenueFactor =
      selectedCompanyFactor.revenueFactor *
      selectedYearFilter.revenueFactor *
      selectedVersionFilter.revenueFactor *
      selectedScenarioFilter.revenueFactor
    const claimFactor =
      selectedCompanyFactor.claimFactor *
      selectedYearFilter.claimFactor *
      selectedVersionFilter.claimFactor *
      selectedScenarioFilter.claimFactor

    return SEGMENTS.map((segment) => ({
      ...segment,
      firms: segment.firms.map((firm) => ({
        ...firm,
        revenue: scaleValues(firm.revenue, revenueFactor),
        claims: scaleValues(firm.claims, claimFactor),
      })),
    }))
  }, [selectedCompanyFactor, selectedScenarioFilter, selectedVersionFilter, selectedYearFilter])

  const adjustedOpex = useMemo(() => {
    const opexFactor =
      selectedCompanyFactor.opexFactor *
      selectedYearFilter.opexFactor *
      selectedVersionFilter.opexFactor *
      selectedScenarioFilter.opexFactor

    return OPEX_ITEMS.map((item) => ({
      ...item,
      values: scaleValues(item.values, opexFactor),
    }))
  }, [selectedCompanyFactor, selectedScenarioFilter, selectedVersionFilter, selectedYearFilter])

  const filteredSegments = useMemo(() => {
    return adjustedSegments.map((segment) => ({
      ...segment,
      firms: segment.firms.filter((firm) => {
        if (!deferredQuery) return true
        return `${firm.name} ${firm.code} ${segment.label}`.toLowerCase().includes(deferredQuery)
      }),
    })).filter((segment) => segment.firms.length > 0 || deferredQuery.length === 0)
  }, [adjustedSegments, deferredQuery])

  const filteredOpex = useMemo(() => {
    return adjustedOpex.filter((item) => {
      if (!deferredQuery) return true
      return item.name.toLowerCase().includes(deferredQuery)
    })
  }, [adjustedOpex, deferredQuery])

  const selectedFirm = useMemo(() => {
    if (selection.kind !== 'firm') return null
    return adjustedSegments
      .find((segment) => segment.id === selection.segmentId)
      ?.firms.find((firm) => firm.id === selection.firmId) ?? null
  }, [adjustedSegments, selection])

  const selectedSegment = useMemo(() => {
    if (selection.kind !== 'firm') return null
    return adjustedSegments.find((segment) => segment.id === selection.segmentId) ?? null
  }, [adjustedSegments, selection])

  const selectedOpex = useMemo(() => {
    if (selection.kind !== 'opex') return null
    return adjustedOpex.find((item) => item.id === selection.itemId) ?? null
  }, [adjustedOpex, selection])

  const customerOptions = useMemo(
    () =>
      adjustedSegments.flatMap((segment) =>
        segment.firms.map((firm) => ({
          value: `${segment.id}:${firm.id}`,
          label: `${firm.name} - ${firm.code} (${segment.label})`,
        })),
      ),
    [adjustedSegments],
  )

  const currentCustomer = selectedFirm ?? adjustedSegments[0].firms[0]
  const currentCustomerSegment = selectedSegment ?? adjustedSegments[0]
  const revenueTotal = sum(currentCustomer.revenue)
  const claimTotal = sum(currentCustomer.claims)
  const marginTotal = revenueTotal - claimTotal
  const lossRatio = getLossRatio(revenueTotal, claimTotal)
  const marginPct = getMarginPct(revenueTotal, claimTotal)
  const monthlyAverageFiles = Math.round((revenueTotal * 1700) / 12)

  const revenueProductRows = createProductRows(currentCustomer.revenue, 'weight')
  const claimProductRows = createProductRows(currentCustomer.claims, 'claimWeight')

  useEffect(() => {
    const selectionStillVisible =
      selection.kind === 'firm'
        ? filteredSegments.some(
            (segment) =>
              segment.id === selection.segmentId &&
              segment.firms.some((firm) => firm.id === selection.firmId),
          )
        : filteredOpex.some((item) => item.id === selection.itemId)

    if (selectionStillVisible) return

    const firstFirm = filteredSegments[0]?.firms[0]
    if (firstFirm) {
      setSelection({ kind: 'firm', segmentId: filteredSegments[0].id, firmId: firstFirm.id })
      return
    }

    const firstOpex = filteredOpex[0]
    if (firstOpex) {
      setSelection({ kind: 'opex', itemId: firstOpex.id })
    }
  }, [filteredOpex, filteredSegments, selection])

  return (
    <section>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-display text-on-surface">Butce Planlama</h2>
        </div>
        <div className="flex gap-3">
          <button type="button" className="btn-secondary">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              upload_file
            </span>
            Excel Ice Aktar
          </button>
          <button type="button" className="btn-secondary">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              save
            </span>
            Taslak Kaydet
          </button>
          <button type="button" className="btn-primary">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              verified
            </span>
            Onaya Gonder
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-4 bg-surface-container-low rounded-lg p-1 w-fit">
        <button type="button" className={`tab ${mode === 'tree' ? 'active' : ''}`} onClick={() => setMode('tree')}>
          <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: 16 }}>
            account_tree
          </span>
          Hiyerarsik Planlama (A)
        </button>
        <button
          type="button"
          className={`tab ${mode === 'customer' ? 'active' : ''}`}
          onClick={() => setMode('customer')}
        >
          <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: 16 }}>
            person_pin
          </span>
          Musteri Odakli Giris (C)
        </button>
      </div>

      <div className="card mb-4 flex flex-wrap items-center gap-3 hidden">
        <span className="label-sm">Filtre</span>
        <select
          className="select"
          value={selectedCompanyId ?? 'tur-assist'}
          onChange={(event) => setCompany(event.target.value || null)}
        >
          {COMPANIES.map((option) => (
            <option key={option.id} value={option.id}>
              Sirket: {option.name}
            </option>
          ))}
        </select>
        <select className="select" value={selectedYear} onChange={(event) => setYear(Number(event.target.value))}>
          {YEARS.map((year) => (
            <option key={year} value={year}>
              Yil: FY {year}
            </option>
          ))}
        </select>
        <select className="select" value={versionFilter} onChange={(event) => setVersionFilter(event.target.value)}>
          {VERSION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              Versiyon: {option.label}
            </option>
          ))}
        </select>
        <select className="select" value={selectedScenario} onChange={(event) => setScenario(event.target.value)}>
          {SCENARIOS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <span className="chip chip-info">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              info
            </span>
            Mavi = giris
          </span>
          <span className="chip chip-neutral">Gri = formul</span>
          <span className="chip chip-warning">Sari = musteri zorunlu</span>
        </div>
      </div>

      {mode === 'tree' ? (
        <div className="grid grid-cols-12 gap-4 mb-6">
          <div className="col-span-12 lg:col-span-3">
            <div className="card p-0 overflow-hidden min-h-[760px]">
              <div className="p-4 border-b border-surface-container-low sticky top-0 bg-white z-10">
                <input
                  className="input w-full"
                  placeholder="Agacta ara..."
                  value={treeQuery}
                  onChange={(event) => setTreeQuery(event.target.value)}
                />
              </div>
              <div className="p-3 text-sm max-h-[74vh] overflow-y-auto">
                <details open className="mb-2">
                  <summary className="tree-summary font-bold">
                    <span className="material-symbols-outlined chev" style={{ fontSize: 16 }}>
                      chevron_right
                    </span>
                    <span className="material-symbols-outlined text-[#b50303]" style={{ fontSize: 16 }}>
                      apartment
                    </span>
                    {selectedCompanyLabel}
                    <span className="ml-auto text-[0.65rem] text-on-surface-variant num">
                      {fmtCompact(
                        adjustedSegments
                          .flatMap((segment) => segment.firms)
                          .reduce((acc, firm) => acc + sum(firm.revenue), 0),
                      )}
                    </span>
                  </summary>
                  <div className="pl-4">
                    {filteredSegments.map((segment, segmentIndex) => (
                      <details key={segment.id} open={segmentIndex === 0 || deferredQuery.length > 0}>
                        <summary className="tree-summary font-semibold">
                          <span className="material-symbols-outlined chev" style={{ fontSize: 16 }}>
                            chevron_right
                          </span>
                          <span className={`w-2.5 h-2.5 rounded-full ${segment.colorClass}`} />
                          {segment.label}
                          <span className="ml-auto text-[0.65rem] text-on-surface-variant num">
                            {fmtCompact(segment.firms.reduce((acc, firm) => acc + sum(firm.revenue), 0))}
                          </span>
                        </summary>
                        <div className="pl-5">
                          {segment.firms.map((firm) => {
                            const isSelected =
                              selection.kind === 'firm' &&
                              selection.segmentId === segment.id &&
                              selection.firmId === firm.id
                            return (
                              <button
                                key={firm.id}
                                type="button"
                                className={`tree-item w-full ${isSelected ? 'selected' : ''}`}
                                onClick={() => setSelection({ kind: 'firm', segmentId: segment.id, firmId: firm.id })}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                  business
                                </span>
                                {firm.name}
                                <span className="ml-auto text-[0.65rem] num">{fmtCompact(sum(firm.revenue))}</span>
                              </button>
                            )
                          })}
                        </div>
                      </details>
                    ))}

                    <details className="mt-2" open={deferredQuery.length > 0}>
                      <summary className="tree-summary font-semibold">
                        <span className="material-symbols-outlined chev" style={{ fontSize: 16 }}>
                          chevron_right
                        </span>
                        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 16 }}>
                          receipt_long
                        </span>
                        OPEX ve Personel
                        <span className="ml-auto text-[0.65rem] text-on-surface-variant num">
                          {fmtCompact(adjustedOpex.reduce((acc, item) => acc + sum(item.values), 0))}
                        </span>
                      </summary>
                      <div className="pl-5">
                        {filteredOpex.map((item) => {
                          const isSelected = selection.kind === 'opex' && selection.itemId === item.id
                          return (
                            <button
                              key={item.id}
                              type="button"
                              className={`tree-item w-full ${isSelected ? 'selected' : ''}`}
                              onClick={() => setSelection({ kind: 'opex', itemId: item.id })}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                receipt_long
                              </span>
                              {item.name}
                              <span className="ml-auto text-[0.65rem] num">{fmtCompact(sum(item.values))}</span>
                            </button>
                          )
                        })}
                      </div>
                    </details>
                  </div>
                </details>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-9">
            <div className="card mb-3 flex items-center gap-4 min-h-[124px]">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 28 }}>
                apartment
              </span>
              {selectedFirm && selectedSegment ? (
                <div>
                  <p className="text-[0.65rem] text-on-surface-variant font-semibold uppercase tracking-[0.08em]">
                    Secili musteri
                  </p>
                  <h3 className="text-[2rem] leading-none font-black tracking-display text-on-surface mt-1">
                    {selectedFirm.name} <span className={`chip ${selectedSegment.chipClass} ml-2`}>{selectedSegment.label}</span>
                  </h3>
                  <p className="text-sm text-on-surface-variant mt-2">
                    {selectedFirm.code} • 4 aktif sozlesme • Loss Ratio %{fmt(getLossRatio(sum(selectedFirm.revenue), sum(selectedFirm.claims)))}
                  </p>
                </div>
              ) : selectedOpex ? (
                <div>
                  <p className="text-[0.65rem] text-on-surface-variant font-semibold uppercase tracking-[0.08em]">
                    Secili gider kalemi
                  </p>
                  <h3 className="text-[2rem] leading-none font-black tracking-display text-on-surface mt-1">
                    {selectedOpex.name} <span className="chip chip-info ml-2">Gider Kalemi</span>
                  </h3>
                  <p className="text-sm text-on-surface-variant mt-2">OPEX • Toplam {fmtCompact(sum(selectedOpex.values))}</p>
                </div>
              ) : null}
              <div className="ml-auto flex gap-2">
                <button type="button" className="btn-secondary">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    content_copy
                  </span>
                  Gecen Yil Kopyala
                </button>
                <button type="button" className="btn-secondary">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    trending_up
                  </span>
                  +%X Buyut
                </button>
              </div>
            </div>

            <BudgetTable
              key={
                selection.kind === 'firm'
                  ? `tree-firm-${selection.segmentId}-${selection.firmId}`
                  : `tree-opex-${selection.itemId}`
              }
              mode="tree"
              yearLabel={selectedYearFilter.label}
              firm={selectedFirm}
              segment={selectedSegment}
              opex={selectedOpex}
              revenueRows={revenueProductRows}
              claimRows={claimProductRows}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="card mb-4 flex flex-wrap items-center gap-3">
            <span className="label-sm">Musteri Sec</span>
            <select
              className="select min-w-[420px]"
              value={`${currentCustomerSegment.id}:${currentCustomer.id}`}
              onChange={(event) => {
                const [segmentId, firmId] = event.target.value.split(':') as [SegmentId, string]
                setSelection({ kind: 'firm', segmentId, firmId })
              }}
            >
              {customerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="chip chip-info">Sozlesme: {currentCustomer.contract}</span>
            <span className="chip chip-success">Komisyon: %{fmt(currentCustomer.commission)}</span>
            <div className="ml-auto flex gap-2">
              <button type="button" className="btn-secondary">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  content_copy
                </span>
                FY25 Kopyala
              </button>
              <button type="button" className="btn-secondary">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  calculate
                </span>
                %X Otomatik Buyut
              </button>
              <button type="button" className="btn-primary">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  save
                </span>
                Kaydet
              </button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4 mb-4">
            <TopKpiCard
              className="col-span-12 md:col-span-3"
              ribbon="ribbon-primary"
              title={`${selectedYearFilter.label} Plan Gelir`}
              value={fmtCompact(revenueTotal)}
              note={`${selectedScenarioFilter.label} / ${selectedVersionFilter.label}`}
              noteClass="text-[#005b9f]"
            />
            <TopKpiCard
              className="col-span-12 md:col-span-3"
              ribbon="ribbon-warning"
              title={`${selectedYearFilter.label} Plan Hasar`}
              value={fmtCompact(claimTotal)}
              note={`Loss Ratio: %${fmt(lossRatio)}`}
            />
            <TopKpiCard
              className="col-span-12 md:col-span-3"
              ribbon="ribbon-tertiary"
              title="Teknik Marj"
              value={fmtCompact(marginTotal)}
              note={`%${fmt(marginPct)} marj`}
            />
            <TopKpiCard
              className="col-span-12 md:col-span-3"
              ribbon="ribbon-success"
              title="Dosya Hedefi"
              value={`${Math.round(revenueTotal * 13.5)}K`}
              note={`Aylik ort: ${monthlyAverageFiles.toLocaleString('tr-TR')}`}
            />
          </div>

          <BudgetTable
            key={`customer-${currentCustomerSegment.id}-${currentCustomer.id}`}
            mode="customer"
            yearLabel={selectedYearFilter.label}
            firm={currentCustomer}
            segment={currentCustomerSegment}
            opex={null}
            revenueRows={revenueProductRows}
            claimRows={claimProductRows}
          />
        </>
      )}

      <div className="mt-4 grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="card">
          <span className="label-sm">Formul Kontrolu</span>
          <p className="text-sm text-on-surface mt-2">
            <span className="chip chip-success">OK</span> Gelir Toplam = urun satirlari
          </p>
          <p className="text-sm text-on-surface mt-2">
            <span className="chip chip-success">OK</span> Hasar Toplam = musteri bazli satirlar
          </p>
          <p className="text-sm text-on-surface mt-2">
            <span className="chip chip-warning">UYARI</span> Q4 growth %28 (limit: %25)
          </p>
        </div>
        <div className="card">
          <span className="label-sm">Onay Akisi</span>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-success" style={{ fontSize: 18 }}>
                check_circle
              </span>
              Departman Muduru
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#005b9f]" style={{ fontSize: 18 }}>
                pending
              </span>
              CFO (beklemede)
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>
                radio_button_unchecked
              </span>
              CEO
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>
                radio_button_unchecked
              </span>
              Yonetim Kurulu
            </div>
          </div>
        </div>
        <div className="card">
          <span className="label-sm">Son Degisiklikler</span>
          <p className="text-xs text-on-surface-variant mt-2">
            T. Turan - 14:23 - Oto segmenti Eki ayi guncellendi
          </p>
          <p className="text-xs text-on-surface-variant mt-2">
            M. Yilmaz - 13:45 - Saglik marji yeniden fiyatlandi
          </p>
          <p className="text-xs text-on-surface-variant mt-2">
            A. Celik - 11:02 - Warranty komisyon orani guncellendi
          </p>
        </div>
      </div>
    </section>
  )
}

function BudgetTable({
  mode,
  yearLabel,
  firm,
  segment,
  opex,
  revenueRows,
  claimRows,
}: {
  mode: BudgetMode
  yearLabel: string
  firm: FirmBudget | null
  segment: SegmentBudget | null
  opex: OpexItem | null
  revenueRows: { name: string; values: number[] }[]
  claimRows: { name: string; values: number[] }[]
}) {
  if (opex) {
    return (
      <div className="card p-0 overflow-hidden">
        <div className="max-h-[60vh] overflow-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ minWidth: 260 }}>Gider Kalemi</th>
                {MONTHS.map((month) => (
                  <th key={month} className="text-right">
                    {month}
                  </th>
                ))}
                <th className="text-right bg-[#191c1f] text-white">Toplam</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="budget-section-row" colSpan={MONTHS.length + 2}>
                  <span className="budget-section-dot bg-[#8a5300]" />
                  GENEL GIDERLER
                </td>
              </tr>
              <tr>
                <td>{opex.name}</td>
                {opex.values.map((value, index) => (
                  <td key={index} className="text-right">
                    <input className="cell-edit" defaultValue={fmt(value)} />
                  </td>
                ))}
                <td className="text-right num font-bold bg-surface-container-low">{fmt(sum(opex.values))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (!firm || !segment) return null

  const revenueTotal = sum(firm.revenue)
  const claimTotal = sum(firm.claims)
  const marginMonths = firm.revenue.map((value, index) => Number((value - firm.claims[index]).toFixed(2)))
  const marginTotal = sum(marginMonths)
  const showHeader = mode === 'customer'

  return (
    <>
      {showHeader ? (
        <div className="card mb-4 p-0 overflow-hidden">
          <div className="p-4 border-b border-surface-container-low flex items-center justify-between">
            <h3 className="text-base font-bold text-on-surface">{firm.name} - {yearLabel} Aylik Plan</h3>
            <div className="flex gap-2">
              <span className="chip chip-error">Gelir</span>
              <span className="chip chip-warning">Hasar</span>
              <span className="chip chip-info">Teknik Marj (formul)</span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card p-0 overflow-hidden">
        <div className="max-h-[60vh] overflow-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ minWidth: 260 }}>{mode === 'customer' ? 'Urun / Hesap' : 'Hesap / Urun'}</th>
                {MONTHS.map((month) => (
                  <th key={month} className="text-right">
                    {month}
                  </th>
                ))}
                <th className="text-right bg-[#191c1f] text-white">Toplam</th>
              </tr>
            </thead>
            <tbody>
              {/* Müşteri seçildiğinde ana kalem olarak sadece Gelir + Hasar blokları
                  (her biri ürün kırılımı ile). OPEX müşteri bazında kırılamaz;
                  müşteri görünümünde gösterilmez. TEKNIK MARJ = Gelir − Hasar
                  formül satırı olarak kalır. */}
              <tr>
                <td className="budget-section-row" colSpan={MONTHS.length + 2}>
                  <span className="budget-section-dot bg-[#d81515]" />
                  GELIR
                </td>
              </tr>
              {revenueRows.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  {row.values.map((value, index) => (
                    <td key={index} className="text-right">
                      <input className="cell-edit text-[#005b9f]" defaultValue={fmt(value)} />
                    </td>
                  ))}
                  <td className="text-right num font-bold">{fmt(sum(row.values))}</td>
                </tr>
              ))}
              <tr className="row-total">
                <td>GELIR TOPLAM</td>
                {firm.revenue.map((value, index) => (
                  <td key={index} className="text-right num">
                    {fmt(value)}
                  </td>
                ))}
                <td className="text-right num font-bold">{fmt(revenueTotal)}</td>
              </tr>

              <tr>
                <td className="budget-section-row" colSpan={MONTHS.length + 2}>
                  <span className="budget-section-dot bg-[#ff8a00]" />
                  HASAR
                </td>
              </tr>
              {claimRows.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  {row.values.map((value, index) => (
                    <td key={index} className="text-right">
                      <input className="cell-edit" defaultValue={fmt(value)} />
                    </td>
                  ))}
                  <td className="text-right num font-bold">{fmt(sum(row.values))}</td>
                </tr>
              ))}
              <tr className="row-total">
                <td>HASAR TOPLAM</td>
                {firm.claims.map((value, index) => (
                  <td key={index} className="text-right num">
                    {fmt(value)}
                  </td>
                ))}
                <td className="text-right num font-bold">{fmt(claimTotal)}</td>
              </tr>

              <tr className="budget-metric-row">
                <td>TEKNIK MARJ</td>
                {marginMonths.map((value, index) => (
                  <td key={index} className="text-right num font-semibold">
                    {fmt(value)}
                  </td>
                ))}
                <td className="text-right num font-bold">{fmt(marginTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function TopKpiCard({
  className,
  ribbon,
  title,
  value,
  note,
  noteClass = 'text-on-surface-variant',
}: {
  className?: string
  ribbon: string
  title: string
  value: string
  note: string
  noteClass?: string
}) {
  return (
    <div className={`${className ?? ''} card relative`}>
      <div className={ribbon} />
      <span className="label-sm">{title}</span>
      <p className="text-2xl font-black tracking-display num mt-2">{value}</p>
      <p className={`text-xs mt-1 font-semibold ${noteClass}`}>{note}</p>
    </div>
  )
}
