# Sidebar Information Architecture Redesign — Implementation Plan

**Tarih:** 2026-04-19
**Design doc:** [`2026-04-19-sidebar-information-architecture-redesign-design.md`](./2026-04-19-sidebar-information-architecture-redesign-design.md)
**Hedef branch:** `main` (feature branch isteğe bağlı)

---

## Goal

Mevcut düz liste sidebar'ı (20 item, iki array) iş akışına göre gruplanmış 8-section accordion yapısına çevir; kullanıcı dili kullan; aktif yıl+versiyon bağlamını sidebar üstünde sabit göster; BudgetEntryPage'in local versiyon state'ini global `appContext` store'una taşı.

## Architecture

React 19 + Vite + TypeScript stack. State: Zustand (mevcut `useAppContextStore` genişletilir — yeni store açılmaz), server state: TanStack Query (mevcut `useActiveVersion` hook korunur). Routing: React Router v7. Sidebar config düz array'lerden immutable `SidebarSection[]` ağaç yapısına geçer, accordion state localStorage'a `sidebar-section-open:<id>` prefix'iyle yazılır.

## Tech Stack

- **UI:** React 19, TypeScript, Tailwind CSS 4
- **State:** Zustand 5 (mevcut `appContext.ts` genişletilir)
- **Routing:** React Router DOM 7
- **Icons:** Material Symbols (mevcut `.material-symbols-outlined` class)
- **Testing:** Vitest (kurulu ama test dosyası yok; ilk test bu plan'da yazılır), Playwright (E2E)

---

## Ön Koşullar

Başlamadan önce:

```bash
cd client
pnpm install                    # Bağımlılıklar güncel mi
pnpm lint                       # Baseline clean mi
pnpm build                      # Baseline build clean mi
git status                      # Temiz working tree
```

Bekleme: Lint clean, build clean, `git status` clean.

---

# Commit Sırası

Toplam **8 commit**. Her commit sonrası:
1. `pnpm lint` — clean
2. `pnpm build` — clean
3. Manuel smoke test (browser): sidebar görünüyor mu, tıklanan route çalışıyor mu
4. `git commit`

---

## Commit 1 — RevisionsPage placeholder + route

**Amaç:** Sidebar'a `Revizyonlar` linkini koymadan önce hedef sayfa var olsun.

### Files

| Aksiyon | Dosya |
|---------|-------|
| Create | `client/src/pages/RevisionsPage.tsx` |
| Modify | `client/src/App.tsx` |

### Adımlar

**1.1** `RevisionsPage.tsx` oluştur:

```tsx
export function RevisionsPage() {
  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Revizyonlar</h1>
        <p className="page-subtitle">Bütçe revizyon akışı ve değişiklik geçmişi</p>
      </header>

      <div className="card mt-6 p-8 text-center">
        <span
          className="material-symbols-outlined text-primary"
          style={{ fontSize: 48 }}
        >
          schedule
        </span>
        <h2 className="mt-4 text-xl font-semibold">Yakında</h2>
        <p className="mt-2 text-on-surface-variant">
          Revizyon yönetimi bir sonraki sürümde devreye girecek. Şimdilik Bütçe
          Planlama → Versiyonlar sekmesinden versiyon geçmişine ulaşabilirsiniz.
        </p>
      </div>
    </div>
  )
}
```

**1.2** `App.tsx`'e lazy import + route ekle:

```tsx
// Import listesine ekle:
const RevisionsPage = lazy(() =>
  import('./pages/RevisionsPage').then((m) => ({ default: m.RevisionsPage })),
)

// Route listesinde /audit'den önce:
<Route path="revisions" element={<RevisionsPage />} />
```

**1.3** Doğrula:

```bash
pnpm lint && pnpm build
pnpm dev
# http://localhost:5173/revisions → "Yakında" kartı görünmeli
```

**1.4** Commit:

```bash
git add client/src/pages/RevisionsPage.tsx client/src/App.tsx
git commit -m "feat(client): RevisionsPage placeholder + /revisions route

Sidebar redesign P1 hazırlığı. Revizyon yönetimi P3'e kadar
'Yakında' kartı olarak gösterilir."
```

---

## Commit 2 — `appContext` store'a versiyon alanları ekle

**Amaç:** BudgetEntryPage'in local versiyon state'ini global'e taşımadan önce store altyapısını hazırla. Bu commit'te henüz hiç yer store'u kullanmıyor — pure genişletme.

### Files

| Aksiyon | Dosya |
|---------|-------|
| Modify | `client/src/stores/appContext.ts` |
| Create | `client/src/stores/appContext.test.ts` |

### Adımlar

**2.1** İlk test yaz (RED). `client/src/stores/appContext.test.ts`:

```ts
import { describe, expect, it, beforeEach } from 'vitest'
import { useAppContextStore } from './appContext'

describe('useAppContextStore — version fields', () => {
  beforeEach(() => {
    useAppContextStore.getState().setVersion(null)
  })

  it('initial state version fields are null', () => {
    const { selectedVersionId, selectedVersionLabel, selectedVersionStatus } =
      useAppContextStore.getState()
    expect(selectedVersionId).toBeNull()
    expect(selectedVersionLabel).toBeNull()
    expect(selectedVersionStatus).toBeNull()
  })

  it('setVersion updates all three fields atomically', () => {
    useAppContextStore.getState().setVersion({
      id: 42,
      label: 'V5 Taslak',
      status: 'Draft',
    })
    const state = useAppContextStore.getState()
    expect(state.selectedVersionId).toBe(42)
    expect(state.selectedVersionLabel).toBe('V5 Taslak')
    expect(state.selectedVersionStatus).toBe('Draft')
  })

  it('setVersion(null) clears all three fields', () => {
    useAppContextStore.getState().setVersion({ id: 1, label: 'x', status: 'y' })
    useAppContextStore.getState().setVersion(null)
    const state = useAppContextStore.getState()
    expect(state.selectedVersionId).toBeNull()
    expect(state.selectedVersionLabel).toBeNull()
    expect(state.selectedVersionStatus).toBeNull()
  })
})
```

**2.2** Testi çalıştır ve fail ettiğini gör (RED):

```bash
cd client && pnpm test appContext
# Bekleme: "setVersion is not a function" veya alan yok hatası
```

**2.3** Store'u genişlet. `client/src/stores/appContext.ts`:

```ts
// interface AppContextState içine ekle:
selectedVersionId: number | null
selectedVersionLabel: string | null
selectedVersionStatus: string | null
setVersion: (v: { id: number; label: string; status: string } | null) => void

// create içine ekle:
selectedVersionId: null,
selectedVersionLabel: null,
selectedVersionStatus: null,

setVersion: (v) => set({
  selectedVersionId: v?.id ?? null,
  selectedVersionLabel: v?.label ?? null,
  selectedVersionStatus: v?.status ?? null,
}),
```

**2.4** Testi tekrar çalıştır (GREEN):

```bash
pnpm test appContext
# Bekleme: 3 passed
```

**2.5** Commit:

```bash
git add client/src/stores/appContext.ts client/src/stores/appContext.test.ts
git commit -m "feat(client): appContext store'a versiyon alanları ekle

selectedVersionId / selectedVersionLabel / selectedVersionStatus +
setVersion action. Sidebar bağlam satırı ve BudgetEntryPage refactor
hazırlığı. Mevcut tüketici yok — sadece altyapı."
```

---

## Commit 3 — SidebarSection bileşeni + config

**Amaç:** Accordion davranışı ve config modelini kur. Sidebar henüz dokunulmaz.

### Files

| Aksiyon | Dosya |
|---------|-------|
| Create | `client/src/components/layout/sidebar-config.ts` |
| Create | `client/src/components/layout/SidebarSection.tsx` |
| Create | `client/src/components/layout/SidebarSection.test.tsx` |

### Adımlar

**3.1** Config dosyası. `client/src/components/layout/sidebar-config.ts`:

```ts
export interface SidebarItem {
  label: string
  to: string
  icon: string
  end?: boolean
  matchTabParam?: string   // "Versiyonlar" için query param eşleşmesi
}

export interface SidebarSection {
  id: string
  label: string
  icon?: string
  defaultOpen: boolean
  /**
   * Alt item'lar. Boş array "section değil, tek başına tıklanabilir item" anlamına
   * gelir (Ana Sayfa gibi). Bu durumda `to` + `icon` item dan gelir.
   */
  items: SidebarItem[]
  /** items boşsa kendisi link. */
  to?: string
  end?: boolean
}

export const SIDEBAR_SECTIONS: readonly SidebarSection[] = [
  {
    id: 'home',
    label: 'Ana Sayfa',
    icon: 'dashboard',
    to: '/',
    end: true,
    defaultOpen: false,
    items: [],
  },
  {
    id: 'budget-work',
    label: 'Bütçe Çalışması',
    icon: 'edit_note',
    defaultOpen: true,
    items: [
      {
        label: 'Versiyonlar',
        to: '/budget/planning?tab=versions',
        icon: 'history_edu',
        matchTabParam: 'versions',
      },
      { label: 'Bütçe Planlama', to: '/budget/planning', icon: 'edit_note' },
      { label: 'Gider Girişi', to: '/expenses', icon: 'payments' },
      { label: 'Özel Kalemler', to: '/special-items', icon: 'bookmark_star' },
    ],
  },
  {
    id: 'actuals',
    label: 'Gerçekleşenler',
    icon: 'receipt_long',
    defaultOpen: false,
    items: [
      { label: 'Gerçekleşen', to: '/actuals', icon: 'receipt_long' },
      { label: 'Tahsilat', to: '/collections', icon: 'account_balance_wallet' },
    ],
  },
  {
    id: 'approvals',
    label: 'Onay ve Yayın',
    icon: 'verified',
    defaultOpen: true,
    items: [
      { label: 'Onaylar', to: '/approvals', icon: 'verified' },
      { label: 'Revizyonlar', to: '/revisions', icon: 'track_changes' },
    ],
  },
  {
    id: 'analysis',
    label: 'Analizler',
    icon: 'insights',
    defaultOpen: false,
    items: [
      { label: 'Sapma Analizi', to: '/variance', icon: 'compare_arrows' },
      { label: 'Senaryolar', to: '/scenarios', icon: 'insights' },
      { label: 'Tahmin', to: '/forecast', icon: 'trending_up' },
      { label: 'Konsolidasyon', to: '/consolidation', icon: 'hub' },
    ],
  },
  {
    id: 'reports',
    label: 'Raporlar',
    icon: 'assessment',
    defaultOpen: false,
    items: [
      { label: 'Rapor Merkezi', to: '/reports', icon: 'assessment', end: true },
      { label: 'P&L Raporu', to: '/reports/pnl', icon: 'monitoring' },
    ],
  },
  {
    id: 'definitions',
    label: 'Tanımlar',
    icon: 'category',
    defaultOpen: false,
    items: [
      { label: 'Müşteriler', to: '/customers', icon: 'groups' },
      { label: 'Ürünler', to: '/products', icon: 'inventory_2' },
      { label: 'Sözleşmeler', to: '/contracts', icon: 'assignment' },
      { label: 'Segmentler', to: '/segments', icon: 'category' },
      { label: 'Gider Kategorileri', to: '/expense-categories', icon: 'receipt' },
    ],
  },
  {
    id: 'system',
    label: 'Sistem',
    icon: 'settings',
    defaultOpen: false,
    items: [
      { label: 'İşlem Geçmişi', to: '/audit', icon: 'history' },
      { label: 'Sistem Yönetimi', to: '/admin', icon: 'admin_panel_settings' },
    ],
  },
] as const

const STORAGE_KEY_PREFIX = 'sidebar-section-open:'

export function storageKeyFor(sectionId: string): string {
  return `${STORAGE_KEY_PREFIX}${sectionId}`
}

export function readSectionOpen(sectionId: string, defaultOpen: boolean): boolean {
  try {
    const raw = localStorage.getItem(storageKeyFor(sectionId))
    if (raw === null) return defaultOpen
    return raw === '1'
  } catch {
    return defaultOpen
  }
}

export function writeSectionOpen(sectionId: string, open: boolean): void {
  try {
    localStorage.setItem(storageKeyFor(sectionId), open ? '1' : '0')
  } catch {
    // localStorage kullanılamıyor → sessizce geç
  }
}
```

**3.2** İlk test (RED). `client/src/components/layout/SidebarSection.test.tsx`:

```tsx
import { describe, expect, it, beforeEach, vi } from 'vitest'
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

function renderSection(section = fixture) {
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
```

**3.3** `SidebarSection.tsx` implement et:

```tsx
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
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={`nav-item nav-item-child ${active ? 'active' : ''}`}
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
```

**3.4** Test geçmeli:

```bash
pnpm test SidebarSection
# Bekleme: 4 passed
```

**3.5** CSS ekleme gerekli mi kontrol et. `client/src/index.css` veya `finopstur.css` içinde:

```bash
grep -n "nav-item\|sidebar-section" client/src/index.css client/src/styles/finopstur.css
```

Eğer `sidebar-section-header` yoksa bu class'lar için minimal stil ekle (mevcut `nav-item` ile uyumlu):

```css
.sidebar-section-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255,255,255,0.5);
  border-radius: 0.5rem;
  transition: color 0.15s, background-color 0.15s;
}

.sidebar-section-header:hover {
  color: rgba(255,255,255,0.9);
  background-color: rgba(255,255,255,0.04);
}

.sidebar-section-items {
  padding-left: 0.5rem;
}

.nav-item-child {
  font-size: 0.875rem;
}
```

**3.6** Build + test + commit:

```bash
pnpm lint && pnpm build && pnpm test
git add client/src/components/layout/sidebar-config.ts \
        client/src/components/layout/SidebarSection.tsx \
        client/src/components/layout/SidebarSection.test.tsx \
        client/src/index.css client/src/styles/finopstur.css
git commit -m "feat(client): SidebarSection accordion + config modeli

sidebar-config.ts: SidebarSection[] veri tanımı, readSectionOpen/
writeSectionOpen localStorage yardımcıları.
SidebarSection.tsx: accordion davranışı + custom 'Versiyonlar' tab
matcher.
Testler: defaultOpen, toggle + persist, tek-link section modu.
Henüz Sidebar.tsx bağlanmadı — sonraki commit."
```

---

## Commit 4 — Sidebar.tsx refactor (section bazlı render)

**Amaç:** Eski `mainNav`/`mgmtNav` array'lerini kaldır, `SIDEBAR_SECTIONS` üzerinden render et. `Rapor İndir` butonunu sidebar'dan çıkar. Bağlam satırı henüz eklenmez.

### Files

| Aksiyon | Dosya |
|---------|-------|
| Modify | `client/src/components/layout/Sidebar.tsx` |

### Adımlar

**4.1** `Sidebar.tsx`'i yeniden yaz:

```tsx
import { useAuthStore } from '../../stores/auth'
import { SIDEBAR_SECTIONS } from './sidebar-config'
import { SidebarSection } from './SidebarSection'

function getInitials(name: string | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const roleLine = user?.roles?.[0] ?? 'CEO • Tur Assist'
  const displayName = user?.displayName ?? 'Timur Turan'

  return (
    <aside className="w-64 fixed left-0 top-0 h-screen bg-secondary text-on-secondary flex flex-col py-6 px-3 z-50">
      <div className="px-3 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span
              className="material-symbols-outlined text-white"
              style={{ fontSize: 18 }}
            >
              insights
            </span>
          </div>
          <h1 className="text-xl font-black tracking-display text-white">
            FinOps<span className="text-primary">Tur</span>
          </h1>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto pr-1 space-y-1">
        {SIDEBAR_SECTIONS.map((section) => (
          <SidebarSection key={section.id} section={section} />
        ))}
      </nav>

      <div className="mt-4 px-2">
        <div className="flex items-center gap-3 pl-1">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
            {getInitials(displayName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {displayName}
            </p>
            <p className="text-[0.65rem] text-white/60 truncate">{roleLine}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="p-1.5 text-white/70 hover:text-white transition-colors rounded-md"
            title="Çıkış"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 18 }}
            >
              logout
            </span>
          </button>
        </div>
      </div>
    </aside>
  )
}
```

**4.2** Manuel smoke test. `pnpm dev` aç, tarayıcıda:

- Sidebar 8 section görünüyor mu: Ana Sayfa, Bütçe Çalışması, Gerçekleşenler, Onay ve Yayın, Analizler, Raporlar, Tanımlar, Sistem
- `Bütçe Çalışması` açık (default)
- `Onay ve Yayın` açık (default)
- `Gerçekleşenler / Analizler / Raporlar / Tanımlar / Sistem` kapalı
- Tıkla → açılıyor → sayfa refresh sonrası kalıyor
- `Ana Sayfa` tıklanınca `/` route
- `Versiyonlar` tıklanınca `/budget/planning?tab=versions` + sadece kendisi active
- `Bütçe Planlama` tıklanınca `/budget/planning` (tab=versions olmadan) + sadece kendisi active
- `Rapor İndir` butonu **kaybolmuş**
- Eski isimler (`Dashboard`, `Forecast`, `Onay Akışı`, `Audit Log`, `Yönetim`, `Kategori Yönetimi`, `Müşteri Yönetimi`, `Ürün Yönetimi`) **kaybolmuş**
- Yeni isimler görünüyor: `Ana Sayfa`, `Tahmin`, `Onaylar`, `İşlem Geçmişi`, `Sistem Yönetimi`, `Segmentler`, `Müşteriler`, `Ürünler`

**4.3** Lint + build:

```bash
pnpm lint && pnpm build
```

**4.4** Commit:

```bash
git add client/src/components/layout/Sidebar.tsx
git commit -m "feat(client): sidebar section bazlı yapıya geçiş

mainNav/mgmtNav düz array'leri SIDEBAR_SECTIONS config'ine taşındı.
İsim dönüşümleri uygulandı: Dashboard→Ana Sayfa, Forecast→Tahmin,
Onay Akışı→Onaylar, Audit Log→İşlem Geçmişi, Yönetim→Sistem Yönetimi,
Kategori Yönetimi→Segmentler, Müşteri/Ürün Yönetimi→Müşteriler/Ürünler.
Rapor İndir butonu kaldırıldı (bağlamsız global aksiyon)."
```

---

## Commit 5 — SidebarContextBar + appContext'e hydration

**Amaç:** Sidebar üstünde "2026 / V5 Taslak" bağlam satırını göster. `useActiveVersion` hook'u ile store'u hydrate et.

### Files

| Aksiyon | Dosya |
|---------|-------|
| Create | `client/src/components/layout/SidebarContextBar.tsx` |
| Modify | `client/src/components/layout/Sidebar.tsx` |

### Adımlar

**5.1** `SidebarContextBar.tsx` oluştur:

```tsx
import { useEffect } from 'react'
import { useAppContextStore } from '../../stores/appContext'
import { useActiveVersion } from '../../lib/useActiveVersion'

function statusLabel(status: string | null): string {
  if (!status) return ''
  const map: Record<string, string> = {
    Draft: 'Taslak',
    Submitted: 'Gönderildi',
    DeptApproved: 'Dept. Onaylı',
    FinanceApproved: 'Finans Onaylı',
    CfoApproved: 'CFO Onaylı',
    Active: 'Aktif',
    Archived: 'Arşiv',
  }
  return map[status] ?? status
}

function statusClass(status: string | null): string {
  switch (status) {
    case 'Active':
      return 'bg-green-500/20 text-green-300'
    case 'Draft':
      return 'bg-amber-500/20 text-amber-300'
    case 'CfoApproved':
    case 'FinanceApproved':
    case 'DeptApproved':
      return 'bg-blue-500/20 text-blue-300'
    default:
      return 'bg-white/10 text-white/70'
  }
}

export function SidebarContextBar() {
  const { selectedVersionId, selectedVersionLabel, selectedVersionStatus, setVersion } =
    useAppContextStore()
  const { selectedYear } = useAppContextStore()
  const active = useActiveVersion()

  // Store boşsa server auto-select ile hydrate et
  useEffect(() => {
    if (selectedVersionId === null && active.versionId !== null && active.versionName) {
      // status bilgisi useActiveVersion tarafından dönmüyor → "Active" varsayımı
      // (hook zaten aktif olanı öncelikli seçiyor). Doğru status store'a başka yerden
      // BudgetEntryPage seçim yaptığında yazılır.
      setVersion({
        id: active.versionId,
        label: active.versionName,
        status: 'Active',
      })
    }
  }, [active.versionId, active.versionName, selectedVersionId, setVersion])

  // Hiçbir bağlam yoksa satırı gösterme
  if (!selectedVersionLabel && !selectedYear) return null

  return (
    <div className="px-3 pb-4">
      <div className="rounded-lg bg-white/5 px-3 py-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-white/50 uppercase tracking-wider text-[0.625rem]">
              Aktif Bağlam
            </div>
            <div className="text-white font-semibold truncate">
              {selectedYear}
              {selectedVersionLabel ? ` / ${selectedVersionLabel}` : ''}
            </div>
          </div>
          {selectedVersionStatus && (
            <span
              className={`px-2 py-0.5 rounded text-[0.625rem] font-semibold ${statusClass(selectedVersionStatus)}`}
            >
              {statusLabel(selectedVersionStatus)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
```

**5.2** `Sidebar.tsx`'e ekle. Logo ile nav arasına:

```tsx
// import:
import { SidebarContextBar } from './SidebarContextBar'

// logo div'inden sonra, <nav> öncesi:
<SidebarContextBar />
```

**5.3** Manuel test:

```bash
pnpm dev
```

Login ol → dashboard'a in → sidebar'da "2026 / <versiyon adı>" bağlam satırı görünmeli. `/budget/planning` sayfasına git → versiyon değiştir (commit 6'dan önce bu henüz store'u değiştirmeyecek, sadece initial hydrate görünecek — bu beklenen).

**5.4** Lint + build + commit:

```bash
pnpm lint && pnpm build
git add client/src/components/layout/SidebarContextBar.tsx \
        client/src/components/layout/Sidebar.tsx
git commit -m "feat(client): sidebar bağlam satırı — aktif yıl/versiyon/durum

SidebarContextBar useActiveVersion hook'u ile appContext store'unu
hydrate eder. Status rozeti Turkish etiketlerle gösterilir (Taslak,
Aktif, Onaylı, vb.). Store boşsa satır gizli.
BudgetEntryPage versiyon seçiminin store'a yazılması sonraki commit."
```

---

## Commit 6 — BudgetEntryPage local state → store

**Amaç:** Kullanıcı versiyon dropdown'unu değiştirdiğinde sidebar bağlam satırı senkron güncellensin.

### Files

| Aksiyon | Dosya |
|---------|-------|
| Modify | `client/src/pages/BudgetEntryPage.tsx` |

### Adımlar

**6.1** Mevcut durumu bul. `BudgetEntryPage.tsx:67`:

```tsx
const [versionId, setVersionId] = useState<number | null>(null)
```

`BudgetEntryPage.tsx:166-167`:

```tsx
const active = versions.find((v) => v.isActive)
setVersionId((active ?? versions[0]).id)
```

**6.2** `useState` yerine store kullan:

```tsx
// Import ekle:
import { useAppContextStore } from '../stores/appContext'

// useState satırını kaldır, yerine:
const versionId = useAppContextStore((s) => s.selectedVersionId)
const setVersion = useAppContextStore((s) => s.setVersion)

// setVersionId çağrılarının hepsini güncelle. Örnek:
// Eski:
setVersionId((active ?? versions[0]).id)
// Yeni:
const v = active ?? versions[0]
setVersion({ id: v.id, label: v.name, status: v.status })
```

**6.3** Tüm `setVersionId` çağrılarını değiştir. `grep`:

```bash
grep -n "setVersionId" client/src/pages/BudgetEntryPage.tsx
```

Her birinde `setVersion({ id, label, status })` formatına geç. Bir versiyon değişince hem id hem label hem status senkron yazılmalı.

**6.4** Dropdown onChange handler'ı:

```tsx
// Dropdown içinde:
onChange={(e) => {
  const v = versions.find((x) => x.id === Number(e.target.value))
  if (v) setVersion({ id: v.id, label: v.name, status: v.status })
}}
```

**6.5** Manuel test:

1. Login → `/budget/planning`
2. Versiyon dropdown'u aç, farklı bir versiyon seç
3. Sidebar bağlam satırı **anında** güncellenmeli (label + status rozeti)
4. Başka sayfaya git → dön → seçim korunmalı
5. Yeni versiyon oluştur mutation'ı → sidebar yeni versiyona geçmeli

**6.6** Regresyon kontrolü — diğer sayfaların (`useActiveVersion` kullananlar) bozulmadığını doğrula:

- `/` → Dashboard yükleniyor
- `/variance` → Sapma analizi yükleniyor
- `/forecast` → Tahmin yükleniyor
- `/approvals` → Onaylar yükleniyor

**6.7** Lint + build + commit:

```bash
pnpm lint && pnpm build
git add client/src/pages/BudgetEntryPage.tsx
git commit -m "refactor(client): BudgetEntryPage versiyon state'i appContext'e taşındı

Local useState<versionId> kaldırıldı, useAppContextStore.setVersion
kullanılıyor. Sidebar bağlam satırı versiyon dropdown değişince anında
güncellenir. useActiveVersion tüketen diğer sayfalar (Dashboard,
Variance, Forecast, Approvals) değiştirilmedi — store'u hook üzerinden
hydrate ederler."
```

---

## Commit 7 — E2E smoke test (Playwright)

**Amaç:** Sidebar yapısı, accordion, bağlam satırı için regresyon guard'ı.

### Files

| Aksiyon | Dosya |
|---------|-------|
| Create | `client/e2e/sidebar.spec.ts` |

### Adımlar

**7.1** E2E mevcut mu kontrol et:

```bash
ls client/e2e/ 2>/dev/null
cat client/playwright.config.ts 2>/dev/null | head -30
```

Yoksa `playwright.config.ts` zaten `package.json`'da `"e2e": "playwright test"` script'i var. Yine de config dosyası yoksa `pnpm exec playwright install` + init gerekebilir — bu noktada kullanıcıya danışın.

**7.2** `client/e2e/sidebar.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'

test.describe('Sidebar — yeni bilgi mimarisi', () => {
  test.beforeEach(async ({ page }) => {
    // Login (mevcut test kullanıcısı veya session restore)
    await page.goto(`${BASE}/login`)
    // TODO: test user credentials
    await page.fill('input[type="email"]', 'timur.turan@gmail.com')
    await page.fill('input[type="password"]', process.env.TEST_PASSWORD ?? '')
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE}/`)
  })

  test('8 section doğru sırada görünüyor', async ({ page }) => {
    const sidebar = page.locator('aside')
    await expect(sidebar).toContainText('Ana Sayfa')
    await expect(sidebar).toContainText('Bütçe Çalışması')
    await expect(sidebar).toContainText('Gerçekleşenler')
    await expect(sidebar).toContainText('Onay ve Yayın')
    await expect(sidebar).toContainText('Analizler')
    await expect(sidebar).toContainText('Raporlar')
    await expect(sidebar).toContainText('Tanımlar')
    await expect(sidebar).toContainText('Sistem')
  })

  test('eski isimler sidebar'da görünmüyor', async ({ page }) => {
    const sidebar = page.locator('aside')
    await expect(sidebar).not.toContainText('Dashboard')
    await expect(sidebar).not.toContainText('Forecast')
    await expect(sidebar).not.toContainText('Audit Log')
    await expect(sidebar).not.toContainText('Onay Akışı')
    await expect(sidebar).not.toContainText('Kategori Yönetimi')
    await expect(sidebar).not.toContainText('Rapor İndir')
  })

  test('varsayılan açık: Bütçe Çalışması ve Onay ve Yayın', async ({ page }) => {
    // localStorage temiz başlamalı
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.locator('aside')).toContainText('Bütçe Planlama')
    await expect(page.locator('aside')).toContainText('Onaylar')
    // Kapalı section'ın child'ı görünmüyor
    await expect(page.locator('aside')).not.toContainText('Tahsilat')
  })

  test('accordion aç/kapa localStorage'a kaydediliyor', async ({ page }) => {
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.click('text=Gerçekleşenler')
    await expect(page.locator('aside')).toContainText('Tahsilat')
    await page.reload()
    await expect(page.locator('aside')).toContainText('Tahsilat')
    const key = await page.evaluate(() =>
      localStorage.getItem('sidebar-section-open:actuals'),
    )
    expect(key).toBe('1')
  })

  test('Revizyonlar tıklanınca placeholder görünüyor', async ({ page }) => {
    await page.click('text=Onay ve Yayın')  // zaten açık değilse aç
    await page.click('text=Revizyonlar')
    await expect(page).toHaveURL(/\/revisions$/)
    await expect(page.locator('h1, h2').filter({ hasText: /Yakında|Revizyon/i })).toBeVisible()
  })

  test('bağlam satırı aktif yıl + versiyon gösteriyor', async ({ page }) => {
    const ctx = page.locator('aside').locator('text=Aktif Bağlam').locator('..')
    await expect(ctx).toContainText(/20\d{2}/)
  })

  test('Versiyonlar tab linki sadece tab=versions URL'de active', async ({ page }) => {
    await page.goto(`${BASE}/budget/planning`)
    const planningLink = page.locator('aside a[href="/budget/planning"]')
    const versionsLink = page.locator('aside a[href="/budget/planning?tab=versions"]')
    await expect(planningLink).toHaveClass(/active/)
    await expect(versionsLink).not.toHaveClass(/active/)

    await page.goto(`${BASE}/budget/planning?tab=versions`)
    await expect(versionsLink).toHaveClass(/active/)
    await expect(planningLink).not.toHaveClass(/active/)
  })
})
```

**7.3** Çalıştır:

```bash
# Dev server açıkken:
pnpm e2e sidebar
```

**7.4** Başarısız testler varsa düzelt (test kullanıcısı creds'i `.env` vs.).

**7.5** Commit:

```bash
git add client/e2e/sidebar.spec.ts
git commit -m "test(client): sidebar E2E smoke — yapı, accordion, bağlam satırı

