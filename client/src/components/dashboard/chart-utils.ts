export const MONTH_LABELS = [
  'Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara',
] as const

export const CHART_COLORS = {
  primary: 'oklch(55% 0.18 250)',
  primaryLight: 'oklch(78% 0.12 250)',
  secondary: 'oklch(65% 0.2 145)',
  secondaryLight: 'oklch(80% 0.12 145)',
  danger: 'oklch(60% 0.22 25)',
  dangerLight: 'oklch(80% 0.12 25)',
  warning: 'oklch(75% 0.18 80)',
  warningLight: 'oklch(85% 0.10 80)',
  accent1: 'oklch(60% 0.18 300)',
  accent2: 'oklch(65% 0.16 180)',
  accent3: 'oklch(70% 0.14 50)',
  accent4: 'oklch(55% 0.20 220)',
  accent5: 'oklch(62% 0.15 130)',
  muted: 'oklch(45% 0.02 250)',
  border: 'oklch(90% 0.02 250)',
  surface: 'oklch(98.5% 0.005 250)',
} as const

export const PIE_PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.warning,
  CHART_COLORS.accent1,
  CHART_COLORS.accent2,
  CHART_COLORS.accent3,
  CHART_COLORS.danger,
  CHART_COLORS.accent4,
  CHART_COLORS.accent5,
  CHART_COLORS.primaryLight,
] as const

export function formatTryCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`
  }
  return value.toFixed(0)
}

export function formatPercent(value: number): string {
  return `%${(value * 100).toFixed(1)}`
}

export function formatFullCurrency(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}
