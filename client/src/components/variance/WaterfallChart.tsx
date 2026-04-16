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
            backgroundColor: ['#5c5f63', '#006d3e', '#ba1a1a', '#ba1a1a', '#006d3e', '#b50303'],
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
