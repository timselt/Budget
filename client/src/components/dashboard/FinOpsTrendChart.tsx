import { Doughnut, Line } from 'react-chartjs-2'
import { GRID } from '../../lib/chart-config'
import { METRIC_LABELS } from '../../lib/metric-labels'

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

interface FinOpsTrendChartProps {
  revenueSeries: number[]
  claimsSeries: number[]
  technicalMarginSeries: number[]
}

interface SegmentDistributionDonutProps {
  labels: string[]
  values: number[]
}

export function FinOpsTrendChart({
  revenueSeries,
  claimsSeries,
  technicalMarginSeries,
}: FinOpsTrendChartProps) {
  return (
    <Line
      height={110}
      data={{
        labels: MONTHS,
        datasets: [
          {
            label: 'Gelir',
            data: revenueSeries,
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
            data: claimsSeries,
            borderColor: '#a16207',
            backgroundColor: 'rgba(161,98,7,0.06)',
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 5,
          },
          {
            label: METRIC_LABELS.technicalMargin,
            data: technicalMarginSeries,
            borderColor: '#15803d',
            backgroundColor: 'rgba(21,128,61,0.06)',
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

export function SegmentDistributionDonut({
  labels,
  values,
}: SegmentDistributionDonutProps) {
  return (
    <Doughnut
      height={180}
      data={{
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: ['#da291c', '#005bac', '#a16207', '#15803d', '#6b46c1', '#64748b'],
            borderWidth: 0,
            spacing: 2,
          },
        ],
      }}
      options={{
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: { legend: { display: true, position: 'bottom' } },
      }}
    />
  )
}
