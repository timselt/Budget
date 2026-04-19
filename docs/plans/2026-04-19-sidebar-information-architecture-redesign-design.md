# Sidebar Information Architecture Redesign — Design

**Tarih:** 2026-04-19
**Durum:** Onaylandı — implementation plan yazımına hazır
**Kapsam:** `client/src/components/layout/Sidebar.tsx` ve ilişkili state/bağlam altyapısı

---

## 1. Problem

Mevcut sidebar iki düz array (`mainNav`, `mgmtNav`) ile kurulmuş ve 20 item'ı art arda dizerek **"uygulamada hangi sayfalar var?"** sorusuna cevap veriyor. Kullanıcı zihni ise **"işimi nereden yaparım?"** diye sorar. Bu uyumsuzluğun doğurduğu somut sorunlar:

- Aynı iş akışına ait ekranlar farklı gruplarda dağılmış (`Onay Akışı` Yönetim altında ama operasyonun merkezinde)
- Teknik terminoloji ile kullanıcı dili karışık (`Dashboard`, `Forecast`, `Audit Log`, `P&L Raporu`)
- `Raporlar` ve `P&L Raporu` iki ayrı ana menü → gereksiz karar yükü
- `Kategori Yönetimi` belirsiz — segment mi, ürün mü, gider sınıfı mı?
- Kullanım sıklığı ve amacı farklı ekranlar (Tahsilat, Konsolidasyon, Senaryolar, Forecast, Sapma Analizi) aynı düzlemde
- Aktif bütçe bağlamı (yıl + versiyon) sidebar'da görünmüyor; kullanıcı her sayfada kendi context'ini seçmek zorunda

## 2. Hedef

Sidebar bir **sistem haritası** değil, **iş yapma rehberi** gibi çalışmalı. Kullanıcının zihinsel akışını (Bugün ne yapacağım? → Hangi bütçe üzerinde? → Veri girişi → Onay/rapor/analiz → Tanımlar) doğrudan karşılayan section bazlı bir bilgi mimarisi.

## 3. Yeni Yapı (8 Section)

```
[Aktif bağlam satırı: "2026 / V5 Taslak"]

▸ Ana Sayfa                        → /

▾ Bütçe Çalışması         (açık)
    Versiyonlar                    → /budget/planning?tab=versions
    Bütçe Planlama                 → /budget/planning
    Gider Girişi                   → /expenses
    Özel Kalemler                  → /special-items

▸ Gerçekleşenler          (kapalı)
    Gerçekleşen                    → /actuals
    Tahsilat                       → /collections

▾ Onay ve Yayın           (açık)
    Onaylar                        → /approvals
    Revizyonlar                    → /revisions   (yeni placeholder)

▸ Analizler               (kapalı)
    Sapma Analizi                  → /variance
    Senaryolar                     → /scenarios
    Tahmin                         → /forecast
    Konsolidasyon                  → /consolidation

▸ Raporlar                (kapalı)
    Rapor Merkezi                  → /reports
    P&L Raporu                     → /reports/pnl

▸ Tanımlar                (kapalı)
    Müşteriler                     → /customers
    Ürünler                        → /products
    Sözleşmeler                    → /contracts
    Segmentler                     → /segments
    Gider Kategorileri             → /expense-categories

▸ Sistem                  (kapalı)
    İşlem Geçmişi                  → /audit
    Sistem Yönetimi                → /admin
```

## 4. İsim Dönüşümleri

| Eski | Yeni | Gerekçe |
|------|------|---------|
| `Dashboard` | `Ana Sayfa` | Kullanıcı dili |
| `Forecast` | `Tahmin` | Türkçe |
| `Onay Akışı` | `Onaylar` | Daha kısa, doğrudan |
| `Audit Log` | `İşlem Geçmişi` | Türkçe |
| `Yönetim` | `Sistem Yönetimi` | Kapsam netliği |
| `Kategori Yönetimi` | `Segmentler` | Route zaten `/segments` |
| `Müşteri Yönetimi` | `Müşteriler` | Sadeleştirme |
| `Ürün Yönetimi` | `Ürünler` | Sadeleştirme |

## 5. Accordion Davranışı

- Section başlığı tıklanınca alt item'lar açılır/kapanır
- Her section'ın `id`'si localStorage'a yazılır (`sidebar-section-open:<id>`)
- Varsayılan açık: `Bütçe Çalışması`, `Onay ve Yayın`
- Varsayılan kapalı: `Gerçekleşenler`, `Analizler`, `Raporlar`, `Tanımlar`, `Sistem`
- `Ana Sayfa` tek başına bir item (section değil)
- Sayfa değiştiğinde: aktif route'un bulunduğu section otomatik açılır (kullanıcının manuel kapattığı durumu override etmez → sadece hiç açılmamışsa)

