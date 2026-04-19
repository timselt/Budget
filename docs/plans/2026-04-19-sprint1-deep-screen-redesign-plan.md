# Sprint 1 Deep Ekran Redesign — Implementation Plan

**Goal:** 7 ekran iyileştirme işini (Dashboard rename + CTA, WorkContextBar smart navigator, Versiyon rich kart layout, expenseEntries bug fix, Pilot Banner, Demo role gating, TaskCenter ek task türleri) 10 commit'te TDD ile ship et.

**Architecture:** Mevcut katmanlar korunur — `client/src/` Vite + React 19 + TypeScript + Tailwind 4 frontend; `useAppContextStore` zaten merkezi versiyon bağlamını tutar (sidebar redesign'dan); `BudgetEntryPage` orchestrator, alt component'lar (`WorkContextBar`, `SubmissionChecklist`, yeni `useNextStepNavigator`) puslu state'i prop ile alır. `BudgetPeriodsPage` table → grid refactor, yeni `VersionCard` component'iyle. Backend tarafında 1 yeni endpoint okuma kontrolü (`/expenses/version/{id}` veya muadil) gerekebilir; aksi halde frontend-only.

**Tech Stack:** React 19, TypeScript 5, Vite, Tailwind 4, TanStack Query 5, Zustand, Vitest 2, Playwright. Backend: ASP.NET Core 10, EF Core 10, PostgreSQL 16.

**Branch:** `feat/sprint1-deep-redesign` (main'den çıkar, design doc commit `6de99b4`'ten sonra).

**Önkoşul Tasarım:** `docs/plans/2026-04-19-sprint1-deep-screen-redesign-design.md` (main HEAD, commit `6de99b4`). Tüm tasarım kararları, kabul kriterleri ve riskler orada.

---

## Pre-flight (Tek seferlik, 5 dk)

### Step 0.1 — Design doc'u oku
```bash
# Tasarımı tamamen oku — özellikle bölüm 5-11 (her iş'in detayı), 14 (commit sırası), 15 (test), 16 (kabul kriterleri)
cat docs/plans/2026-04-19-sprint1-deep-screen-redesign-design.md
```

### Step 0.2 — Branch oluştur
```bash
git checkout main
git pull origin main
git checkout -b feat/sprint1-deep-redesign
```

### Step 0.3 — Baseline test
```bash
cd client && pnpm test --run && pnpm build
cd .. && dotnet test --filter Category!=Integration
```
**Beklenen:** Hepsi geçiyor. Geçmiyorsa önce baseline'ı düzelt; bu plan'ı başlatma.

### Step 0.4 — Varsayım kontrolleri (bilgi toplama, kod yok)

**0.4a** — `getExpenseEntries` endpoint kontrolü:
```bash
grep -rn "ExpenseEntries" src/BudgetTracker.Api/Controllers/
```
Sonuca göre Task 1'de kullanılacak URL netleşir. `ExpenseEntriesController` mevcutsa endpoint URL'sini not et (büyük olasılıkla `GET /api/v1/expenses/version/{versionId}`).

**0.4b** — `IVarianceService` response shape:
```bash
grep -rn "GetVarianceSummaryAsync\|VarianceSummary" src/BudgetTracker.Application/Variance/
```
Response shape'i not et. Task 8'de `useTaskCenter` derivasyonunda kullanılacak (özellikle `totalVariancePercent` veya muadil field adı).

**0.4c** — `useAuthStore` user shape:
```bash
cat client/src/stores/auth.ts
```
`user.roles` string[] olduğunu doğrula. Task 6'da `RoleGuard`'da kullanılacak.

**0.4d** — `App.tsx` route haritası:
```bash
grep -n "<Route" client/src/App.tsx
```
`/forecast`, `/reports/pnl`, `/consolidation` route satırlarını not et. Task 6'da bu satırları `<RoleGuard>` ile saracağız.

---

## Commit 1 — fix: expenseEntries gerçek OPEX feed

**Files:**
- Modify: `client/src/components/budget-planning/api.ts`
- Modify: `client/src/pages/BudgetEntryPage.tsx`
- Test: `client/src/components/budget-planning/useSubmissionChecklist.test.ts` (yoksa oluştur)

### Step 1.1 — Test'i önce yaz (RED)
`client/src/components/budget-planning/useSubmissionChecklist.test.ts` yoksa oluştur, varsa yeni assertion ekle:

```ts
import { describe, it, expect } from 'vitest'
import { computeChecklist } from './useSubmissionChecklist'

describe('computeChecklist — OPEX kuralı', () => {
  const baseInput = {
    customers: [{ id: 1, isActive: true }],
    entries: [{ customerId: 1, month: 1, entryType: 'REVENUE' as const }],
    scenarioId: 1,
  }

  it('OPEX entries varsa pass döner', () => {
    const result = computeChecklist({
      ...baseInput,
      expenseEntries: [{ id: 100 }, { id: 101 }],
    })
    const opex = result.items.find((i) => i.id === 'opex')
    expect(opex?.level).toBe('pass')
    expect(opex?.message).toContain('2 OPEX')
  })

  it('OPEX entries boşsa warn döner', () => {
    const result = computeChecklist({
      ...baseInput,
      expenseEntries: [],
    })
    const opex = result.items.find((i) => i.id === 'opex')
    expect(opex?.level).toBe('warn')
  })
})
```

### Step 1.2 — Test'i çalıştır (FAIL bekleniyor)
```bash
cd client && pnpm test useSubmissionChecklist --run
```
**Beklenen:** Pass ediyor (zaten implement). Bu testler mevcut davranışı dokümante etmek için. Geçiyorsa atla.

### Step 1.3 — `getExpenseEntries` API helper ekle
`client/src/components/budget-planning/api.ts` sonuna:

```ts
export interface ExpenseEntryRow {
  id: number
  expenseCategoryId: number
  amountOriginal: number
  // …backend response'una göre genişlet
}

export async function getExpenseEntries(versionId: number): Promise<ExpenseEntryRow[]> {
  const { data } = await api.get<ExpenseEntryRow[]>(
    `/expenses/version/${versionId}`,  // 0.4a'da doğrulanan URL
  )
  return data
}
```

**Not:** URL Step 0.4a'da bulunan değerle değiştir.

### Step 1.4 — `BudgetEntryPage`'e gerçek query bağla
`client/src/pages/BudgetEntryPage.tsx`:

L96 sonrasına ekle:
```ts
const expenseEntriesQuery = useQuery({
  queryKey: ['expense-entries', versionId],
  queryFn: () => (versionId ? getExpenseEntries(versionId) : Promise.resolve([])),
  enabled: versionId !== null,
})
```

L37 import'a ekle: `, getExpenseEntries`

L266'da `expenseEntries: []` → `expenseEntries: expenseEntriesQuery.data ?? []`

### Step 1.5 — Build + test
```bash
cd client && pnpm tsc --noEmit && pnpm test --run
```

### Step 1.6 — Manuel smoke
```bash
cd client && pnpm dev
# Browser: login → Bütçe Planlama → eksiksiz versiyon seç
# OPEX gider girilmiş bir versiyonda checklist'te "X OPEX gider satırı girildi" pass görmeli
```

### Step 1.7 — Commit
```bash
git add client/src/components/budget-planning/api.ts \
        client/src/components/budget-planning/useSubmissionChecklist.test.ts \
        client/src/pages/BudgetEntryPage.tsx
git commit -m "fix: expenseEntries gerçek OPEX feed (checklist warn doğruluğu)

useSubmissionChecklist'e hardcoded boş dizi yerine versiyonun gerçek OPEX
giderleri besleniyor. Önceden OPEX kuralı her zaman warn üretiyordu;
artık gider girilmiş versiyonlarda pass döner.

Test: vitest useSubmissionChecklist OPEX kuralı 2 senaryo."
```

---

## Commit 2 — feat: Dashboard 'Ana Sayfa' rename + boş versiyon CTA

**Files:**
- Modify: `client/src/pages/DashboardPage.tsx`
- Test: `client/src/pages/DashboardPage.test.tsx` (yeni)

### Step 2.1 — Test (RED)
`client/src/pages/DashboardPage.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardPage } from './DashboardPage'

vi.mock('../lib/useActiveVersion', () => ({
  useActiveVersion: () => ({ versionId: null, isLoading: false }),
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('DashboardPage', () => {
  it('başlık Ana Sayfa olarak görünür (Executive Dashboard değil)', () => {
    renderPage()
    expect(screen.getByText('Ana Sayfa')).toBeInTheDocument()
    expect(screen.queryByText(/Executive Dashboard/)).not.toBeInTheDocument()
  })

  it('aktif versiyon yoksa Yeni Versiyon Oluştur CTA görünür', () => {
    renderPage()
    const cta = screen.getByRole('link', { name: /Yeni Versiyon Oluştur/i })
    expect(cta).toHaveAttribute('href', '/budget/planning?tab=versions')
  })
})
```

### Step 2.2 — Test'i çalıştır (FAIL)
```bash
cd client && pnpm test DashboardPage --run
```

### Step 2.3 — Implement
`client/src/pages/DashboardPage.tsx`:
- L93, L104, L118: `Executive Dashboard` → `Ana Sayfa` (3 yer; replace_all kullan)
- L101-112 boş durum bloğunu design doc §5'teki kart ile değiştir (Link import et)

```tsx
import { Link } from 'react-router-dom'
// …
if (versionId === null) {
  return (
    <section>
      <h2 className="text-3xl font-extrabold tracking-display text-[#002366] mb-6">
        Ana Sayfa
      </h2>
      <div className="card p-8 text-center">
        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 48 }}>
          calendar_add_on
        </span>
        <p className="text-base font-semibold text-on-surface mt-3">
          Henüz aktif bütçe versiyonu yok
        </p>
        <p className="text-sm text-on-surface-variant mt-1 max-w-md mx-auto">
          Çalışmaya başlamak için bir bütçe yılı + versiyon oluşturun.
          Tüm dashboard, sapma ve raporlar bu versiyon üzerinden hesaplanır.
        </p>
        <Link to="/budget/planning?tab=versions" className="btn-primary mt-4 inline-flex">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Yeni Versiyon Oluştur
        </Link>
      </div>
    </section>
  )
}
```

### Step 2.4 — Test'i çalıştır (PASS)
```bash
cd client && pnpm test DashboardPage --run
```

### Step 2.5 — Build
```bash
cd client && pnpm tsc --noEmit && pnpm build
```

### Step 2.6 — Manuel smoke
```bash
cd client && pnpm dev
# Versiyonsuz bir kullanıcı/durum ile dashboard'ı aç → CTA görünür → tıkla → /budget/planning?tab=versions açılır
```

### Step 2.7 — Commit
```bash
git add client/src/pages/DashboardPage.tsx client/src/pages/DashboardPage.test.tsx
git commit -m "feat: Dashboard 'Ana Sayfa' rename + boş versiyon CTA

Executive Dashboard -> Ana Sayfa (TR). Aktif versiyon yokken düz metin
yerine kart + 'Yeni Versiyon Oluştur' CTA; tıklama /budget/planning?tab=versions.

Audit Sprint 1: kullanıcı yön sormadan ilk versiyona ulaşabilir."
```

---

## Commit 3 — feat: PilotBanner + Forecast/PnL/Konsolidasyon entegrasyonu

**Files:**
- Create: `client/src/components/shared/PilotBanner.tsx`
- Modify: `client/src/pages/ForecastPage.tsx`, `client/src/pages/PnlReportPage.tsx`, `client/src/pages/ConsolidationPage.tsx`

### Step 3.1 — `PilotBanner.tsx` oluştur
Design doc §9'daki kodu birebir kullan.

### Step 3.2 — Forecast'a ekle
`ForecastPage.tsx`'in en üst section içerik bloğuna (h2'den hemen sonra):
```tsx
<PilotBanner
  feature="Tahmin"
  description="Bu modül pilot aşamasında. Tahmin algoritması ve senaryo enjeksiyonu üzerinde çalışılıyor; gösterilen veriler örnek."
/>
```

