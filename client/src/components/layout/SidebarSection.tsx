import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  type SidebarSection as SidebarSectionType,
  type SidebarItem,
  readSectionOpen,
  writeSectionOpen,
} from './sidebar-config'

interface Props {
  section: SidebarSectionType
}

function matchItem(
  item: SidebarItem,
  pathname: string,
  search: string,
): boolean {
  const [itemPath] = item.to.split('?')
  if (itemPath !== pathname) return false

  const params = new URLSearchParams(search)
  const currentTab = params.get('tab')

  if (item.matchTabParam) {
    return currentTab === item.matchTabParam
  }
  // "Bütçe Planlama" linki için tab=versions olanı hariç tut
  if (itemPath === '/budget/planning') {
    return currentTab !== 'versions'
  }
  return true
}

export function SidebarSection({ section }: Props) {
  const [open, setOpen] = useState(() =>
    readSectionOpen(section.id, section.defaultOpen),
  )
  const location = useLocation()

  // Section tek-link modu (items boş)
  if (section.items.length === 0 && section.to) {
    return (
      <NavLink
        to={section.to}
        end={section.end}
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        {section.icon && (
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            {section.icon}
          </span>
        )}
        {section.label}
      </NavLink>
    )
  }

  function toggle() {
    const next = !open
    setOpen(next)
    writeSectionOpen(section.id, next)
  }

  return (
    <div className="sidebar-section">
      <button
        type="button"
        onClick={toggle}
        className="sidebar-section-header"
        aria-expanded={open}
        data-section-id={section.id}
      >
        {section.icon && (
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            {section.icon}
          </span>
        )}
        <span className="flex-1 text-left">{section.label}</span>
        <span
          className="material-symbols-outlined transition-transform"
          style={{ fontSize: 16, transform: open ? 'rotate(180deg)' : 'none' }}
        >
          expand_more
        </span>
      </button>

      {open && (
        <div className="sidebar-section-items">
          {section.items.map((item) => {
            const active = matchItem(item, location.pathname, location.search)
            // className'i callback olarak veriyoruz — string verirsek NavLink
            // kendi default 'active' class'ını da ekliyor ve query string
            // farklılığını (?tab=versions) ayırt edemiyor. Callback verirsek
            // NavLink override etmiyor; kendi matchItem sonucumuz tek otorite.
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={() =>
                  active
                    ? 'nav-item nav-item-child active'
                    : 'nav-item nav-item-child'
                }
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 18 }}
                >
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            )
          })}
        </div>
      )}
    </div>
  )
}
