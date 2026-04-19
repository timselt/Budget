import { Bar, Line } from 'react-chartjs-2'
import { GRID } from '../../lib/chart-config'

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

export function EbitdaBridgeChart() {
  return (
    <Bar
      height={170}
      data={{
        labels: ['FY25', 'Gelir', 'Hasar', 'OPEX', 'FY26'],
        datasets: [
          {
            data: [285, 320, -220, -25, 360],
            backgroundColor: ['#4d4d4f', '#14532d', '#93000a', '#93000a', '#da291c'],
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

export function LossRatioChart() {
  return (
    <Line
      height={170}
      data={{
        labels: MONTHS,
        datasets: [
          {
            label: 'LR',
            data: [58, 57, 58, 60, 59, 60, 59, 60, 59, 60, 59, 58],
            borderColor: '#da291c',
            backgroundColor: 'rgba(218,41,28,0.1)',
            borderWidth: 2.5,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
          },
          {
            label: 'Benchmark',
            data: [55, 55, 55, 55, 55, 55, 55, 55, 55, 55, 55, 55],
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
          y: { grid: GRID, min: 50, max: 65, ticks: { callback: (v) => `${v}%` } },
          x: { grid: { display: false } },
        },
      }}
    />
  )
}

export function OpexBreakdownChart() {
  return (
    <Bar
      height={170}
      data={{
        labels: ['Personel', 'Teknoloji', 'Operasyon', 'Pazarlama', 'Gen. Yön.', 'Diğer'],
        datasets: [
          {
            data: [245, 88, 65, 42, 51, 29],
            backgroundColor: ['#da291c', '#002366', '#b01818', '#6b7db1', '#4d4d4f', '#cbd5e1'],
            borderRadius: 4,
            barThickness: 28,
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
