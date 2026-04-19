# Sprint 1 Deep — Ekran Yeniden Tasarımı (Görev Merkezi · Versiyonlar · Çalışma Bandı · Demo Ayrıştırma)

**Tarih:** 2026-04-19
**Durum:** Onaylandı — implementation plan yazımına hazır
**Kapsam:** Dashboard, Bütçe Planlama, Versiyonlar (`BudgetPeriodsPage`), Forecast/PnL/Konsolidasyon ve `TaskCenter` derivation
**Önkoşul:** Sidebar redesign (`2026-04-19-sidebar-information-architecture-redesign-design.md`) shipped — `useAppContextStore.selectedVersionId/Label/Status` ve `SidebarContextBar` mevcut.

---

## 1. Problem

Sidebar yeniden mimarisi sonrasında ekranların kendisi hâlâ "modül ekranı" gibi davranıyor: kullanıcıya "burada ne yaparım, sıradaki adım ne, bu sayfa demo mu üretim mi?" bilgisini vermiyor. Audit'in (2026-04-19) ortaya koyduğu Sprint 1 paketinin %70'i **zaten kodlanmış** ama görünürlük + navigasyon eksiklikleri kalmış:

- `DashboardPage` başlığı hâlâ İngilizce (`Executive Dashboard`); aktif versiyon yokken sadece düz metin var, CTA yok
- `WorkContextBar` (Bütçe Planlama üstü) progress + status gösteriyor ama "**şimdi şuna odaklan**" prompt'u yok; kullanıcı sıradaki adımı bilmiyor
- `BudgetPeriodsPage` "Versiyonlar" hâlâ tablo formatında; audit "kart bazlı + tek ana aksiyon" diyor
- `useSubmissionChecklist`'e `expenseEntries: []` hardcoded geçiliyor (BudgetEntryPage:266) → OPEX kuralı her zaman yanlış warn üretiyor (mini bug)
- `Forecast` / `P&L` / `Konsolidasyon` demo veri ile çalışıyor ama menüde + sayfa başlığında üretim ekranı gibi görünüyor; sadece bazı grafik kartlarında küçük "Demo veri" rozeti var
- `TaskCenter` 5 task türü türetiyor ama **sapma uyarısı** ve **eksik onay** task'ları yok (rol-aware ama sınırlı)

## 2. Hedef

Audit'in Sprint 1 başarı ölçütlerini karşıla:
- Yeni kullanıcı ilk 10 dakikada yön sormadan ilerleyebilmeli
- Kullanıcı "neden gönderemiyorum?" sorusuna ekranda cevap bulmalı + tek tıkla düzeltebilmeli
- Demo ekranlar üretim akışından **görsel ve erişim olarak** ayrışmalı
- Yetkili kullanıcı dashboard'da bekleyen sapma + onay görevlerini ilk bakışta görmeli

## 3. Mevcut Durum vs. İstenenler (Gap Tablosu)

| Audit Maddesi | Mevcut | Gap |
|---|---|---|
| Dashboard → Görev Merkezi | `TaskCenter` + `useTaskCenter` rol-aware var | Başlık İngilizce; boş durum CTA yok; sapma + eksik onay task türleri yok |
| Bütçe Planlama üst bandı | `WorkContextBar` (yıl/versiyon/progress/status/Revizyon Aç) var | "Sıradaki adım" prompt'u + navigasyon CTA yok |
| Onaya Gönder checklist | `SubmissionChecklist` + `useSubmissionChecklist` (1 sert + 4 yumuşak) var | `expenseEntries: []` hardcoded (bug) |
| Versiyonlar kart bazlı | `BudgetPeriodsPage` tablo + `RevisionTimeline` + `primaryAction` rol-aware var | Görsel format hâlâ tablo; rich kart layout yok |
| Demo ayrıştırma | `Demo veri` chip bazı grafiklerde var | Sayfa-üstü Pilot bandı yok; menüde rozet yok; role gating yok |

## 4. 7 İş Özet

