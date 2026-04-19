import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SidebarSection } from './SidebarSection'
import type { SidebarSection as SidebarSectionType } from './sidebar-config'

const fixture: SidebarSectionType = {
  id: 'test-section',
  label: 'Test Section',
  icon: 'folder',
  defaultOpen: false,
  items: [
    { label: 'Item A', to: '/a', icon: 'home' },
    { label: 'Item B', to: '/b', icon: 'home' },
  ],
}

function renderSection(section: SidebarSectionType = fixture) {
  return render(
    <MemoryRouter>
      <SidebarSection section={section} />
    </MemoryRouter>,
  )
}

describe('SidebarSection', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaultOpen false → children initially hidden', () => {
    renderSection()
    expect(screen.queryByText('Item A')).not.toBeInTheDocument()
  })

  it('defaultOpen true → children visible', () => {
    renderSection({ ...fixture, defaultOpen: true })
    expect(screen.getByText('Item A')).toBeInTheDocument()
  })

  it('click header toggles open state + persists to localStorage', () => {
    renderSection()
    fireEvent.click(screen.getByText('Test Section'))
    expect(screen.getByText('Item A')).toBeInTheDocument()
    expect(localStorage.getItem('sidebar-section-open:test-section')).toBe('1')
  })

  it('renders as direct link when items is empty', () => {
    const linkSection: SidebarSectionType = {
      id: 'home',
      label: 'Ana Sayfa',
      icon: 'dashboard',
      defaultOpen: false,
      to: '/',
      end: true,
      items: [],
    }
    renderSection(linkSection)
    expect(screen.getByText('Ana Sayfa').closest('a')).toHaveAttribute('href', '/')
  })
})
