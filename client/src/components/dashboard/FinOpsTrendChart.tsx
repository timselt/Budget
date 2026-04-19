import { Line, Doughnut } from 'react-chartjs-2'
import { GRID } from '../../lib/chart-config'

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

export function FinOpsTrendChart() {
  return (
    <Line
      height={110}
      data={{
        labels: MONTHS,
        datasets: [
          {
            label: 'Gelir',
            data: [158, 168, 181, 187, 192, 198, 205, 208, 212, 220, 226, 232],
            borderColor: '#da291c',
            backgroundColor: 'rgba(218,41,28,0.08)',
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 5,
          },
          {
            label: 'Hasar',
            data: [92, 97, 106, 112, 114, 118, 122, 124, 126, 131, 134, 138],
            borderColor: '#854d0e',
            backgroundColor: 'rgba(133,77,14,0.06)',
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 5,
          },
          {
            label: 'Teknik Marj',
            data: [66, 71, 75, 75, 78, 80, 83, 84, 86, 89, 92, 94],
            borderColor: '#002366',
            backgroundColor: 'rgba(0,35,102,0.06)',
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 5,
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

export function FinOpsSegmentDonut() {
  return (
    <Doughnut
      height={180}
      data={{
        labels: ['Sigorta Şirketleri', 'Banka/Kart', 'B2B2C', 'B2C + Ad-Hoc'],
        datasets: [
          {
            data: [62, 18, 14, 6],
            backgroundColor: ['#da291c', '#002366', '#4d4d4f', '#cbd5e1'],
            borderWidth: 0,
            spacing: 2,
          },
        ],
      }}
      options={{
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: { legend: { display: false } },
      }}
    />
  )
}