## 6. Aktif Bağlam Satırı

Sidebar'da logo altında, tüm section'ların üstünde sabit bir satır:

```
2026 / V5 Taslak                  [durum rozeti: Taslak]
```

**Veri kaynağı:** Mevcut `useAppContextStore` (`client/src/stores/appContext.ts`) genişletilir. Yeni store açılmaz; çakışma önleme için tek bir global context.

Yeni eklenecek alanlar:

```ts
interface AppContextState {
  // ... mevcut alanlar
  selectedVersionId: number | null
  selectedVersionLabel: string | null        // "V5 Taslak"
  selectedVersionStatus: string | null       // "Draft" | "Active" | ...
  setVersion: (v: { id: number; label: string; status: string } | null) => void
}
```

**Başlangıç değeri (hydration):**
- App mount sırasında `useActiveVersion` hook'u (zaten mevcut: `client/src/lib/useActiveVersion.ts`) ile server-side auto-select yapılır
- Store boşsa hook sonucu store'a yazılır
- Kullanıcı elle seçim yapınca store güncellenir

**Entegrasyon (P1 kapsamı):**
- `BudgetEntryPage` — mevcut local `useState<versionId>` kaldırılır, store'a bağlanır
- `ActualsPage` — yıl seçimi zaten `selectedYear` üzerinden; dokunulmaz
- `ApprovalsPage`, `VariancePage`, `ForecastPage`, `PnlReportPage` — zaten `useActiveVersion` kullanıyor; bu sayfalar dokunulmaz, hook arka planda store'u hydrate eder

**Kritik tuzak:** `useActiveVersion` sunucudan otomatik seçer, kullanıcı seçimi değil. İki mekanizmanın tek store'da birleşmesi gerekir. BudgetEntryPage refactor'u ayrı commit olur ki regresyon izole kalsın.

## 7. Yeni Dosyalar / Değişiklikler

### Yeni Dosyalar

| Dosya | Sorumluluk |
|-------|-----------|
| `client/src/components/layout/sidebar-config.ts` | `SidebarSection[]` veri tanımı (immutable) |
| `client/src/components/layout/SidebarSection.tsx` | Accordion section bileşeni (başlık + collapse + localStorage) |
| `client/src/components/layout/SidebarContextBar.tsx` | Aktif yıl/versiyon/durum gösterimi |
| `client/src/pages/RevisionsPage.tsx` | Coming-soon placeholder |

### Değişen Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `client/src/components/layout/Sidebar.tsx` | Düz array → section bazlı render; `Rapor İndir` butonu kaldırılır |
| `client/src/App.tsx` | Yeni route: `/revisions` → `RevisionsPage` |
| `client/src/stores/appContext.ts` | `selectedVersionId/Label/Status` + `setVersion` eklenir |
| `client/src/pages/BudgetEntryPage.tsx` | Local versiyon state → store (ayrı commit) |

## 8. Veri Modeli

```ts
interface SidebarItem {
  label: string
  to: string
  icon: string
  end?: boolean
}

interface SidebarSection {
  id: string                    // accordion key, ör. "budget-work"
  label: string
  icon?: string
  defaultOpen: boolean
  items: SidebarItem[]          // boşsa kendisi tıklanabilir tek item
  // roles?: string[]           // P2 rezerv alan
  // badge?: () => string       // P2 rezerv alan
}
```

## 9. "Versiyonlar" Aktif State Sorunu

`Versiyonlar` ve `Bütçe Planlama` aynı route'u (`/budget/planning`) kullanıyor; ayrım query param ile (`?tab=versions`).

React Router default `isActive` her iki linki de aktif gösterir. Çözüm: custom matcher —

```ts
function matchVersionsTab(pathname: string, search: string): boolean {
  return pathname === '/budget/planning'
    && new URLSearchParams(search).get('tab') === 'versions'
}

function matchBudgetPlanning(pathname: string, search: string): boolean {
  return pathname === '/budget/planning'
    && new URLSearchParams(search).get('tab') !== 'versions'
}
```

## 10. Uygulama Sırası (Commit Bazlı)

1. **Commit 1:** `RevisionsPage.tsx` placeholder + `/revisions` route
2. **Commit 2:** `sidebar-config.ts` + `SidebarSection.tsx` + `Sidebar.tsx` refactor (accordion + yeni yapı + isim değişiklikleri + `Rapor İndir` kaldırma)
3. **Commit 3:** `active-budget-context.ts` store
4. **Commit 4:** `SidebarContextBar.tsx` + Sidebar'a entegrasyon
5. **Commit 5:** `BudgetEntryPage` versiyon dropdown store bağlantısı
6. **Commit 6:** `ActualsPage` yıl seçimi store bağlantısı
7. **Commit 7:** Diğer sayfalar (ApprovalsPage, VariancePage, ForecastPage) opsiyonel store okuma

