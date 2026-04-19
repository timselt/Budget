import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

// Brand: Tur Assist — Architectural Precision (docs/brand-system.md)
ChartJS.defaults.font.family = 'Manrope'
ChartJS.defaults.font.size = 11
ChartJS.defaults.color = '#4d4d4f'

export const GRID = {
  color: '#e2e8f0',
  borderColor: '#e2e8f0',
  tickColor: 'transparent',
} as const

/**
 * Brand-aligned chart palette. All hex values trace to the @theme tokens
 * in src/index.css and the canonical mapping in docs/brand-system.md.
 *
 * tertiary/tertiaryContainer remain as DEPRECATED aliases mapped to navy
 * (secondary) for chart series compatibility — new chart code should use
 * `secondary` / `secondaryContainer` directly.
 */
export const FINOPS_COLORS = {
  primary: '#da291c',
  primaryContainer: '#b01818',
  secondary: '#002366',
  secondaryContainer: '#00174a',
  navyAnchor: '#002366',
  navyDeep: '#00174a',
  outline: '#4d4d4f',
  outlineVariant: '#cbd5e1',
  success: '#14532d',
  successContainer: '#dcfce7',
  warning: '#854d0e',
  warningContainer: '#fef3c7',
  error: '#93000a',
  errorContainer: '#ffdad6',
  neutral: '#4d4d4f',
  /** @deprecated use secondary */
  tertiary: '#002366',
  /** @deprecated use secondaryContainer */
  tertiaryContainer: '#00174a',
} as const