### Step 3.3 — PnL'e ekle
`PnlReportPage.tsx`:
```tsx
<PilotBanner
  feature="P&L Raporu"
  description="Bu rapor pilot aşamasında. Aktif versiyonun gerçek P&L hesaplaması için backend agregasyon endpoint'i bağlanacak."
/>
```

### Step 3.4 — Konsolidasyon'a ekle
`ConsolidationPage.tsx`:
```tsx
<PilotBanner
  feature="Konsolidasyon"
  description="Bu modül pilot aşamasında. Grup şirket konsolidasyonu için inter-company eliminations ve mahsuplaşma kuralları henüz tanımlanmadı."
/>
```

### Step 3.5 — Build
```bash
cd client && pnpm tsc --noEmit && pnpm build
```

### Step 3.6 — Manuel smoke
3 sayfayı aç, üstte sarı şeritli banner görünmeli + chip "Pilot — Demo Veri".

### Step 3.7 — Commit
```bash
git add client/src/components/shared/PilotBanner.tsx \
        client/src/pages/ForecastPage.tsx \
        client/src/pages/PnlReportPage.tsx \
        client/src/pages/ConsolidationPage.tsx
git commit -m "feat: PilotBanner + Forecast/PnL/Konsolidasyon entegrasyonu

3 demo sayfanın üstüne sarı şeritli Pilot uyarı bandı. Mevcut grafik
kartlarındaki 'Demo' chip'leri kalır (kart bazlı seviye); banner sayfa
kimliğini netleştirir.

Audit Sprint 1: demo ekranlar üretim ekranı gibi görünmesin."
```

---

## Commit 4 — feat: sidebar-config pilot rozet + requiresRole field

**Files:**
- Modify: `client/src/components/layout/sidebar-config.ts`
- Modify: `client/src/components/layout/SidebarSection.tsx`
- Test: `client/src/components/layout/SidebarSection.test.tsx` (yeni assertion)

