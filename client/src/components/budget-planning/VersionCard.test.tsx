import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import {
  VersionCard,
  sortVersionsForDisplay,
  type VersionCardVersion,
  type VersionCardRoles,
  type VersionCardHandlers,
} from './VersionCard'

const baseVersion: VersionCardVersion = {
  id: 1,
  budgetYearId: 1,
  name: 'v2026.1',
  status: 'Draft',
  isActive: false,
  rejectionReason: null,
  createdAt: '2026-01-15T00:00:00Z',
}

const allRoles: VersionCardRoles = {
  isAdmin: true,
  isFinance: true,
  isCfo: true,
}

const noopHandlers: VersionCardHandlers = {
  goToPlanning: vi.fn(),
  transition: vi.fn(),
  createRevision: vi.fn(),
  reject: vi.fn(),
  archive: vi.fn(),
}

function renderCard(version: VersionCardVersion, roles = allRoles) {
  return render(
    <MemoryRouter>
      <VersionCard version={version} roles={roles} handlers={noopHandlers} />
    </MemoryRouter>,
  )
}

describe('VersionCard — status renk şeridi', () => {
  it('Active → border-l-success', () => {
    const { container } = renderCard({
      ...baseVersion,
      status: 'Active',
      isActive: true,
    })
    expect(container.querySelector('.border-l-success')).toBeTruthy()
    expect(screen.getByText('Aktif')).toBeInTheDocument()
  })

  it('Draft → border-l-warning', () => {
    const { container } = renderCard({ ...baseVersion, status: 'Draft' })
    expect(container.querySelector('.border-l-warning')).toBeTruthy()
  })

  it('PendingFinance → border-l-primary', () => {
    const { container } = renderCard({
      ...baseVersion,
      status: 'PendingFinance',
    })
    expect(container.querySelector('.border-l-primary')).toBeTruthy()
  })

  it('Rejected → border-l-error', () => {
    const { container } = renderCard({ ...baseVersion, status: 'Rejected' })
    expect(container.querySelector('.border-l-error')).toBeTruthy()
  })
})

describe('VersionCard — primary action rol matrix', () => {
  it('PendingFinance + isFinance → Finans Onayla butonu', () => {
    renderCard({ ...baseVersion, status: 'PendingFinance' })
    expect(
      screen.getByRole('button', { name: /Finans Onayla/i }),
    ).toBeInTheDocument()
  })

  it('PendingCfo + isCfo → Onayla ve Yayına Al', () => {
    renderCard({ ...baseVersion, status: 'PendingCfo' })
    expect(
      screen.getByRole('button', { name: /Onayla ve Yayına Al/i }),
    ).toBeInTheDocument()
  })

  it('Active + isFinance → Revizyon Aç', () => {
    renderCard({ ...baseVersion, status: 'Active', isActive: true })
    expect(
      screen.getByRole('button', { name: /Revizyon Aç/i }),
    ).toBeInTheDocument()
  })

  it('PendingCfo + sadece Finance rolü → buton yok', () => {
    renderCard(
      { ...baseVersion, status: 'PendingCfo' },
      { isAdmin: false, isFinance: true, isCfo: false },
    )
    expect(
      screen.queryByRole('button', { name: /Onayla/i }),
    ).not.toBeInTheDocument()
  })

  it('Rolsüz kullanıcı + PendingCfo → primary action butonu yok', () => {
    renderCard(
      { ...baseVersion, status: 'PendingCfo' },
      { isAdmin: false, isFinance: false, isCfo: false },
    )
    // Primary action butonu (Onayla, Devam Et, Revizyon Aç vb.) render edilmemeli.
    // ⋯ menüsündeki Reddet butonu role bağımsız (mevcut davranış korunur).
    expect(
      screen.queryByRole('button', { name: /Onayla|Devam Et|Revizyon|Düzelt/i }),
    ).not.toBeInTheDocument()
  })
})

describe('VersionCard — sıradaki adım', () => {
  it('Sıradaki adım metni görünür', () => {
    renderCard({ ...baseVersion, status: 'Draft' })
    expect(screen.getByText(/Sıradaki adım/i)).toBeInTheDocument()
  })
})

describe('sortVersionsForDisplay', () => {
  it('Aktif versiyon her zaman en üstte', () => {
    const v1: VersionCardVersion = {
      ...baseVersion,
      id: 1,
      status: 'Draft',
      createdAt: '2026-04-15T00:00:00Z',
    }
    const v2: VersionCardVersion = {
      ...baseVersion,
      id: 2,
      status: 'Active',
      isActive: true,
      createdAt: '2026-01-15T00:00:00Z',
    }
    const sorted = sortVersionsForDisplay([v1, v2])
    expect(sorted[0].id).toBe(2)
    expect(sorted[1].id).toBe(1)
  })

  it('Archived en altta', () => {
    const v1: VersionCardVersion = {
      ...baseVersion,
      id: 1,
      status: 'Archived',
    }
    const v2: VersionCardVersion = { ...baseVersion, id: 2, status: 'Draft' }
    const sorted = sortVersionsForDisplay([v1, v2])
    expect(sorted[0].id).toBe(2)
    expect(sorted[sorted.length - 1].id).toBe(1)
  })

  it('Aynı bucket → createdAt desc', () => {
    const v1: VersionCardVersion = {
      ...baseVersion,
      id: 1,
      status: 'Draft',
      createdAt: '2026-01-15T00:00:00Z',
    }
    const v2: VersionCardVersion = {
      ...baseVersion,
      id: 2,
      status: 'Draft',
      createdAt: '2026-04-15T00:00:00Z',
    }
    const sorted = sortVersionsForDisplay([v1, v2])
    expect(sorted[0].id).toBe(2)
  })
})
