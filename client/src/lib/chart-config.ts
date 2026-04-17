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
ChartJS.defaults.color = '#5c403b'

export const GRID = {
  color: '#e6e8ea',
  borderColor: '#e6e8ea',
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
  primary: '#b50303',
  primaryContainer: '#da291c',
  secondary: '#435b9f',
  secondaryContainer: '#9cb4fe',
  navyAnchor: '#002366',
  navyDeep: '#00174a',
  outline: '#916f6a',
  outlineVariant: '#e6bdb7',
  success: '#14532d',
  successContainer: '#dcfce7',
  warning: '#854d0e',
  warningContainer: '#fef3c7',
  error: '#93000a',
  errorContainer: '#ffdad6',
  neutral: '#5c403b',
  /** @deprecated use secondary */
  tertiary: '#435b9f',
  /** @deprecated use secondaryContainer */
  tertiaryContainer: '#9cb4fe',
} as const