| # | İş | Boyut |
|---|---|---|
| 1 | Dashboard rename (`Executive Dashboard` → `Ana Sayfa`) + boş durum CTA | XS |
| 2 | `WorkContextBar` Smart Navigator (sıradaki adım prompt + Düzelt → CTA) | M |
| 3 | Versiyonlar: tablo → Rich Status-Driven Kart layout | L |
| 4 | `expenseEntries` checklist bug fix (gerçek OPEX feed) | XS |
| 5 | Demo sayfalarda Pilot Banner (Forecast/PnL/Konsolidasyon) | S |
| 6 | Demo sayfalarda role gating (sidebar config + AuthGuard route guard) | S |
| 7 | `TaskCenter` ek task türleri (sapma uyarısı + eksik onay) | M |

---

## 5. İş 1 — Dashboard Rename + Boş Durum CTA

### Değişiklikler

**`DashboardPage.tsx`:**
- L93, L104, L118: `Executive Dashboard` → `Ana Sayfa`
- L101-112 (boş durum) — düz metin yerine:

```tsx
{versionId === null && (
  <section>
    <h2>Ana Sayfa</h2>
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
)}
```

### Kabul

- Hiçbir yerde `Executive Dashboard` metni kalmamış
- Aktif versiyon yokken `Yeni Versiyon Oluştur` CTA görünür ve `/budget/planning?tab=versions` route'una yönlendirir

---

## 6. İş 2 — WorkContextBar Smart Navigator

### Tasarım

`WorkContextBar` (`client/src/components/budget-planning/WorkContextBar.tsx`) düzenlenebilir varyantına 2. satır eklenir:

```
┌─ FY 2026 › V5 Taslak  [Taslak]  ✏ Düzenleyebilirsiniz ──┐
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│ ████████████░░░░░░░  9/14 müşteri · TRY · Senaryo: Baz   │
│ ─────────────────────────────────────────────────────── │
│ 🎯 Sıradaki adım: 5 müşteride hasar planı yok           │
│                                       [ Düzelt → ]      │
└─────────────────────────────────────────────────────────┘
```

### Yeni Hook: `useNextStepNavigator.ts`

```ts
import type { ChecklistResult, ChecklistItem } from './useSubmissionChecklist'

export interface NextStepAction {
  kind: 'jump-to-customer' | 'jump-to-opex' | 'highlight-scenario' | 'none'
  customerId?: number
  scrollToMonth?: number
  scrollToType?: 'REVENUE' | 'CLAIM'
  expenseCategoryId?: number
}

export interface NextStep {
  message: string                         // "5 müşteride hasar planı yok"
  ctaLabel: string                        // "Düzelt →"
  level: 'fail' | 'warn' | 'pass'
  action: NextStepAction
}

/**
 * Checklist'in en yüksek priority item'ından tek navigasyon hedefi türetir.
 * fail > warn > pass; eşitlikte sırasıyla: missing-customer > empty-month >
 * claim-missing > opex > scenario.
 */
export function deriveNextStep(
  checklist: ChecklistResult,
  context: { customers: Customer[]; entries: Entry[]; opexCategories: OpexCategory[] },
): NextStep | null {
  // 1. fail level → tüm-müşteri eksikse ilk eksik müşteriye scroll
  // 2. empty-month warn → boş ayı olan ilk müşteri + ilk boş ay
  // 3. claim-missing warn → CLAIM eksik ilk müşteri + CLAIM satırı
  // 4. opex warn → ilk OPEX kategorisi
  // 5. scenario warn → highlight-scenario
}
```

### Navigasyon Hedefleri (`onJumpTo` callback)

`BudgetEntryPage` `WorkContextBar`'a `onJumpTo: (action: NextStepAction) => void` geçer. Handler içinde:

| `action.kind` | Davranış |
|---|---|
| `jump-to-customer` | `setMode('customer')` + `setSelection({ kind: 'customer', customerId, segmentId })` + `scrollToMonth` varsa `BudgetCustomerGrid`'de o aya focus + 1 sn `data-attention` pulse |
| `jump-to-opex` | `setMode('tree')` + `setSelection({ kind: 'opex', expenseCategoryId })` |
| `highlight-scenario` | Senaryo dropdown'una 2 sn pulse animasyonu (`data-attention="scenario"` attribute → CSS animation) |

### CSS Pulse

`client/src/styles/global.css`:

```css
[data-attention] {
  animation: attention-pulse 1s ease-out;
}
@keyframes attention-pulse {
  0%, 100% { box-shadow: 0 0 0 0 transparent; }
  50% { box-shadow: 0 0 0 6px rgba(0, 35, 102, 0.25); }
}
```