Her commit sonrası: build + manuel smoke test.

## 11. Kapsam Dışı (P2'ye)

- Rol bazlı görünürlük (`roles` filtresi)
- `Onaylar` badge (`Bekleyen 3`)
- Tooltip / kısa açıklama
- Tanımsız sayfalara `disabled` işaretleme
- Coming-soon rozetleri

## 12. Kapsam Dışı (P3'e)

- Favori menü sabitleme
- Son kullanılan ekranlar bölümü
- Rol bazlı varsayılan landing page
- Mobile drawer optimizasyonu

## 13. Test Stratejisi

**Unit (Vitest):**
- `sidebar-config.ts` — tüm item'ların geçerli route'lara işaret ettiği (App.tsx route listesiyle cross-check)
- `SidebarSection.tsx` — localStorage state persistency, default open/closed
- `useActiveBudgetContext` — set/get/reset, çoklu tüketici senaryoları
- "Versiyonlar" custom matcher — query param kombinasyonları

**E2E (Playwright):**
- Login → sidebar görünür → 8 section doğru sırada
- Accordion aç/kapa → localStorage'a yazılıyor → refresh sonrası state kalıyor
- `Bütçe Planlama` tıklanınca dropdown versiyon değiştir → sidebar context satırı güncelleniyor
- `Revizyonlar` tıklanınca placeholder görünüyor
- Mobile viewport'ta taşma yok

**Regression:**
- Mevcut route'lar bozulmamış (tüm sayfalar hala erişilebilir)
- `Rapor İndir` butonu artık sidebar'da yok
- Eski isimler (`Dashboard`, `Forecast`) ekranda görünmüyor

## 14. Kabul Kriterleri

### Yapısal
- [ ] Sidebar section bazlı render ediyor (8 section + Ana Sayfa)
- [ ] 20 item yeni yapıda doğru gruplara yerleşmiş
- [ ] Tüm isim dönüşümleri uygulandı (Dashboard → Ana Sayfa, vb.)
- [ ] `Rapor İndir` butonu kaldırıldı
- [ ] `/revisions` route + placeholder sayfa çalışıyor

### Davranışsal
- [ ] Accordion tıklama aç/kapa çalışıyor
- [ ] Default open/closed tanımı respect edilmiş
- [ ] localStorage state refresh sonrası korunuyor
- [ ] Aktif route'un section'u otomatik açılıyor (hiç dokunulmadıysa)
- [ ] `Versiyonlar` ve `Bütçe Planlama` aktif state'leri doğru ayrışıyor

### Bağlam Satırı
- [ ] `useActiveBudgetContext` store çalışıyor
- [ ] `BudgetEntryPage` versiyon seçimi store'a yazıyor
- [ ] `ActualsPage` yıl seçimi store'a yazıyor
- [ ] Store boşken bağlam satırı gizli
- [ ] Store doluyken "2026 / V5 Taslak [Taslak]" formatında görünüyor

### UX
- [ ] Kullanıcı ilk bakışta operasyon / tanım / sistem alanlarını ayırabiliyor
- [ ] Menü isimleri iş dili kullanıyor
- [ ] Sidebar 1366×768 ekranda taşmıyor (accordion varsayılan state ile)
- [ ] Mobile viewport (375px) bozuk görünüm yok

### Test
- [ ] Unit testler ≥80% coverage
- [ ] Playwright E2E suite geçiyor
- [ ] TypeScript build clean
- [ ] ESLint clean

## 15. Riskler

| Risk | Etki | Azaltma |
|------|------|---------|
| Mevcut sayfaların local state'i store ile çakışır | Yüksek | Commit bazlı ayrıştırma (bkz. Bölüm 10), her sayfa ayrı PR |
| `?tab=versions` query param routing regresyon yaratabilir | Orta | Custom matcher için dedicated unit test |
| localStorage key çakışması (başka özellik aynı key'i kullanırsa) | Düşük | Prefix ile namespace: `sidebar-section-open:<id>` |
| Store SSR/hydration uyumsuzluğu | Düşük | App client-only, SSR yok — N/A |
| Accordion animasyonu düşük-end cihazlarda jank | Düşük | CSS-only transform/opacity animasyon (layout property animate etme) |

## 16. Sonraki Adım

Bu tasarım onaylandıktan sonra `writing-plans` skill'i ile detaylı commit-by-commit implementation plan yazılacak:

`docs/plans/2026-04-19-sidebar-information-architecture-redesign-plan.md`