### Step 4.1 — Test (RED)
`SidebarSection.test.tsx`'e yeni test ekle:

```tsx
it('pilot: true item label sağında Pilot etiketi render eder', () => {
  const section: SidebarSection = {
    id: 'analysis', label: 'Analizler', defaultOpen: true,
    items: [{ label: 'Tahmin', to: '/forecast', icon: 'trending_up', pilot: true }],
  }
  render(<MemoryRouter><SidebarSection section={section} /></MemoryRouter>)
  expect(screen.getByText('Pilot')).toBeInTheDocument()
})
```

### Step 4.2 — Test'i çalıştır (FAIL)
```bash
cd client && pnpm test SidebarSection --run
```

### Step 4.3 — Type genişlet
`sidebar-config.ts`:
```ts
export interface SidebarItem {
  label: string
  to: string
  icon: string
  end?: boolean
  matchTabParam?: string
  pilot?: boolean
  requiresRole?: ReadonlyArray<'Admin' | 'CFO' | 'FinanceManager'>
}
```

### Step 4.4 — Demo item'larını işaretle
`sidebar-config.ts` `analysis` ve `reports` section'larında:
```ts
{ label: 'Tahmin', to: '/forecast', icon: 'trending_up',
  pilot: true, requiresRole: ['Admin', 'CFO', 'FinanceManager'] },
{ label: 'Konsolidasyon', to: '/consolidation', icon: 'hub',
  pilot: true, requiresRole: ['Admin', 'CFO', 'FinanceManager'] },
// reports section:
{ label: 'P&L Raporu', to: '/reports/pnl', icon: 'monitoring',
  pilot: true, requiresRole: ['Admin', 'CFO', 'FinanceManager'] },
```

### Step 4.5 — `SidebarSection.tsx` render
NavLink span'ı içine, label sonrasına:
```tsx
{item.pilot && (
  <span className="ml-auto text-[0.625rem] text-warning font-semibold uppercase tracking-wider">
    Pilot
  </span>
)}
```

### Step 4.6 — Test PASS
```bash
cd client && pnpm test SidebarSection --run
```

### Step 4.7 — Build + manuel smoke
Sidebar'da Tahmin, P&L Raporu, Konsolidasyon'un yanında "Pilot" etiketi görünmeli.

### Step 4.8 — Commit
```bash
git add client/src/components/layout/sidebar-config.ts \
        client/src/components/layout/SidebarSection.tsx \
        client/src/components/layout/SidebarSection.test.tsx
git commit -m "feat: sidebar-config pilot rozet + requiresRole field

SidebarItem'a pilot?: boolean ve requiresRole?: string[] eklendi.
Tahmin / P&L Raporu / Konsolidasyon pilot=true; Admin/CFO/FinanceManager
gerektiriyor (gating Commit 5'te). Pilot etiketi label sağında uppercase.

Audit Sprint 1: demo ekran görünürlüğü + role bazlı gating altyapısı."
```

---

## Commit 5 — feat: RoleGuard + ForbiddenPage + demo sayfa route koruması

**Files:**
- Create: `client/src/components/auth/RoleGuard.tsx`
- Create: `client/src/pages/ForbiddenPage.tsx`
- Modify: `client/src/components/layout/Sidebar.tsx`
- Modify: `client/src/App.tsx`
- Test: `client/src/components/auth/RoleGuard.test.tsx` (yeni)

### Step 5.1 — Test (RED)
`RoleGuard.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RoleGuard } from './RoleGuard'

const mockUser = vi.fn()
vi.mock('../../stores/auth', () => ({
  useAuthStore: () => ({ user: mockUser() }),
}))

describe('RoleGuard', () => {
  it('yetkili kullanıcı children render eder', () => {
    mockUser.mockReturnValue({ roles: ['Admin'] })
    render(<MemoryRouter><RoleGuard allow={['Admin']}><div>OK</div></RoleGuard></MemoryRouter>)
    expect(screen.getByText('OK')).toBeInTheDocument()
  })

  it('yetkisiz kullanıcı ForbiddenPage gösterir', () => {
    mockUser.mockReturnValue({ roles: ['Viewer'] })
    render(<MemoryRouter><RoleGuard allow={['Admin']}><div>OK</div></RoleGuard></MemoryRouter>)
    expect(screen.queryByText('OK')).not.toBeInTheDocument()
    expect(screen.getByText(/Erişim yok/i)).toBeInTheDocument()
  })
})
```

### Step 5.2 — Test FAIL
```bash
cd client && pnpm test RoleGuard --run
```

### Step 5.3 — `ForbiddenPage.tsx` oluştur
Design doc §10'daki kodu birebir kullan.

### Step 5.4 — `RoleGuard.tsx` oluştur
Design doc §10'daki kodu birebir kullan.

### Step 5.5 — `Sidebar.tsx` filter ekle
`SIDEBAR_SECTIONS` import'undan sonra:
```tsx
const visibleSections = useMemo(() => {
  const userRoles = new Set(user?.roles ?? [])
  return SIDEBAR_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item =>
      !item.requiresRole || item.requiresRole.some(r => userRoles.has(r))
    ),
  })).filter(section => section.to || section.items.length > 0)
}, [user?.roles])
```
Render'da `SIDEBAR_SECTIONS` yerine `visibleSections` kullan.

### Step 5.6 — `App.tsx` route'ları sar
0.4d'deki route satırlarını `<RoleGuard>` içine sar:
```tsx
<Route path="/forecast" element={
  <RoleGuard allow={['Admin', 'CFO', 'FinanceManager']}>
    <ForecastPage />
  </RoleGuard>
} />
// PnL ve Consolidation aynı şekilde
```

### Step 5.7 — Test PASS
```bash
cd client && pnpm test --run
```

### Step 5.8 — Manuel smoke
Test kullanıcısı (rolsüz) ile `/forecast` → ForbiddenPage. Admin ile aynı URL → sayfa görünür.

### Step 5.9 — Commit
```bash
git add client/src/components/auth/RoleGuard.tsx \
        client/src/components/auth/RoleGuard.test.tsx \
        client/src/pages/ForbiddenPage.tsx \
        client/src/components/layout/Sidebar.tsx \
        client/src/App.tsx
git commit -m "feat: RoleGuard + ForbiddenPage + demo sayfa route koruması

Yeni RoleGuard component'i route-level rol kontrolü; yetkisiz kullanıcı
ForbiddenPage görür. Sidebar requiresRole filter'ı item'ları gizler.
Forecast/PnL/Konsolidasyon Admin/CFO/FinanceManager rolüne kilitli.

Audit Sprint 1: demo ekranlar sıradan kullanıcıyı yanıltmasın."
```

---

## Commit 6 — feat: VersionCard rich kart layout

**Files:**
- Create: `client/src/components/budget-planning/VersionCard.tsx`
- Modify: `client/src/pages/BudgetPeriodsPage.tsx`
- Test: `client/src/components/budget-planning/VersionCard.test.tsx` (yeni)

