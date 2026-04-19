import { Bar, Line } from 'react-chartjs-2'
import { GRID } from '../../lib/chart-config'

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

interface EbitdaBridgeChartProps {
  labels: string[]
  values: number[]
}

interface LossRatioChartProps {
  actualSeries: number[]
  benchmarkSeries: number[]
}

interface OpexBreakdownChartProps {
  labels: string[]
  values: number[]
}

export function EbitdaBridgeChart({ labels, values }: EbitdaBridgeChartProps) {
  const colors = values.map((value, index) => {
    if (index === values.length - 1) return '#005bac'
    return value >= 0 ? '#15803d' : '#93000a'
  })

  return (
    <Bar
      height={170}
      data={{
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderRadius: 4,
          },
        ],
      }}
      options={{
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: GRID, ticks: { callback: (v) => `${v}M` } },
          x: { grid: { display: false } },
        },
      }}
    />
  )
}

export function LossRatioChart({
  actualSeries,
  benchmarkSeries,
}: LossRatioChartProps) {
  return (
    <Line
      height={170}
      data={{
        labels: MONTHS,
        datasets: [
          {
            label: 'Gerçekleşen',
            data: actualSeries,
            borderColor: '#da291c',
            backgroundColor: 'rgba(218,41,28,0.1)',
            borderWidth: 2.5,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
          },
          {
            label: 'Bütçe',
            data: benchmarkSeries,
            borderColor: '#002366',
            borderDash: [4, 4],
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
          },
        ],
      }}
      options={{
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: GRID, ticks: { callback: (v) => `${v}%` } },
          x: { grid: { display: false } },
        },
      }}
    />
  )
}

export function OpexBreakdownChart({
  labels,
  values,
}: OpexBreakdownChartProps) {
  return (
    <Bar
      height={170}
      data={{
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: ['#da291c', '#005bac', '#e12d20', '#94a3b8', '#a16207', '#15803d', '#6b46c1', '#64748b'],
            borderRadius: 4,
            barThickness: 22,
          },
        ],
      }}
      options={{
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: GRID, ticks: { callback: (v) => `${v}M` } },
          y: { grid: { display: false } },
        },
      }}
    />
  )
}
