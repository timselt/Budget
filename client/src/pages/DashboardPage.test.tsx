import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardPage } from './DashboardPage'

vi.mock('../lib/useActiveVersion', () => ({
  useActiveVersion: () => ({
    versionId: null,
    versionName: null,
    year: null,
    isLoading: false,
  }),
}))

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('DashboardPage', () => {
  it('başlık Yönetici Paneli olarak görünür (Executive Dashboard değil)', () => {
    renderPage()
    expect(screen.getByText('Yönetici Paneli')).toBeInTheDocument()
    expect(screen.queryByText(/Executive Dashboard/i)).not.toBeInTheDocument()
  })

  it('aktif versiyon yoksa Yeni Versiyon Oluştur CTA görünür', () => {
    renderPage()
    const cta = screen.getByRole('link', { name: /Yeni Versiyon Oluştur/i })
    expect(cta).toHaveAttribute('href', '/budget/planning?tab=versions')
  })

  it('boş durum açıklayıcı metin gösterir', () => {
    renderPage()
    expect(screen.getByText(/Henüz aktif bütçe versiyonu yok/i)).toBeInTheDocument()
  })
})