### Kabul

- Düzenlenebilir varyantta sıradaki adım satırı her zaman görünür (gerçek priority varsa CTA, "hazır" ise success rozeti)
- "Düzelt →" tıklanınca BudgetEntryPage state'i değişir + scroll/pulse tetiklenir
- Salt-okunur varyant değişmez (Aktif/Arşiv durumlarında "sıradaki adım" yok)

---

## 7. İş 3 — Versiyon Rich Status-Driven Kart Layout

### Mevcut → Yeni

`BudgetPeriodsPage` table render'ı (line 322-422) silinir; yerine `VersionCard` component'i + grid:

```
┌─ [4px renkli status şeridi solda] ──────────────────────┐
│ v2026.1 İlk Plan                          [Aktif] chip   │
│ #42 · 2026-04-12 · Red gerekçesi varsa: "..."           │
│ ─────────────────────────────────────────────────────── │
│ 🎯 Sıradaki adım                                        │
│    Finans onayı bekliyor.                               │
│ ─────────────────────────────────────────────────────── │
│ [        Finans Onayla →   (tam genişlik primary)     ] │
│                                                    [⋯]  │
└─────────────────────────────────────────────────────────┘
```

### Yeni Component: `VersionCard.tsx`

```ts
interface VersionCardProps {
  version: BudgetVersionRow
  roles: { isAdmin: boolean; isFinance: boolean; isCfo: boolean }
  handlers: {
    goToPlanning: (vid: number) => void
    transition: (vid: number, endpoint: string) => void
    createRevision: (vid: number) => void
    reject: (vid: number) => void
    archive: (vid: number) => void
  }
  onScrollHere?: boolean   // RevisionTimeline tıklandığında highlight için
}
```

### Status Şeridi Renk Mapping

| Status | Renk | CSS class |
|---|---|---|
| `Active` | Yeşil (`success`) | `border-l-4 border-l-success` |
| `Draft` | Kehribar (`warning`) | `border-l-4 border-l-warning` |
| `PendingFinance` / `PendingCfo` | Mavi (`primary`) | `border-l-4 border-l-primary` |
| `Rejected` | Kırmızı (`error`) | `border-l-4 border-l-error` |
| `Archived` | Gri | `border-l-4 border-l-on-surface-variant` |

### Sıralama

1. Aktif versiyon her zaman en üstte (Aktif yoksa: ilk in-progress)
2. Diğerleri `createdAt DESC`
3. `Archived` en altta

### Grid Layout

- `grid grid-cols-1 lg:grid-cols-2 gap-4` — yıl başına genelde 2-3 versiyon, max iki kolon yeterli
- `RevisionTimeline` üstte sabit kalır

### `BudgetPeriodsPage` Değişiklikleri

- L322-422 (`<table>` bloğu) silinir
- Yerine: `versions.map(v => <VersionCard ... />)` grid render
- `primaryAction` mantığı `VersionCard`'a taşınır (helper olarak kalır, props alır)
- `REJECTABLE_STATUSES`, `canArchive` mantığı kart içinde `⋯` menüde aynen kalır
- Boş durum (`versions.length === 0`) — mevcut "İlk taslağı oluşturun" empty state korunur

### Kabul

- 0 satır `<table>` Versiyonlar görünümünde
- Aktif versiyon her zaman en üstte yeşil şeritli
- Tek primary buton kart başına (rol uygun değilse "—" yerine buton hiç render edilmez)
- `RevisionTimeline` tıklama → kart highlight çalışır (mevcut mantık korunur, sadece DOM hedefi değişir)

---

## 8. İş 4 — `expenseEntries` Bug Fix

### Sorun

`BudgetEntryPage:266`:

```ts
const checklist = useSubmissionChecklist({
  customers,
  entries,
  expenseEntries: [],   // ← hardcoded boş
  scenarioId,
})
```

Sonuç: `useSubmissionChecklist` her zaman "OPEX kategorilerinde gider girilmedi" warn'ı üretir.

### Çözüm

