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

ChartJS.defaults.font.family = 'Inter'
ChartJS.defaults.font.size = 11
ChartJS.defaults.color = '#5c403b'

export const GRID = {
  color: '#e6e8ed',
  borderColor: '#e6e8ed',
  tickColor: 'transparent',
}

export const FINOPS_COLORS = {
  primary: '#b50303',
  primaryContainer: '#da291c',
  tertiary: '#005b9f',
  tertiaryContainer: '#0074c8',
  outline: '#916f6a',
  outlineVariant: '#e6bdb7',
  success: '#006d3e',
  warning: '#8a5300',
  error: '#ba1a1a',
  neutral: '#5c5f63',
} as const
