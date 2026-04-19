import { Bar } from 'react-chartjs-2'
import { GRID } from '../../lib/chart-config'

export function WaterfallChart() {
  return (
    <Bar
      height={200}
      data={{
        labels: ['Plan EBITDA', 'Gelir +', 'Hasar −', 'OPEX +', 'Fin. −', 'Actual EBITDA'],
        datasets: [
          {
            data: [122, 42, -39, -4, 5, 126],
            backgroundColor: ['#4d4d4f', '#14532d', '#93000a', '#93000a', '#14532d', '#da291c'],
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
