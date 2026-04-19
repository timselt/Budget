import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RoleGuard } from './RoleGuard'

const mockUser = vi.fn()
vi.mock('../../stores/auth', () => ({
  useAuthStore: () => ({ user: mockUser() }),
}))

function renderGuard(allow: ('Admin' | 'CFO' | 'FinanceManager')[]) {
  return render(
    <MemoryRouter initialEntries={['/forecast']}>
      <Routes>
        <Route
          path="/forecast"
          element={
            <RoleGuard allow={allow}>
              <div>OK</div>
            </RoleGuard>
          }
        />
        <Route path="/forbidden" element={<div>FORBIDDEN_LANDING</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RoleGuard', () => {
  beforeEach(() => mockUser.mockReset())

  it('yetkili kullanıcı children render eder', () => {
    mockUser.mockReturnValue({ roles: ['Admin'] })
    renderGuard(['Admin'])
    expect(screen.getByText('OK')).toBeInTheDocument()
  })

  it('rolü uyuşan kullanıcı (CFO ile FinanceManager) children render eder', () => {
    mockUser.mockReturnValue({ roles: ['CFO'] })
    renderGuard(['Admin', 'CFO', 'FinanceManager'])
    expect(screen.getByText('OK')).toBeInTheDocument()
  })

  it('yetkisiz kullanıcı /forbidden landing yönlendirilir', () => {
    mockUser.mockReturnValue({ roles: ['Viewer'] })
    renderGuard(['Admin'])
    expect(screen.queryByText('OK')).not.toBeInTheDocument()
    expect(screen.getByText('FORBIDDEN_LANDING')).toBeInTheDocument()
  })

  it('user henüz yüklenmediyse children render eder (AuthGuard koruyor)', () => {
    mockUser.mockReturnValue(null)
    renderGuard(['Admin'])
    expect(screen.getByText('OK')).toBeInTheDocument()
  })
})