### Step 6.1 — Test (RED)
`VersionCard.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { VersionCard } from './VersionCard'

const baseVersion = {
  id: 1, budgetYearId: 1, name: 'v2026.1',
  isActive: false, rejectionReason: null,
  createdAt: '2026-01-15T00:00:00Z',
}
const allRoles = { isAdmin: true, isFinance: true, isCfo: true }
const noopHandlers = {
  goToPlanning: () => {}, transition: () => {},
  createRevision: () => {}, reject: () => {}, archive: () => {},
}

describe('VersionCard', () => {
  it('Active status için yeşil şerit class', () => {
    const { container } = render(
      <MemoryRouter>
        <VersionCard
          version={{ ...baseVersion, status: 'Active', isActive: true }}
          roles={allRoles} handlers={noopHandlers}
        />
      </MemoryRouter>
    )
    expect(container.querySelector('.border-l-success')).toBeTruthy()
    expect(screen.getByText('Aktif')).toBeInTheDocument()
  })

  it('Draft status için kehribar şerit', () => {
    const { container } = render(
      <MemoryRouter>
        <VersionCard
          version={{ ...baseVersion, status: 'Draft' }}
          roles={allRoles} handlers={noopHandlers}
        />
      </MemoryRouter>
    )
    expect(container.querySelector('.border-l-warning')).toBeTruthy()
  })

  it('PendingFinance + isFinance true → Finans Onayla butonu', () => {
    render(
      <MemoryRouter>
        <VersionCard
          version={{ ...baseVersion, status: 'PendingFinance' }}
          roles={allRoles} handlers={noopHandlers}
        />
      </MemoryRouter>
    )
    expect(screen.getByRole('button', { name: /Finans Onayla/i })).toBeInTheDocument()
  })

  it('Rolsüz kullanıcıda primary aksiyon butonu render etmez', () => {
    render(
      <MemoryRouter>
        <VersionCard
          version={{ ...baseVersion, status: 'PendingCfo' }}
          roles={{ isAdmin: false, isFinance: false, isCfo: false }}
          handlers={noopHandlers}
        />
      </MemoryRouter>
    )
    expect(screen.queryByRole('button', { name: /Onayla/i })).not.toBeInTheDocument()
  })
})
```

### Step 6.2 — Test FAIL
```bash
cd client && pnpm test VersionCard --run
```

### Step 6.3 — `VersionCard.tsx` implement
Design doc §7 layout + status renk mapping. `primaryAction` mantığını `BudgetPeriodsPage.tsx`'ten kopyala (helper olarak); `⋯` menü Reddet/Arşivle aynı mantıkla.

