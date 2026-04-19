import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageIntro } from './PageIntro'
import { EmptyState } from './EmptyState'

describe('PageIntro', () => {
  it('title + purpose + actions render edilir', () => {
    render(
      <PageIntro
        title="Test Sayfası"
        purpose="Bu ekran X için kullanılır."
        actions={<button type="button">Yeni Ekle</button>}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Test Sayfası' })).toBeInTheDocument()
    expect(screen.getByText(/Bu ekran X için kullanılır/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Yeni Ekle' })).toBeInTheDocument()
  })

  it('purpose ve actions yoksa sadece title render', () => {
    render(<PageIntro title="Sadece Başlık" />)
    expect(screen.getByRole('heading', { name: 'Sadece Başlık' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('context prop badge/chip render eder', () => {
    render(
      <PageIntro
        title="X"
        context={<span data-testid="ctx">badge</span>}
      />,
    )
    expect(screen.getByTestId('ctx')).toBeInTheDocument()
  })
})

describe('EmptyState', () => {
  it('icon + title + description + cta render', () => {
    render(
      <EmptyState
        icon="inbox"
        title="Henüz veri yok"
        description="Eklemek için butona tıklayın."
        cta={<button type="button">Ekle</button>}
      />,
    )
    expect(screen.getByText('Henüz veri yok')).toBeInTheDocument()
    expect(screen.getByText(/Eklemek için butona/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ekle' })).toBeInTheDocument()
    // icon name DOM'da text olarak bırakılır (material symbols font)
    expect(screen.getByText('inbox')).toBeInTheDocument()
  })

  it('description + cta opsiyonel — sadece title yeterli', () => {
    render(<EmptyState icon="inbox" title="Boş" />)
    expect(screen.getByText('Boş')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
