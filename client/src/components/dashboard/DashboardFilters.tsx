interface FilterOption {
  value: string
  label: string
}

interface DashboardFiltersProps {
  year: string
  onYearChange: (year: string) => void
  versionId: string
  onVersionChange: (versionId: string) => void
  period: string
  onPeriodChange: (period: string) => void
  segment: string
  onSegmentChange: (segment: string) => void
  yearOptions?: FilterOption[]
  versionOptions?: FilterOption[]
  segmentOptions?: FilterOption[]
}

const DEFAULT_YEAR_OPTIONS: FilterOption[] = [
  { value: '2026', label: '2026' },
  { value: '2025', label: '2025' },
  { value: '2024', label: '2024' },
]

const PERIOD_OPTIONS: FilterOption[] = [
  { value: 'annual', label: 'Yillik' },
  { value: 'q1', label: '1. Ceyrek' },
  { value: 'q2', label: '2. Ceyrek' },
  { value: 'q3', label: '3. Ceyrek' },
  { value: 'q4', label: '4. Ceyrek' },
  { value: 'h1', label: '1. Yari Yil' },
  { value: 'h2', label: '2. Yari Yil' },
]

const DEFAULT_VERSION_OPTIONS: FilterOption[] = [
  { value: '1', label: 'v1 — Aktif' },
]

const DEFAULT_SEGMENT_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'Tum Segmentler' },
]

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: FilterOption[]
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-xs font-medium text-text-muted uppercase tracking-wide"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text shadow-sm transition-colors focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function DashboardFilters({
  year,
  onYearChange,
  versionId,
  onVersionChange,
  period,
  onPeriodChange,
  segment,
  onSegmentChange,
  yearOptions = DEFAULT_YEAR_OPTIONS,
  versionOptions = DEFAULT_VERSION_OPTIONS,
  segmentOptions = DEFAULT_SEGMENT_OPTIONS,
}: DashboardFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-white p-4 shadow-sm">
      <FilterSelect
        id="filter-year"
        label="Yil"
        value={year}
        onChange={onYearChange}
        options={yearOptions}
      />
      <FilterSelect
        id="filter-version"
        label="Versiyon"
        value={versionId}
        onChange={onVersionChange}
        options={versionOptions}
      />
      <FilterSelect
        id="filter-period"
        label="Donem"
        value={period}
        onChange={onPeriodChange}
        options={PERIOD_OPTIONS}
      />
      <FilterSelect
        id="filter-segment"
        label="Segment"
        value={segment}
        onChange={onSegmentChange}
        options={segmentOptions}
      />
    </div>
  )
}