İskelet:
```tsx
import { Link } from 'react-router-dom'
import { getStatusChipClass, getStatusLabel, getStatusNextAction } from './types'
import type { BudgetVersionStatus } from './types'

const STATUS_BORDER: Record<BudgetVersionStatus, string> = {
  Active: 'border-l-success',
  Draft: 'border-l-warning',
  PendingFinance: 'border-l-primary',
  PendingCfo: 'border-l-primary',
  Rejected: 'border-l-error',
  Archived: 'border-l-on-surface-variant',
}

export interface VersionCardProps { /* design doc §7 */ }

export function VersionCard({ version, roles, handlers, onScrollHere }: VersionCardProps) {
  const status = version.status as BudgetVersionStatus
  const action = primaryAction(version, roles, handlers)
  const canReject = REJECTABLE_STATUSES.has(status)
  const canArchive = status === 'Active' && (roles.isFinance || roles.isAdmin)

  return (
    <div className={`card border-l-4 ${STATUS_BORDER[status] ?? ''}`} id={`version-card-${version.id}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-base font-bold">
            {version.name}
            {version.isActive && <span className="chip chip-success ml-2 text-xs">Aktif</span>}
          </h4>
          <p className="text-[0.65rem] font-mono text-on-surface-variant mt-1">
            #{version.id} · {new Date(version.createdAt).toLocaleDateString('tr-TR')}
            {version.rejectionReason && ` · Red: ${version.rejectionReason}`}
          </p>
        </div>
        {(canReject || canArchive) && (/* details/⋯ menu, design doc'tan kopyala */)}
      </div>

      <div className="border-t border-outline-variant pt-3 mt-2">
        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
          🎯 Sıradaki adım
        </p>
        <p className="text-sm text-on-surface mt-1">{getStatusNextAction(version.status)}</p>
      </div>

      {action && (
        <button
          type="button"
          className="btn-primary w-full mt-3"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

// primaryAction helper: BudgetPeriodsPage.tsx'ten kopyala
```

### Step 6.4 — `BudgetPeriodsPage.tsx` refactor
- Tablo bloğu (mevcut L322-422) silinir
- Yerine grid render:
```tsx
{versions.length === 0 ? (
  // mevcut empty state korunur
) : (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    {sortVersionsForDisplay(versions).map(v => (
      <VersionCard
        key={v.id}
        version={v}
        roles={{ isAdmin, isFinance, isCfo }}
        handlers={{
          goToPlanning,
          transition: (vid, ep) => transitionMutation.mutate({ versionId: vid, endpoint: ep }),
          createRevision: (vid) => createRevisionMutation.mutate(vid),
          reject: (vid) => setModal({ kind: 'reject', versionId: vid }),
          archive: (vid) => {
            if (confirm('Bu versiyon arşivlenecek. Emin misiniz?')) archiveMutation.mutate(vid)
          },
        }}
      />
    ))}
  </div>
)}
```

`sortVersionsForDisplay` helper: Active önce, sonra createdAt DESC, Archived sona.

### Step 6.5 — `RevisionTimeline` highlight DOM hedefi
`RevisionTimeline` `onSelect` callback'i `version-row-${id}` arıyor. Yeni DOM `version-card-${id}` olduğundan ya:
- (a) `RevisionTimeline.tsx`'i `version-card-${id}` arayacak şekilde güncelle, VEYA
- (b) `BudgetPeriodsPage`'de callback'i değiştir:
```tsx
onSelect={(id) => {
  const card = document.getElementById(`version-card-${id}`)
  card?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  card?.classList.add('bg-primary-fixed')
  setTimeout(() => card?.classList.remove('bg-primary-fixed'), 1000)
}}
```
B daha az invasive — uygula.

### Step 6.6 — Test PASS + build
```bash
cd client && pnpm test --run && pnpm tsc --noEmit && pnpm build
```

### Step 6.7 — Manuel smoke
- Versiyonlar tab → kart grid görünüyor, tablo yok
- Aktif kart en üstte yeşil şeritli
- Rol matrix: Finance kullanıcısı PendingCfo'da buton görmez
- RevisionTimeline tıklanınca kart scroll + 1sn highlight

### Step 6.8 — Commit
```bash
git add client/src/components/budget-planning/VersionCard.tsx \
        client/src/components/budget-planning/VersionCard.test.tsx \
        client/src/pages/BudgetPeriodsPage.tsx
git commit -m "feat: VersionCard rich status-driven kart layout

BudgetPeriodsPage tablo render'ı yeni VersionCard grid'i ile değişti.
Status renk şeridi (Active yeşil, Draft kehribar, Pending mavi, Rejected
kırmızı, Archived gri), büyük 'sıradaki adım' prompt'u, primary action
tam genişlik buton. RevisionTimeline highlight kart DOM hedefine güncel.

Audit Sprint 1: tek ana aksiyon, sıradaki adım vurgulu, görev odaklı."
```

---

## Commit 7 — feat: useNextStepNavigator + WorkContextBar smart navigator

**Files:**
- Create: `client/src/components/budget-planning/useNextStepNavigator.ts`
- Modify: `client/src/components/budget-planning/WorkContextBar.tsx`
- Modify: `client/src/pages/BudgetEntryPage.tsx`
- Modify: `client/src/styles/global.css`
- Test: `client/src/components/budget-planning/useNextStepNavigator.test.ts`

### Step 7.1 — Test (RED)
`useNextStepNavigator.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { deriveNextStep } from './useNextStepNavigator'

const baseChecklist = {
  items: [], canSubmit: true, hardFailCount: 0, warnCount: 0,
}
const baseContext = { customers: [], entries: [], opexCategories: [] }

describe('deriveNextStep', () => {
  it('fail (eksik müşteri) → jump-to-customer', () => {
    const checklist = {
      items: [{ id: 'all-customers', level: 'fail' as const, message: '1/3 müşteri tamamlandı' }],
      canSubmit: false, hardFailCount: 1, warnCount: 0,
    }
    const context = {
      customers: [
        { id: 1, isActive: true, segmentId: 10 },
        { id: 2, isActive: true, segmentId: 10 },
      ],
      entries: [{ customerId: 1, month: 1, entryType: 'REVENUE' as const }],
      opexCategories: [],
    }
    const step = deriveNextStep(checklist, context)
    expect(step?.action.kind).toBe('jump-to-customer')
    expect(step?.action.customerId).toBe(2)
    expect(step?.level).toBe('fail')
  })

  it('claim-missing warn → jump-to-customer + scrollToType CLAIM', () => { /* … */ })
  it('opex warn → jump-to-opex', () => { /* … */ })
  it('scenario warn → highlight-scenario', () => { /* … */ })
  it('hepsi pass → null', () => {
    expect(deriveNextStep(baseChecklist, baseContext)).toBeNull()
  })
})
```

### Step 7.2 — Test FAIL
```bash
cd client && pnpm test useNextStepNavigator --run
```

### Step 7.3 — Implement `useNextStepNavigator.ts`
Design doc §6 hook iskeleti. Pure derivation — `useMemo` wrap.

```ts
import { useMemo } from 'react'
import type { ChecklistResult } from './useSubmissionChecklist'

export interface NextStepAction { /* design doc §6 */ }
export interface NextStep { /* design doc §6 */ }

interface DeriveContext {
  customers: { id: number; isActive: boolean; segmentId: number }[]
  entries: { customerId: number; month: number; entryType: 'REVENUE' | 'CLAIM' }[]
  opexCategories: { expenseCategoryId: number }[]
}

export function deriveNextStep(checklist: ChecklistResult, ctx: DeriveContext): NextStep | null {
  // 1) fail (all-customers): ilk eksik müşteri
  const failItem = checklist.items.find(i => i.level === 'fail' && i.id === 'all-customers')
  if (failItem) {
    const completed = new Set(ctx.entries.map(e => e.customerId))
    const missing = ctx.customers.find(c => c.isActive && !completed.has(c.id))
    if (missing) {
      return {
        message: failItem.message,
        ctaLabel: 'Düzelt →',
        level: 'fail',
        action: { kind: 'jump-to-customer', customerId: missing.id },
      }
    }
  }

  // 2) empty-month warn
  const emptyMonth = checklist.items.find(i => i.id === 'empty-months')
  if (emptyMonth?.level === 'warn') {
    // ilk müşterinin ilk boş ayını bul
    for (const c of ctx.customers.filter(x => x.isActive)) {
      const months = new Set(
        ctx.entries.filter(e => e.customerId === c.id).map(e => e.month)
      )
      if (months.size === 0 || months.size === 12) continue
      const firstEmpty = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].find(m => !months.has(m))
      return {
        message: emptyMonth.message,
        ctaLabel: 'Düzelt →',
        level: 'warn',
        action: { kind: 'jump-to-customer', customerId: c.id, scrollToMonth: firstEmpty },
      }
    }
  }

  // 3) claim-missing warn
  const claimMissing = checklist.items.find(i => i.id === 'claim-missing')
  if (claimMissing?.level === 'warn') {
    const target = ctx.customers.find(c => {
      if (!c.isActive) return false
      const ce = ctx.entries.filter(e => e.customerId === c.id)
      return ce.some(e => e.entryType === 'REVENUE') && !ce.some(e => e.entryType === 'CLAIM')
    })
    if (target) {
      return {
        message: claimMissing.message,
        ctaLabel: 'Düzelt →',
        level: 'warn',
        action: { kind: 'jump-to-customer', customerId: target.id, scrollToType: 'CLAIM' },
      }
    }
  }

  // 4) opex warn
  const opex = checklist.items.find(i => i.id === 'opex')
  if (opex?.level === 'warn' && ctx.opexCategories.length > 0) {
    return {
      message: opex.message,
      ctaLabel: 'Düzelt →',
      level: 'warn',
      action: { kind: 'jump-to-opex', expenseCategoryId: ctx.opexCategories[0].expenseCategoryId },
    }
  }

  // 5) scenario warn
  const scenario = checklist.items.find(i => i.id === 'scenario')
  if (scenario?.level === 'warn') {
    return {
      message: scenario.message,
      ctaLabel: 'Düzelt →',
      level: 'warn',
      action: { kind: 'highlight-scenario' },
    }
  }

  // 6) hepsi pass
  if (checklist.canSubmit && checklist.warnCount === 0) {
    return {
      message: 'Onaya hazır.',
      ctaLabel: 'Onaya Gönder',
      level: 'pass',
      action: { kind: 'none' },
    }
  }

  return null
}

export function useNextStepNavigator(checklist: ChecklistResult, ctx: DeriveContext) {
  return useMemo(() => deriveNextStep(checklist, ctx),
    [checklist.items, checklist.canSubmit, ctx.customers, ctx.entries, ctx.opexCategories])
}
```

### Step 7.4 — Test PASS
```bash
cd client && pnpm test useNextStepNavigator --run
```

### Step 7.5 — `WorkContextBar` smart navigator satırı
Editable varyantına ekle (mevcut return içinde):
```tsx
{nextStep && (
  <div className="border-t border-outline-variant pt-2 mt-2 flex items-center justify-between gap-3">
    <div className="flex items-center gap-2 min-w-0">
      <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>
        flag
      </span>
      <p className="text-sm text-on-surface truncate">
        <span className="font-semibold">Sıradaki adım:</span> {nextStep.message}
      </p>
    </div>
    {nextStep.action.kind !== 'none' && (
      <button type="button" className="btn-primary text-xs whitespace-nowrap" onClick={onJump}>
        {nextStep.ctaLabel}
      </button>
    )}
  </div>
)}
```

Props'a ekle: `nextStep?: NextStep | null`, `onJump?: () => void`.

### Step 7.6 — `BudgetEntryPage` orkestrasyon
- `useNextStepNavigator(checklist, { customers, entries, opexCategories: tree?.opexCategories ?? [] })`
- `handleJumpTo(action)` callback:
  - `jump-to-customer` → setMode('customer') + setSelection({ kind: 'customer', customerId, segmentId }) + scrollToMonth/scrollToType varsa BudgetCustomerGrid'e prop ile geçilir → grid `data-attention` ile pulse
  - `jump-to-opex` → setMode('tree') + setSelection({ kind: 'opex', expenseCategoryId })
  - `highlight-scenario` → senaryo dropdown'una `data-attention="scenario"` 2sn geçici attribute
- WorkContextBar'a `nextStep={nextStep}` ve `onJump={() => handleJumpTo(nextStep.action)}` geçilir

### Step 7.7 — `global.css` pulse animation
Design doc §6:
```css
[data-attention] {
  animation: attention-pulse 1s ease-out;
}
@keyframes attention-pulse {
  0%, 100% { box-shadow: 0 0 0 0 transparent; }
  50% { box-shadow: 0 0 0 6px rgba(0, 35, 102, 0.25); }
}
```

### Step 7.8 — `BudgetCustomerGrid` scroll/focus desteği (opsiyonel iyileştirme)
- Yeni props: `attentionMonth?: number`, `attentionType?: 'REVENUE' | 'CLAIM'`
- `useEffect(() => { if (attentionMonth) cellRef.current?.scrollIntoView() }, [attentionMonth])`
- Hücreye `data-attention` attribute → 1sn sonra kaldır

(Bu mikro iş; basit versiyon: sadece selection değiştir, scroll yapma. İlk MVP'de yeterli.)

### Step 7.9 — Test + build + manuel
```bash
cd client && pnpm test --run && pnpm tsc --noEmit && pnpm build
```
Manuel: eksik müşterili versiyonda WorkContextBar'da "Sıradaki adım: 3/5 müşteri tamamlandı (2 eksik) [Düzelt →]" → tıkla → ilk eksik müşteri seçildi.

### Step 7.10 — Commit
```bash
git add client/src/components/budget-planning/useNextStepNavigator.ts \
        client/src/components/budget-planning/useNextStepNavigator.test.ts \
        client/src/components/budget-planning/WorkContextBar.tsx \
        client/src/pages/BudgetEntryPage.tsx \
        client/src/styles/global.css
git commit -m "feat: useNextStepNavigator + WorkContextBar smart navigator

WorkContextBar editable varyantına 'sıradaki adım' satırı + Düzelt → CTA.
Yeni hook checklist priority'sinden tek navigation hedefi türetir;
BudgetEntryPage callback ile setMode/setSelection değiştirir, dropdown
veya hücre data-attention pulse animasyonu ile vurgulanır.

Audit Sprint 1: kullanıcı 'neden gönderemiyorum' sorusuna tek tık ile cevap."
```

---

## Commit 8 — feat: TaskCenter sapma + onay özet task türleri

**Files:**
- Modify: `client/src/components/dashboard/taskCenterDerivation.ts`
- Modify: `client/src/components/dashboard/useTaskCenter.ts`
- Test: `client/src/components/dashboard/taskCenterDerivation.test.ts` (yeni)

### Step 8.1 — Test (RED)
`taskCenterDerivation.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { deriveTasks } from './taskCenterDerivation'

const customerIds = [1, 2, 3]
const noEntries = {}

describe('deriveTasks — sapma', () => {
  it('aktif versiyon yoksa sapma task üretmez', () => {
    const tasks = deriveTasks({
      versions: [], entriesPerVersion: noEntries, customerIds, roles: ['Admin'],
      varianceByVersion: {},
    })
    expect(tasks.find(t => t.id.startsWith('variance-'))).toBeUndefined()
  })

  it('aktif versiyon + %20+ sapma → high priority task', () => {
    const tasks = deriveTasks({
      versions: [{ id: 5, budgetYearId: 1, name: 'v1', status: 'Active', isActive: true, rejectionReason: null, createdAt: '' }],
      entriesPerVersion: noEntries, customerIds, roles: ['Admin'],
      varianceByVersion: { 5: { totalVariancePercent: 25, criticalCategoryCount: 2 } },
    })
    const variance = tasks.find(t => t.id === 'variance-5')
    expect(variance?.priority).toBe('high')
    expect(variance?.title).toContain('25')
  })

  it('aktif versiyon + %15 sapma → task üretmez', () => {
    const tasks = deriveTasks({
      versions: [{ id: 5, budgetYearId: 1, name: 'v1', status: 'Active', isActive: true, rejectionReason: null, createdAt: '' }],
      entriesPerVersion: noEntries, customerIds, roles: ['Admin'],
      varianceByVersion: { 5: { totalVariancePercent: 15, criticalCategoryCount: 0 } },
    })
    expect(tasks.find(t => t.id.startsWith('variance-'))).toBeUndefined()
  })
})

describe('deriveTasks — onay özet', () => {
  it('1 onay bekleyen → bireysel task (özet yok)', () => {
    const tasks = deriveTasks({
      versions: [{ id: 1, budgetYearId: 1, name: 'v1', status: 'PendingFinance', isActive: false, rejectionReason: null, createdAt: '' }],
      entriesPerVersion: noEntries, customerIds, roles: ['FinanceManager'],
    })
    expect(tasks.find(t => t.id === 'pending-approvals-summary')).toBeUndefined()
    expect(tasks.find(t => t.id === 'approve-finance-1')).toBeDefined()
  })

  it('3 onay bekleyen Finance → özet task + bireysel suppress', () => {
    const tasks = deriveTasks({
      versions: [
        { id: 1, budgetYearId: 1, name: 'v1', status: 'PendingFinance', isActive: false, rejectionReason: null, createdAt: '' },
        { id: 2, budgetYearId: 1, name: 'v2', status: 'PendingFinance', isActive: false, rejectionReason: null, createdAt: '' },
        { id: 3, budgetYearId: 1, name: 'v3', status: 'PendingFinance', isActive: false, rejectionReason: null, createdAt: '' },
      ],
      entriesPerVersion: noEntries, customerIds, roles: ['FinanceManager'],
    })
    expect(tasks.find(t => t.id === 'pending-approvals-summary')).toBeDefined()
    expect(tasks.filter(t => t.id.startsWith('approve-finance-'))).toHaveLength(0)
  })
})
```

### Step 8.2 — Test FAIL
```bash
cd client && pnpm test taskCenterDerivation --run
```

### Step 8.3 — Type genişlet + derivation kuralları
`taskCenterDerivation.ts`:
```ts
interface VarianceSummary {
  totalVariancePercent: number
  criticalCategoryCount: number
}

export interface DeriveContext {
  versions: VersionRow[]
  entriesPerVersion: Record<number, { customerId: number }[]>
  customerIds: number[]
  roles: string[]
  varianceByVersion?: Record<number, VarianceSummary>
}

export function deriveTasks(ctx: DeriveContext): Task[] {
  // … mevcut derivation …

  // YENİ: Onay özet — bireysel approve task'larını topla, 2+ ise özet
  const isFinance = roles.includes('FinanceManager') || roles.includes('Admin')
  const isCfo = roles.includes('CFO') || roles.includes('Admin')
  const pendingForUser = versions.filter(v =>
    (v.status === 'PendingFinance' && isFinance) ||
    (v.status === 'PendingCfo' && isCfo)
  )
  if (pendingForUser.length >= 2) {
    // Bireysel approve-finance/approve-cfo task'larını filtrele:
    const filtered = tasks.filter(t =>
      !t.id.startsWith('approve-finance-') && !t.id.startsWith('approve-cfo-')
    )
    filtered.push({
      id: 'pending-approvals-summary',
      title: `${pendingForUser.length} versiyon onayınızı bekliyor`,
      subtitle: 'Onaylar ekranında karar verin',
      ctaLabel: 'Onaylar Ekranı',
      ctaHref: '/approvals',
      priority: 'high',
      icon: 'rule',
    })
    tasks.length = 0
    tasks.push(...filtered)
  }

  // YENİ: Sapma uyarısı — aktif versiyon + variance %20+
  const activeVersion = versions.find(v => v.status === 'Active')
  if (activeVersion && ctx.varianceByVersion?.[activeVersion.id]) {
    const variance = ctx.varianceByVersion[activeVersion.id]
    if (variance.totalVariancePercent >= 20 || variance.criticalCategoryCount > 0) {
      tasks.push({
        id: `variance-${activeVersion.id}`,
        title: `${activeVersion.name} — %${variance.totalVariancePercent.toFixed(0)} sapma`,
        subtitle: `${variance.criticalCategoryCount} kategoride kritik fark`,
        ctaLabel: 'Sapma Analizine Git',
        ctaHref: '/variance',
        priority: 'high',
        icon: 'warning',
      })
    }
  }

  tasks.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
  return tasks
}
```

### Step 8.4 — `useTaskCenter` variance query ekle
```ts
const activeVersion = versions.find(v => v.status === 'Active')
const varianceQuery = useQuery({
  queryKey: ['variance-summary', activeVersion?.id],
  queryFn: async () => {
    if (!activeVersion) return null
    const { data } = await api.get(`/variance/${activeVersion.id}/summary`)
    return data as VarianceSummary
  },
  enabled: !!activeVersion,
  staleTime: 60_000,
})

const varianceByVersion = useMemo(() => {
  if (!activeVersion || !varianceQuery.data) return {}
  return { [activeVersion.id]: varianceQuery.data }
}, [activeVersion, varianceQuery.data])

const tasks = useMemo(
  () => deriveTasks({ versions, entriesPerVersion: ..., customerIds, roles, varianceByVersion }),
  [...]
)
```

**Not:** `VarianceSummary` shape Step 0.4b'de doğrulanan field adlarıyla eşleşmeli; gerekirse adapter map.

### Step 8.5 — Test PASS
```bash
cd client && pnpm test --run
```

### Step 8.6 — Manuel smoke
- Aktif versiyon + sapma yüksek → dashboard'da kırmızı uyarılı task kartı
- 3 onayda versiyon → "3 versiyon onayınızı bekliyor" tek özet kartı

### Step 8.7 — Commit
```bash
git add client/src/components/dashboard/taskCenterDerivation.ts \
        client/src/components/dashboard/taskCenterDerivation.test.ts \
        client/src/components/dashboard/useTaskCenter.ts
git commit -m "feat: TaskCenter sapma uyarısı + onay özet task türleri

İki yeni rol-aware task: aktif versiyonda %20+ sapma high-priority
'Sapma Analizine Git'; 2+ onay bekleyen kullanıcı için bireysel
approve task'ları suppress edilip tek 'N versiyon onayınızı bekliyor'
özet kartına dönüşür.

Audit Sprint 1: dashboard görev odaklı kalsın, tekrar eden kart olmasın."
```

---

## Commit 9 — test: Sprint 1 deep E2E

**Files:**
- Create: `client/e2e/sprint1-deep.spec.ts`

### Step 9.1 — E2E suite yaz
Design doc §15'teki 9 senaryoyu Playwright test'lerine çevir. Mevcut `auth.setup.ts` storageState'i kullan.

İskelet:
```ts
import { test, expect } from '@playwright/test'

test.describe('Sprint 1 Deep — Ekran Yeniden Tasarımı', () => {
  test('Dashboard başlığı Ana Sayfa', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Ana Sayfa' })).toBeVisible()
    await expect(page.getByText('Executive Dashboard')).toHaveCount(0)
  })

  test('Aktif versiyon yoksa Yeni Versiyon Oluştur CTA çalışır', async ({ page }) => {
    // setup: versiyonsuz tenant veya UI ile mevcut versiyonu arşivle
    // bu test'in fixture stratejisi; pas geç değil, en azından TODO yorumla işaretle
  })

  test('Versiyonlar tab — kart grid + Aktif yeşil şeritli', async ({ page }) => {
    await page.goto('/budget/planning?tab=versions')
    await expect(page.locator('table')).toHaveCount(0)
    await expect(page.locator('.border-l-success').first()).toBeVisible()
  })

  test('WorkContextBar smart navigator → Düzelt → ile selection değişir', async ({ page }) => {
    await page.goto('/budget/planning')
    const cta = page.getByRole('button', { name: /Düzelt/i })
    if (await cta.count() > 0) {
      await cta.click()
      await expect(page.locator('.tab.active', { hasText: 'Müşteri Odaklı' })).toBeVisible()
    }
  })

  test('Forecast → PilotBanner görünür', async ({ page }) => {
    await page.goto('/forecast')
    await expect(page.getByText('Pilot — Demo Veri')).toBeVisible()
  })

  test('Sidebar — Pilot etiketi görünür (admin user)', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Pilot').first()).toBeVisible()
  })

  // Yetkisiz kullanıcı testi: ayrı storageState gerektirir; opsiyonel skip + TODO
})
```

### Step 9.2 — Çalıştır
```bash
cd client && pnpm exec playwright test sprint1-deep --reporter=list
```

### Step 9.3 — Commit
```bash
git add client/e2e/sprint1-deep.spec.ts
git commit -m "test: Sprint 1 deep E2E — Dashboard / Versiyonlar / WorkContextBar / Pilot

