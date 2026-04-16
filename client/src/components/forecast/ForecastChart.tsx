import { Line } from 'react-chartjs-2'
import { GRID } from '../../lib/chart-config'

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

export function ForecastChart() {
  return (
    <Line
      height={90}
      data={{
        labels: MONTHS,
        datasets: [
          {
            label: 'Plan',
            data: [158, 168, 181, 187, 192, 198, 205, 208, 212, 220, 226, 232],
            borderColor: '#5c5f63',
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
          },
          {
            label: 'Actual',
            data: [165, 174, 186, 192, null, null, null, null, null, null, null, null],
            borderColor: '#006d3e',
            backgroundColor: 'rgba(0,109,62,0.1)',
            borderWidth: 3,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: '#006d3e',
            fill: false,
          },
          {
            label: 'Forecast',
            data: [null, null, null, 192, 198, 205, 212, 216, 220, 228, 234, 241],
            borderColor: '#005b9f',
            backgroundColor: 'rgba(0,91,159,0.1)',
            borderWidth: 2.5,
            tension: 0.3,
            pointRadius: 0,
            fill: true,
            borderDash: [0],
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