`getExpenseEntries(versionId)` API call (mevcut: `/api/v1/expenses/version/{versionId}` veya benzeri — `ExpenseEntriesController`'ı incelenecek; yoksa eklenir). Hook ile beslenir:

```ts
const expenseEntriesQuery = useQuery({
  queryKey: ['expense-entries', versionId],
  queryFn: () => versionId ? getExpenseEntries(versionId) : Promise.resolve([]),
  enabled: versionId !== null,
})
const expenseEntries = useMemo(() => expenseEntriesQuery.data ?? [], [expenseEntriesQuery.data])

const checklist = useSubmissionChecklist({
  customers,
  entries,
  expenseEntries,
  scenarioId,
})
```

### Kabul

- OPEX gider varsa checklist `pass` döner ("X OPEX gider satırı girildi")
- OPEX gider yoksa `warn` döner (mevcut davranış)
- Network'te ek 1 GET, parallel ile diğerleriyle birlikte yüklenir

---

## 9. İş 5 — Demo Sayfa Pilot Banner

### Yeni Component: `PilotBanner.tsx`

```tsx
interface PilotBannerProps {
  feature: string                // "Tahmin", "P&L Raporu", "Konsolidasyon"
  description: string            // "Bu modül pilot aşamasında. Veriler örnek..."
  releaseTarget?: string         // "FAZ 9" gibi opsiyonel hedef
}

export function PilotBanner({ feature, description, releaseTarget }: PilotBannerProps) {
  return (
    <div className="card mb-6 border-l-4 border-l-warning bg-warning/5">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-warning" style={{ fontSize: 24 }}>
          science
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-on-surface">{feature}</h3>
            <span className="chip chip-warning text-xs">Pilot — Demo Veri</span>
          </div>
          <p className="text-sm text-on-surface-variant mt-1">{description}</p>
          {releaseTarget && (
            <p className="text-xs text-on-surface-variant mt-1">
              Hedef yayın: <strong>{releaseTarget}</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
```

### Sayfalara Entegrasyon

| Sayfa | `feature` | `description` |
|---|---|---|
| `ForecastPage` | "Tahmin" | "Bu modül pilot aşamasında. Tahmin algoritması ve senaryo enjeksiyonu üzerinde çalışılıyor; gösterilen veriler örnek." |
| `PnlReportPage` | "P&L Raporu" | "Bu rapor pilot aşamasında. Aktif versiyonun gerçek P&L hesaplaması için backend agregasyon endpoint'i bağlanacak." |
| `ConsolidationPage` | "Konsolidasyon" | "Bu modül pilot aşamasında. Grup şirket konsolidasyonu için inter-company eliminations ve mahsuplaşma kuralları henüz tanımlanmadı." |

Mevcut grafik kartlarındaki "Demo" chip'leri kalır (kart bazlı seviye); banner sayfa-üstü uyarı.

### Sidebar Rozet

`sidebar-config.ts`'e `pilot?: boolean` field eklenir:

```ts
{ label: 'Tahmin', to: '/forecast', icon: 'trending_up', pilot: true },
{ label: 'P&L Raporu', to: '/reports/pnl', icon: 'monitoring', pilot: true },
{ label: 'Konsolidasyon', to: '/consolidation', icon: 'hub', pilot: true },
```

`SidebarSection.tsx` item render'ında `pilot === true` ise label sağına küçük "Pilot" etiketi:

```tsx
{item.pilot && (
  <span className="ml-auto text-[0.625rem] text-warning font-semibold uppercase tracking-wider">
    Pilot
  </span>
)}
```

### Kabul

- Üç sayfa açılır açılmaz üstte sarı şeritli banner görünür
- Sidebar'da üç item'ın yanında "Pilot" etiketi mevcut
- Mevcut grafik kartı `Demo` chip'leri silinmez (banner ile katmanlı)

---

## 10. İş 6 — Demo Sayfa Role Gating

### Sidebar Config Genişlet

`sidebar-config.ts`:

```ts
export interface SidebarItem {
  label: string
  to: string
  icon: string
  end?: boolean
  matchTabParam?: string
  pilot?: boolean
  requiresRole?: ReadonlyArray<'Admin' | 'CFO' | 'FinanceManager'>   // YENİ
}
```

Demo item'larına eklenir:

```ts
{
  label: 'Tahmin',
  to: '/forecast',
  icon: 'trending_up',
  pilot: true,
  requiresRole: ['Admin', 'CFO', 'FinanceManager'],
},
// PnL ve Konsolidasyon aynı şekilde
```

### `Sidebar.tsx` Filter

Render öncesi `SIDEBAR_SECTIONS`'tan rolüne uygun olmayan item'lar filtrelenir:

```ts
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

### Route Guard

Yeni component `RoleGuard.tsx`:

```tsx
interface RoleGuardProps {
  allow: ReadonlyArray<'Admin' | 'CFO' | 'FinanceManager'>
  children: React.ReactNode
}

export function RoleGuard({ allow, children }: RoleGuardProps) {
  const { user } = useAuthStore()
  const userRoles = new Set(user?.roles ?? [])
  const allowed = allow.some(r => userRoles.has(r))
  if (!allowed) return <ForbiddenPage />
  return <>{children}</>
}
```

`App.tsx`'te `/forecast`, `/reports/pnl`, `/consolidation` route'ları `<RoleGuard allow={['Admin', 'CFO', 'FinanceManager']}>` içine sarılır.

### `ForbiddenPage.tsx` (yeni)

```tsx
export function ForbiddenPage() {
  return (
    <section>
      <div className="card p-8 text-center">
        <span className="material-symbols-outlined text-error" style={{ fontSize: 48 }}>
          lock
        </span>
        <p className="text-base font-semibold text-on-surface mt-3">Erişim yok</p>
        <p className="text-sm text-on-surface-variant mt-1">
          Bu sayfayı görüntülemek için yetkiniz bulunmuyor.
        </p>
        <Link to="/" className="btn-primary mt-4 inline-flex">Ana Sayfa'ya Dön</Link>
      </div>
    </section>
  )
}
```

### Kabul

- `Admin` / `CFO` / `FinanceManager` rolüne sahip olmayan kullanıcı sidebar'da `Tahmin`, `P&L Raporu`, `Konsolidasyon` item'larını görmez
- URL'i elle yazsa bile `ForbiddenPage` görür
- Yetkili kullanıcılar için davranış değişmez

---

## 11. İş 7 — TaskCenter Yeni Task Türleri

### Mevcut Türler (`taskCenterDerivation.ts`)

`continue-` (DRAFT eksik), `submit-` (DRAFT tamam), `fix-` (REJECTED), `approve-finance-`, `approve-cfo-`, `revise-` (ACTIVE).

### Yeni Tür 1: Sapma Uyarısı (`variance-{versionId}`)

**Backend:** `/api/v1/variance/{versionId}/summary` zaten mevcut. Response shape `IVarianceService.GetVarianceSummaryAsync` ile belirleniyor — implementation plan aşamasında inceleneceğiz; varsayım: `{ totalVariancePercent, criticalCategoryCount }` benzeri.

**Hook:** `useTaskCenter` içinde aktif versiyon varsa ek `useQuery`:

```ts
const varianceQuery = useQuery({
  queryKey: ['variance-summary', activeVersion?.id],
  queryFn: () => activeVersion ? api.get(`/variance/${activeVersion.id}/summary`).then(r => r.data) : null,
  enabled: !!activeVersion,
})
```

**Derivation kuralı:** Aktif versiyonda `totalVariancePercent >= 20` veya `criticalCategoryCount > 0` ise:

```ts
{
  id: `variance-${activeVersion.id}`,
  title: `${activeVersion.name} — %${variance.totalVariancePercent.toFixed(0)} sapma`,
  subtitle: `${variance.criticalCategoryCount} kategoride kritik fark`,
  ctaLabel: 'Sapma Analizine Git',
  ctaHref: '/variance',
  priority: 'high',
  icon: 'warning',
}
```

**Rol:** Tüm rollere görünür (sapma operasyonel uyarı, gizli değil).

### Yeni Tür 2: Eksik Onay Özet (`pending-approvals-summary`)

Mevcut `approve-finance-` ve `approve-cfo-` task'ları her versiyon için ayrı kart üretiyor. Birden fazla versiyon onayda ise dashboard 2-4 kart ile dolar. Ek **özet** task'ı:

**Derivation kuralı:** `isFinance` veya `isCfo` rolüne sahip kullanıcı için, 2+ onay bekleyen versiyon varsa tek özet kart:

```ts
const pendingForUser = versions.filter(v =>
  (v.status === 'PendingFinance' && isFinance) ||
  (v.status === 'PendingCfo' && isCfo)
)

if (pendingForUser.length >= 2) {
  tasks.push({
    id: 'pending-approvals-summary',
    title: `${pendingForUser.length} versiyon onayınızı bekliyor`,
    subtitle: 'Onaylar ekranında karar verin',
    ctaLabel: 'Onaylar Ekranı',
    ctaHref: '/approvals',
    priority: 'high',
    icon: 'rule',
  })
  // Bu durumda tek tek approve-* task'ları suppress edilir → dashboard sade kalır
}
```

### Test Coverage

Yeni `taskCenterDerivation.test.ts` senaryoları:
- Sapma %15 → task yok
- Sapma %25 → high priority task var
- 1 onay bekleyen → bireysel task (mevcut davranış)
- 3 onay bekleyen → özet task var, bireysel task'lar suppress
- Variance + onay birlikte → her ikisi de listede, sapma önce (high + earlier)

### Kabul

- Aktif versiyonda %20+ sapma varsa dashboard'da kart görünür
- 2+ onay bekleyen kullanıcı için liste sadeleşir (özet + tek tıkla `/approvals`)
- TaskCenter task limiti 4 → öncelik sırası respect edilir

---

## 12. Yeni Dosyalar / Değişen Dosyalar

### Yeni Dosyalar

| Dosya | Sorumluluk |
|---|---|
| `client/src/components/budget-planning/useNextStepNavigator.ts` | Checklist'ten tek priority navigation hedefi türetir |
| `client/src/components/budget-planning/VersionCard.tsx` | Rich status-driven versiyon kartı |
| `client/src/components/shared/PilotBanner.tsx` | Pilot/Demo sayfa-üstü uyarı bandı |
| `client/src/components/auth/RoleGuard.tsx` | Route-level rol kontrolü |
| `client/src/pages/ForbiddenPage.tsx` | 403 yetki yok ekranı |
| `client/src/components/budget-planning/api.ts` (genişletme) | `getExpenseEntries(versionId)` helper |
| `tests/...VersionCard.test.tsx`, `useNextStepNavigator.test.ts`, `taskCenterDerivation.test.ts` | Vitest |
| `client/e2e/sprint1-deep.spec.ts` | Playwright E2E |

### Değişen Dosyalar

| Dosya | Değişiklik |
|---|---|
| `client/src/pages/DashboardPage.tsx` | Rename + boş durum CTA |
| `client/src/components/budget-planning/WorkContextBar.tsx` | Smart navigator satırı |
| `client/src/pages/BudgetEntryPage.tsx` | `expenseEntries` gerçek feed + `onJumpTo` callback |
| `client/src/pages/BudgetPeriodsPage.tsx` | `<table>` → `VersionCard` grid |
| `client/src/pages/ForecastPage.tsx` | `<PilotBanner />` ekle |
| `client/src/pages/PnlReportPage.tsx` | `<PilotBanner />` ekle |
| `client/src/pages/ConsolidationPage.tsx` | `<PilotBanner />` ekle |
| `client/src/components/layout/sidebar-config.ts` | `pilot?: boolean` + `requiresRole?` field |
| `client/src/components/layout/SidebarSection.tsx` | `pilot` rozet render |
| `client/src/components/layout/Sidebar.tsx` | `requiresRole` filter |
| `client/src/App.tsx` | `/forecast`, `/reports/pnl`, `/consolidation` `RoleGuard` ile sar |
| `client/src/components/dashboard/taskCenterDerivation.ts` | Sapma + özet onay task'ları |
| `client/src/components/dashboard/useTaskCenter.ts` | Variance summary query + activeVersion bilgisi |
| `client/src/styles/global.css` | `[data-attention]` pulse animation |

## 13. Veri Modeli Eklemeleri

```ts
// sidebar-config.ts
export interface SidebarItem {
  label: string
  to: string
  icon: string
  end?: boolean
  matchTabParam?: string
  pilot?: boolean
  requiresRole?: ReadonlyArray<'Admin' | 'CFO' | 'FinanceManager'>
}

// useNextStepNavigator.ts
export interface NextStepAction {
  kind: 'jump-to-customer' | 'jump-to-opex' | 'highlight-scenario' | 'none'
  customerId?: number
  scrollToMonth?: number
  scrollToType?: 'REVENUE' | 'CLAIM'
  expenseCategoryId?: number
}

export interface NextStep {
  message: string
  ctaLabel: string
  level: 'fail' | 'warn' | 'pass'
  action: NextStepAction
}

// taskCenterDerivation.ts (yeni alanlar)
interface VarianceSummary {
  totalVariancePercent: number
  criticalCategoryCount: number
}

export interface DeriveContext {
  versions: VersionRow[]
  entriesPerVersion: Record<number, { customerId: number }[]>
  customerIds: number[]
  roles: string[]
  varianceByVersion?: Record<number, VarianceSummary>   // YENİ
}
```

## 14. Uygulama Sırası (Commit Bazlı)

| # | Commit | Bağımlılık |
|---|---|---|
| 1 | `fix: expenseEntries gerçek OPEX feed (checklist warn doğruluğu)` | Bağımsız — diğer her şeyin önünde |
| 2 | `feat: Dashboard 'Ana Sayfa' rename + boş versiyon CTA` | Bağımsız |
| 3 | `feat: PilotBanner + Forecast/PnL/Konsolidasyon entegrasyonu` | Bağımsız |
| 4 | `feat: sidebar-config pilot rozet + requiresRole field` | 3 ile sıralı (config genişletme) |
| 5 | `feat: RoleGuard + ForbiddenPage + demo sayfa route koruması` | 4 ile sıralı |
| 6 | `feat: VersionCard rich kart layout (BudgetPeriodsPage refactor)` | Bağımsız |
| 7 | `feat: useNextStepNavigator + WorkContextBar smart navigator` | 1 sonrası (gerçek checklist) |
| 8 | `feat: TaskCenter sapma + onay özet task türleri` | Bağımsız |
| 9 | `test: Sprint 1 deep E2E (sprint1-deep.spec.ts)` | Tüm önceki commit'ler |
| 10 | `docs: CHANGELOG Sprint 1 deep özeti` | Son |

Her commit sonrası: `pnpm build` + `pnpm test` + manuel smoke.

## 15. Test Stratejisi

### Vitest (Unit)

- `useNextStepNavigator.test.ts`:
  - fail (eksik müşteri) → `jump-to-customer`
  - empty-month warn → ilk boş ay ile `jump-to-customer`
  - claim-missing warn → `scrollToType: 'CLAIM'`
  - opex warn → `jump-to-opex`
  - scenario warn → `highlight-scenario`
  - hepsi pass → `null` ya da success message
- `VersionCard.test.tsx`:
  - Status renk şeridi her durum için doğru class
  - `primaryAction` rol matrix'i (Admin/Finance/CFO × her status)
  - `⋯` menü Reddet/Arşivle görünürlük
  - `onScrollHere` prop attention class trigger
- `taskCenterDerivation.test.ts`:
  - Sapma <%20 → task yok
  - Sapma >=%20 → high priority task
  - 2+ onay → özet task + bireysel suppress
  - 1 onay → bireysel task (özet yok)
- `Sidebar.test.tsx`:
  - `requiresRole` filter — yetkili görür, yetkisiz görmez
  - `pilot: true` → "Pilot" etiketi render

### Playwright E2E (`sprint1-deep.spec.ts`)

1. Login → Dashboard → "Ana Sayfa" başlığı görünür
2. Aktif versiyon yokken `Yeni Versiyon Oluştur` CTA'sı `/budget/planning?tab=versions`'a gider
3. Bütçe Planlama → eksik müşteri varsa WorkContextBar'da "Sıradaki adım" + "Düzelt →" görünür
4. "Düzelt →" tıklanınca müşteri seçimi değişir + URL state korunur
5. Versiyonlar tab → `<table>` yok, kart grid var, Aktif kart en üstte yeşil şeritli
6. Forecast sayfası → üstte sarı PilotBanner görünür + chip "Pilot — Demo Veri"
7. Sıradan kullanıcı (Admin değil) → `/forecast` URL → ForbiddenPage
8. Admin kullanıcı → sidebar'da Tahmin item'ı + "Pilot" etiketi görünür
9. Aktif versiyonda yüksek sapma varsa dashboard'da sapma task kartı görünür

### Regression

- Mevcut `sidebar.spec.ts` 8 testi geçmeli (rename'ler bozmamalı)
- `BudgetPeriodsPage` boş durum (versiyon yok) hâlâ "İlk Taslak" CTA ile çalışıyor
- `WorkContextBar` salt-okunur varyantı (Active/Archived) değişmemiş
- `RevisionTimeline` tıklama → kart highlight çalışıyor (hedef DOM kart, satır değil)

## 16. Kabul Kriterleri (Toplu)

### Yapısal
- [ ] `Executive Dashboard` metni hiçbir yerde yok
- [ ] `BudgetPeriodsPage`'de `<table>` yok (Versiyonlar görünümünde)
- [ ] `VersionCard.tsx`, `PilotBanner.tsx`, `RoleGuard.tsx`, `ForbiddenPage.tsx`, `useNextStepNavigator.ts` mevcut ve export edilmiş
- [ ] `sidebar-config.ts` `pilot` + `requiresRole` field'larıyla güncellenmiş

### Davranışsal
- [ ] Aktif versiyon yokken Dashboard CTA `/budget/planning?tab=versions`'a gider
- [ ] WorkContextBar smart navigator gerçek priority'yi gösterir + tıklanınca state değişir
- [ ] Versiyon kartlarında her status için doğru renk şeridi
- [ ] Aktif versiyon her zaman kart grid'in en üstünde
- [ ] OPEX gider varsa checklist `pass` döner
- [ ] Forecast/PnL/Konsolidasyon sayfa-üstünde Pilot Banner görünür
- [ ] Yetkisiz kullanıcı `/forecast` → ForbiddenPage

### TaskCenter
- [ ] Aktif versiyonda %20+ sapma → dashboard'da yüksek priority task
- [ ] 2+ onay bekleyen kullanıcı → tek özet task + bireysel suppress
- [ ] Mevcut 5 task türü davranışı bozulmamış

### Test
- [ ] Vitest yeni 4 dosya geçer
- [ ] Playwright `sprint1-deep.spec.ts` 9 test geçer
- [ ] Mevcut `sidebar.spec.ts` regresyon yok
- [ ] TypeScript build clean
- [ ] ESLint clean

## 17. Riskler

| Risk | Etki | Azaltma |
|---|---|---|
| `getExpenseEntries` endpoint shape değişebilir | Orta | İmplementasyon başlangıcında controller'ı oku; uyumsuzluk varsa minimal DTO ekle |
| `WorkContextBar` smart navigator selection değiştirince kullanıcının manuel seçimi kaybolur | Orta | "Düzelt →" tıklanmadan selection değişmez; navigator pasif (öneri) |
| `VersionCard` refactor `RevisionTimeline` highlight'ı kırabilir | Orta | E2E'de scroll + highlight test; commit 6'da manuel doğrulama |
| Variance endpoint response shape varsayımı yanlış olabilir | Düşük | İmplementasyon başlangıcında `IVarianceService` interface'i oku; gerekirse adapter |
| `RoleGuard` SSR uyumsuzluğu | Düşük | App client-only, SSR yok — N/A |
| Pilot Banner her sayfada görsel gürültü yaratabilir | Düşük | Banner sade tasarımlı, dismiss yok (kalıcı uyarı amaçlı) |
| `requiresRole` filter user.roles boş geldiğinde tüm pilot item'lar gizlenir | Düşük | Login sonrası `useAuthStore` user dolu; yine de fallback test eklenir |

## 18. Kapsam Dışı (P2'ye)

- TaskCenter "düzeltilmesi gereken taslak" türü (rejected versiyon detay)
- VersionCard'da mini KPI özet (gelir/hasar son güncellenme)
- WorkContextBar smart navigator için undo/back CTA
- Pilot Banner dismissible state (kalıcı uyarı tercih edildi)
- ForbiddenPage'e "Yetki talep et" formu

## 19. Kapsam Dışı (P3'e)

- Demo veri yerine "anonim sample dataset" üretimi
- Forecast/PnL/Konsolidasyon gerçek backend bağlantısı (ayrı feature, FAZ 9+)
- TaskCenter custom task ekleme (kullanıcı kendi reminder'ı)
- VersionCard sürükle-bırak sıralama
- Multi-tenant rol matrix (şu an roller sabit)

## 20. Sonraki Adım

Bu tasarım onaylandı. `writing-plans` skill'i ile detaylı commit-by-commit implementation plan yazılacak:

`docs/plans/2026-04-19-sprint1-deep-screen-redesign-plan.md`