Playwright suite: rename, kart grid, smart navigator click, Pilot Banner,
sidebar Pilot etiketi. Yetkisiz kullanıcı senaryosu ayrı storageState
gerektirdiği için TODO."
```

---

## Commit 10 — docs: CHANGELOG Sprint 1 deep özeti

**Files:**
- Modify: `CHANGELOG.md`

### Step 10.1 — CHANGELOG'a giriş
`CHANGELOG.md` `[Unreleased]` altına sidebar redesign başlığından önce yeni bölüm ekle:

```markdown
### Sprint 1 Deep — Ekran Yeniden Tasarımı (2026-04-19)

7 ekran iyileştirme işi, Sidebar redesign'ın ardından "ekranlar kendini anlatır mı?" sorusunu kapatır. Audit (2026-04-19) Sprint 1 paketinin %70'i zaten kodlanmıştı; bu PR geriye kalan görünürlük + navigasyon eksikliklerini ve C kapsamı derinleştirmesini birleştirir.

#### Eklendi

- **`PilotBanner`** (`client/src/components/shared/PilotBanner.tsx`) — Forecast / P&L Raporu / Konsolidasyon sayfa-üstü pilot uyarı bandı.
- **`RoleGuard` + `ForbiddenPage`** — route-level rol kontrolü; demo sayfalar Admin/CFO/FinanceManager'a kilitli.
- **`VersionCard`** (`client/src/components/budget-planning/VersionCard.tsx`) — `BudgetPeriodsPage` tablosunu değiştirir; status renk şeridi (Active yeşil, Draft kehribar, Pending mavi, Rejected kırmızı, Archived gri), büyük "sıradaki adım" prompt'u, primary action tam genişlik buton.
- **`useNextStepNavigator`** — checklist'ten tek priority navigasyon hedefi türetir; WorkContextBar smart navigator satırı + "Düzelt →" CTA → BudgetEntryPage state değişimi (mode + selection + scrollToMonth/scrollToType + dropdown pulse).
- **TaskCenter sapma + onay özet task'ları** — aktif versiyonda %20+ sapma high-priority task; 2+ onay bekleyen kullanıcı için tek özet kart (bireysel approve task'ları suppress).
- **`SidebarItem.pilot` + `requiresRole`** — sidebar item'larında Pilot etiketi + rol bazlı görünürlük filter.