Playwright testleri: 8 section sırası, eski isimlerin kalkması, default
açık/kapalı davranışı, localStorage persist, Revizyonlar placeholder,
bağlam satırı görünürlüğü, Versiyonlar tab query param aktif-state."
```

---

## Commit 8 — CHANGELOG ve docs güncelleme

**Amaç:** Release notes ve codemap'i güncelle.

### Files

| Aksiyon | Dosya |
|---------|-------|
| Modify | `CHANGELOG.md` |
| Modify | `docs/CODEMAPS/*` (varsa sidebar/layout ilgili) |

### Adımlar

**8.1** CHANGELOG.md'ye ekle:

```md
## [Unreleased]

### Changed
- Sidebar bilgi mimarisi iş akışı odaklı 8-section yapıya çevrildi.
  Eski düz 20 item'lık liste yerine `Ana Sayfa / Bütçe Çalışması /
  Gerçekleşenler / Onay ve Yayın / Analizler / Raporlar / Tanımlar /
  Sistem` grupları accordion olarak çalışır. Menü isimleri kullanıcı
  diline çekildi (Dashboard→Ana Sayfa, Forecast→Tahmin, Onay Akışı→
  Onaylar, Audit Log→İşlem Geçmişi, Yönetim→Sistem Yönetimi, Kategori
  Yönetimi→Segmentler).

### Added
- Sidebar bağlam satırı: aktif yıl + versiyon + durum rozeti
  (`SidebarContextBar.tsx`). `useAppContextStore`'a `selectedVersionId
  /Label/Status` + `setVersion` alanları eklendi.
- `/revisions` placeholder sayfası (Revizyonlar menüsü için).
- Sidebar accordion state localStorage persistency (`sidebar-section
  -open:<id>`).

### Removed
- Sidebar'daki bağlamsız "Rapor İndir" global butonu.
- `mainNav` ve `mgmtNav` düz array tanımları (artık `SIDEBAR_SECTIONS`
  config üzerinden).
```

**8.2** Codemap varsa güncelle:

```bash
ls docs/CODEMAPS/ 2>/dev/null
# Sidebar'ı kapsayan codemap varsa manuel veya /update-codemaps ile
```

**8.3** Commit:

```bash
git add CHANGELOG.md docs/CODEMAPS/
git commit -m "docs: sidebar redesign changelog + codemap güncelleme"
```

---

# Doğrulama Listesi (Tüm commit'ler sonrası)

Final kontroller — CLAUDE.md'deki "Bilinen Tuzaklar" ve memory'deki mock-data refleksi için:

**Build & Test:**
```bash
cd client
pnpm lint                # clean
pnpm build               # clean
pnpm test                # tüm unit testler geçmeli
pnpm e2e sidebar         # sidebar E2E geçmeli
```

**Mock-data audit (memory "feedback_mock_data_audit"):**
```bash
grep -rn "mock\|MOCK\|fake\|FAKE\|dummy\|DUMMY" \
  client/src/components/layout/ \
  client/src/stores/appContext.ts \
  client/src/pages/RevisionsPage.tsx
# Beklenti: sadece placeholder metni veya hiç yok
```

**Manuel smoke checklist:**

- [ ] Login → Dashboard yükleniyor
- [ ] Sidebar 8 section doğru sırada
- [ ] Bütçe Çalışması + Onay ve Yayın default açık
- [ ] Diğer 5 section default kapalı
- [ ] Tıklayıp açmak + refresh sonrası state kalıyor
- [ ] `Versiyonlar` tıklanınca tab değişiyor, aktif state doğru
- [ ] `Bütçe Planlama` tıklanınca tab=versions kapanıyor, aktif state doğru
- [ ] `Revizyonlar` → "Yakında" placeholder
- [ ] Eski isimler yok (`Dashboard`, `Forecast`, `Onay Akışı`, `Audit Log`, `Kategori Yönetimi`, `Yönetim`, `Müşteri/Ürün Yönetimi`)
- [ ] `Rapor İndir` butonu yok
- [ ] Bağlam satırı "2026 / V\d Label" formatında görünüyor
- [ ] BudgetEntryPage'de versiyon dropdown değişince bağlam satırı senkron güncelleniyor
- [ ] Dashboard / Variance / Forecast / Approvals sayfaları bozulmadı
- [ ] 1366×768 viewport'ta taşma yok
- [ ] 375px mobile'da bozuk görünüm yok

---

# Riskler & Rollback

**En riskli commit: 6** (BudgetEntryPage state migration). Eğer versiyon seçimi bozulursa ve canlıda sorun olursa:

```bash
git revert <commit-6-sha>
# SidebarContextBar store boşsa gizli kalır — görsel regresyon yok
```

**Commit 2-5 izole:** Her biri önceki olmadan çalışır, geri alınabilir.

**Commit 4 critical:** Tüm sidebar değişikliğini içerdiği için smoke test kritik. Build başarısız olursa önceki commit'ten incremental ilerleme.

---

# Execution Handoff

Bu plan iki şekilde uygulanabilir:

## Seçenek 1: Subagent-Driven (bu oturumda)

Her commit için ayrı subagent. Ana oturum plan takibini yapar, her commit sonrası review + onay. Commit'ler sıralı — bir sonraki öncekinin başarısına bağlı.

**Başlatma:**
> "Plan'ı subagent-driven olarak çalıştır. Her commit ayrı subagent, aralarda ben onaylayacağım."

## Seçenek 2: Tek oturumda sıralı

Ana oturum (bu) plan boyunca sıralı çalışır, her commit sonrası `pnpm lint && pnpm build` + smoke test + onay. Commit'ler daha hızlı ama context daha büyür.

**Başlatma:**
> "Plan'ı baştan sona sen uygula, her commit sonrası dur onayımı al."

## Seçenek 3: Parallel (ayrı oturum)

Bu plan dosyası `/Users/timurselcukturan/Uygulamalar/Budget/docs/plans/2026-04-19-sidebar-information-architecture-redesign-plan.md` → ayrı bir Claude oturumunda `/execute-plan` (veya manual) ile çalıştır. Bu oturum başka işe devam.

---

# Hangi Seçeneği İstersin?

- **A)** Seçenek 1 — subagent-driven, her commit ayrı ve aralarda onay
- **B)** Seçenek 2 — bu oturumda sıralı
- **C)** Seçenek 3 — ayrı oturuma devret
- **D)** Plan'ı önce ben okuyayım, sonra karar vereyim
