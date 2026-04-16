import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ChartErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-64 items-center justify-center rounded-lg border border-danger/30 bg-danger/5">
            <p className="text-sm text-danger">Grafik yüklenirken hata oluştu.</p>
          </div>
        )
      )
    }
    return this.props.children
  }
}