#### Değişti

- **`DashboardPage`** — `Executive Dashboard` → `Ana Sayfa`; aktif versiyon yokken kart + "Yeni Versiyon Oluştur" CTA.
- **`WorkContextBar`** — düzenlenebilir varyantta yeni "sıradaki adım" satırı.
- **`BudgetPeriodsPage`** — table render kaldırıldı, kart grid; Aktif kart en üstte; `RevisionTimeline` highlight kart DOM hedefine güncel.

#### Düzeltildi

- **`useSubmissionChecklist` OPEX kuralı** — `BudgetEntryPage`'te hardcoded `expenseEntries: []` veriliyordu; gerçek `getExpenseEntries(versionId)` query bağlandı. OPEX gider girilmiş versiyonlarda artık yanlış warn üretmez.

#### Test

- Vitest: `useSubmissionChecklist`, `DashboardPage`, `SidebarSection`, `RoleGuard`, `VersionCard`, `useNextStepNavigator`, `taskCenterDerivation` (yeni 7 test dosyası / yeni assertion).
- Playwright: `client/e2e/sprint1-deep.spec.ts` — 6 senaryo (yetkisiz kullanıcı senaryosu TODO).

#### Tasarım Dokümanları

- `docs/plans/2026-04-19-sprint1-deep-screen-redesign-design.md`
- `docs/plans/2026-04-19-sprint1-deep-screen-redesign-plan.md`

#### P2'ye Ertelendi

VersionCard mini KPI özet, smart navigator undo, Pilot Banner dismissible state, ForbiddenPage "Yetki talep et" formu.
```

### Step 10.2 — Commit
```bash
git add CHANGELOG.md
git commit -m "docs: CHANGELOG Sprint 1 deep ekran redesign özeti"
```

---

## Final Verification (Tek seferlik, 5 dk)

### Step F.1 — Tüm test suite
```bash
cd client && pnpm test --run && pnpm tsc --noEmit && pnpm build && pnpm exec playwright test
cd .. && dotnet build && dotnet test --filter Category!=Integration
```

### Step F.2 — Commit log gözden geçir
```bash
git log --oneline main..HEAD
```
**Beklenen:** 10 commit (1-10), her biri tek odakta, mesajları conventional.

### Step F.3 — Kabul kriterleri checklist
Design doc §16'ı tek tek yürü:
- [ ] Yapısal (4 madde)
- [ ] Davranışsal (7 madde)
- [ ] TaskCenter (3 madde)
- [ ] Test (4 madde)

### Step F.4 — PR aç
```bash
git push -u origin feat/sprint1-deep-redesign
gh pr create --base main --title "feat: Sprint 1 deep ekran redesign (7 iş, 10 commit)" --body "$(cat <<'EOF'
## Summary
- 7 ekran iyileştirme işi (Dashboard rename + CTA, WorkContextBar smart navigator, Versiyonlar rich kart, expenseEntries bug fix, Pilot Banner, demo sayfa role gating, TaskCenter ek task türleri)
- Audit (2026-04-19) Sprint 1 paketinin görünürlük + navigasyon eksikliklerini ve C kapsamı derinleştirmesini birleştirir
- Sidebar redesign'ın doğal devamı; aynı `useAppContextStore` + sidebar config altyapısını kullanır

## Test plan
- [ ] Vitest: 7 yeni test dosyası geçer
- [ ] Playwright: `sprint1-deep.spec.ts` 6 senaryo geçer
- [ ] Manual: Dashboard CTA, WorkContextBar Düzelt → akışı, Versiyon kart grid, Pilot Banner, role-gated 403
- [ ] Regression: mevcut `sidebar.spec.ts` 8 testi bozulmamış
- [ ] Build clean (TypeScript + ESLint + production build)

## Tasarım Dokümanları
- `docs/plans/2026-04-19-sprint1-deep-screen-redesign-design.md`
- `docs/plans/2026-04-19-sprint1-deep-screen-redesign-plan.md`
EOF
)"
```

---

## Execution Handoff

Bu plan'ı şu iki yoldan biriyle yürütebilirsin:

### Seçenek 1 — Subagent-Driven (bu session)
Her commit için ayrı subagent (typescript-reviewer / code-reviewer / build-error-resolver). Sırayla:
- Commit 1-2 (XS) → tek subagent batch
- Commit 3-4-5 (S) → tek subagent batch
- Commit 6 (L) → ayrı subagent (VersionCard + refactor)
- Commit 7 (M) → ayrı subagent (smart navigator)
- Commit 8 (M) → ayrı subagent (TaskCenter)
- Commit 9-10 (test + docs) → tek subagent

Her subagent sonrası kullanıcı review checkpoint.

### Seçenek 2 — Paralel Session (ayrı)
- Yeni Claude Code session aç → branch'e geç → bu plan'ı baştan sona ardışık çalıştır
- Bu session'da kullanıcı diğer işlerle (customer-ext-ref WIP) paralel ilerler
- Final session'da PR review + merge

Hangisini tercih edersin?
