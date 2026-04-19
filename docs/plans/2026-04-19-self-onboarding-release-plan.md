# Self-Onboarding Release — Implementation Plan

- **Tarih:** 2026-04-19
- **Referans:** [`2026-04-19-self-onboarding-release-design.md`](2026-04-19-self-onboarding-release-design.md)
- **Branch:** `main`
- **Durum:** Onaya hazır

## Goal

Yeni kullanıcının eğitim almadan ilk 30 saniyede sistemi anlayıp doğru aksiyonu alabileceği UX katmanı: status copy birliği + Görev Merkezi + tek primary aksiyon + esnek checklist + kilitli ekran yönlendirme + 4-adım Gider modal.

## Architecture

Backend ve workflow değişmiyor — sadece frontend katmanı. Yeni 8 component/hook + 10 dosya güncellemesi. `useTaskCenter` ve `useSubmissionChecklist` mevcut TanStack Query cache'inden derivation yapar (yeni network call yok). Tüm status etiketleri `types.ts`'teki tek sözlüğe (`STATUS_LABELS` + `STATUS_NEXT_ACTIONS`) bağlanır — terminoloji drift'i bu commit sonrası imkansız.

## Tech Stack

- **Frontend:** React 19 · TypeScript · Vite · TanStack Query · Tailwind 4
- **Test:** Vitest + @testing-library/react (jest-dom matchers global setup'ta)
- **Smoke test:** Playwright MCP (manuel)
- **No backend:** sadece client/

---

## Approval Gate

**Bu plan onaylanmadan kod yazılmayacak.**

### Risk & Uyarılar

- **Tüm sayfalar mikro-yardım cümlesi alır** (~15 sayfa, 1 satır ekleme her birine). Bu büyük diff, ama düşük risk.
- **`STATUS_LABELS` değişikliği** (Section M1) — `PendingFinance: 'Finans Onayında' → 'Finans Kontrolünde'`. Bütün sayfalarda render edilen string değişir; mevcut visual smoke test'lerde "Finans Onayında" string match'leri varsa kırılır. (`grep` ile kontrol gerekli.)
- **Header `Excel İçe Aktar` → ⋯ menüsüne taşınması** UX değişikliği — kullanıcı eskiye alışkın, kısa süreli arayışa neden olabilir. Mikro-yardım cümlesi yardım edebilir.
- **Modal stepper refactor (M9)** — mevcut hızlı kullanıcılar 4 adımı yavaş bulabilir. P3'te "Hızlı mod" toggle eklenebilir; bu sprint'te değil.

### Test mantığı (TDD nerede uygulanır?)

| Modül | TDD? | Sebep |
|---|---|---|
| M1 status sözlük | Evet (kısa) | Pure functions: `getStatusLabel`, `getStatusNextAction` |
| M2 useTaskCenter | Evet | Pure derivation hook — input/output net |
| M6 useSubmissionChecklist | Evet | Pure derivation hook — sert+yumuşak kural test edilmeli |
| M8 translateApiError | Evet (kısa) | Pure function: error → string mapping |
| M3-M4 Versiyonlar UI | Hayır (visual smoke) | UI rendering, test maliyeti çok yüksek |
| M5 WorkContextBar | Hayır (visual smoke) | UI rendering |
| M7 boş durumlar | Hayır (visual smoke) | Sadece copy değişikliği |
| M9 Stepper modal | Hayır (visual smoke) | UI rendering |

### Dosya değişimi ön sayım

**Yeni dosyalar (8):**
- `client/src/components/budget-planning/WorkContextBar.tsx`
- `client/src/components/budget-planning/SubmissionChecklist.tsx`
- `client/src/components/budget-planning/useSubmissionChecklist.ts` (+ `.test.ts`)
- `client/src/components/budget-planning/RevisionTimeline.tsx`
- `client/src/components/budget-planning/Stepper.tsx`
- `client/src/components/dashboard/TaskCenter.tsx`
- `client/src/components/dashboard/useTaskCenter.ts` (+ `.test.ts`)
- `client/src/lib/api-error.ts` (+ `.test.ts`)

**Güncellenecek (~13):**
- `client/src/components/budget-planning/types.ts`
- `client/src/pages/DashboardPage.tsx`, `BudgetEntryPage.tsx`, `BudgetPeriodsPage.tsx`, `ApprovalsPage.tsx`, `ExpenseEntriesPage.tsx`, `ActualsPage.tsx`, `SpecialItemsPage.tsx`, `ScenariosPage.tsx`
- ~12 sayfada H2 altına 1 satır mikro-yardım

---

# GÜN 1 — Sözlük + Boş Durum + Error Helper (M1 + M7 + M8)

## Task 1.1 — RED: status sözlük testi yaz

**Files:**
- Create: `client/src/components/budget-planning/types.test.ts`

**Steps:**

1. Dosyayı oluştur:
   ```typescript
   import { describe, expect, it } from 'vitest'
   import {
     getStatusLabel,
     getStatusNextAction,
     getStatusChipClass,
   } from './types'

   describe('getStatusLabel', () => {
     it('returns Türkçe label for known status', () => {
       expect(getStatusLabel('Draft')).toBe('Taslak')
       expect(getStatusLabel('PendingFinance')).toBe('Finans Kontrolünde')
       expect(getStatusLabel('PendingCfo')).toBe('CFO Onayında')
       expect(getStatusLabel('Active')).toBe('Yürürlükte')
       expect(getStatusLabel('Rejected')).toBe('Reddedildi')
       expect(getStatusLabel('Archived')).toBe('Arşiv')
     })

     it('returns dash for null/undefined/empty', () => {
       expect(getStatusLabel(null)).toBe('—')
       expect(getStatusLabel(undefined)).toBe('—')
       expect(getStatusLabel('')).toBe('—')
     })

     it('falls back to raw status for unknown', () => {
       expect(getStatusLabel('Mystery')).toBe('Mystery')
     })
   })

   describe('getStatusNextAction', () => {
     it('returns eylem-odaklı sıradaki adım', () => {
       expect(getStatusNextAction('Draft')).toBe('Bütçeyi tamamla')
       expect(getStatusNextAction('PendingFinance')).toBe('Finans onayı bekleniyor')
       expect(getStatusNextAction('PendingCfo')).toBe('CFO onayı bekleniyor')
       expect(getStatusNextAction('Active')).toBe('Revizyon aç')
       expect(getStatusNextAction('Rejected')).toBe('Düzeltmeye Devam Et')
       expect(getStatusNextAction('Archived')).toBe('—')
     })

     it('returns dash for null/unknown', () => {
       expect(getStatusNextAction(null)).toBe('—')
       expect(getStatusNextAction('Mystery')).toBe('—')
     })
   })
   ```

2. Çalıştır:
   ```bash
   cd /Users/timurselcukturan/Uygulamalar/Budget/client
   pnpm test --run types.test
   ```

**Expected:** Build hatası — `getStatusNextAction` yok. RED.

**Do not commit.**

---

## Task 1.2 — GREEN: types.ts'e STATUS_NEXT_ACTIONS + getStatusNextAction ekle

**Files:**
- Modify: `client/src/components/budget-planning/types.ts`

**Steps:**

1. `STATUS_LABELS` map'inde `PendingFinance` etiketini değiştir:
   ```typescript
   PendingFinance: 'Finans Kontrolünde',  // 'Finans Onayında' yerine
   ```

2. `STATUS_CHIP_CLASS` ve `EDITABLE_STATUSES` aynı kalır.

3. `IN_PROGRESS_STATUSES`'tan SONRA ekle:
   ```typescript
   /** Sıradaki adım — eylem-odaklı, kullanıcıya "şimdi ne yap?" cevabı verir. */
   export const STATUS_NEXT_ACTIONS: Record<BudgetVersionStatus, string> = {
     Draft: 'Bütçeyi tamamla',
     PendingFinance: 'Finans onayı bekleniyor',
     PendingCfo: 'CFO onayı bekleniyor',
     Active: 'Revizyon aç',
     Rejected: 'Düzeltmeye Devam Et',
     Archived: '—',
   }

   export function getStatusNextAction(status: string | null | undefined): string {
     if (!status) return '—'
     return STATUS_NEXT_ACTIONS[status as BudgetVersionStatus] ?? '—'
   }
   ```

4. Çalıştır:
   ```bash
   pnpm test --run types.test
   ```

**Expected:** 9 test geçer.

5. Build kontrol:
   ```bash
   pnpm build 2>&1 | tail -3
   ```

**Expected:** ✓ built.

6. Commit:
   ```bash
   git add client/src/components/budget-planning/types.ts \
           client/src/components/budget-planning/types.test.ts
   git commit -m "feat(client): STATUS_NEXT_ACTIONS sözlük + Finans Kontrolünde label

   Tüm sayfalarda kullanılacak tek kaynak. PendingFinance label
   'Finans Onayında' → 'Finans Kontrolünde' (eylem-odaklı). Yeni
   STATUS_NEXT_ACTIONS map: Draft → 'Bütçeyi tamamla', Rejected
   → 'Düzeltmeye Devam Et' vb."
   ```

---

## Task 1.3 — RED: api-error testi yaz

**Files:**
- Create: `client/src/lib/api-error.test.ts`

**Steps:**

1. Test dosyası:
   ```typescript
   import { describe, expect, it } from 'vitest'
   import { translateApiError } from './api-error'

   describe('translateApiError', () => {
     it('translates 409 expense entry to revision guidance', () => {
       const err = { response: { status: 409, data: { detail: 'cannot be edited' } } }
       const msg = translateApiError(err, { resource: 'expense', statusLabel: 'Yürürlükte' })
       expect(msg).toContain('Yürürlükte')
       expect(msg).toContain('Düzenlenebilir')
     })

     it('translates 403 with required role', () => {
       const err = { response: { status: 403 } }
       const msg = translateApiError(err, { requiredRole: 'CFO' })
       expect(msg).toContain('CFO')
       expect(msg).toContain('rolü')
     })

     it('translates 400 InvalidOperationException to user message', () => {
       const err = {
         response: {
           status: 400,
           data: { error: 'Submit requires status Draft or Rejected, current is Active' },
         },
       }
       const msg = translateApiError(err)
       expect(msg).toContain('Active')
     })

     it('falls back to generic message for unknown error', () => {
       const err = new Error('Network error')
       const msg = translateApiError(err)
       expect(msg).toContain('İşlem başarısız')
     })

     it('handles null/undefined input', () => {
       expect(translateApiError(null)).toBe('İşlem başarısız.')
       expect(translateApiError(undefined)).toBe('İşlem başarısız.')
     })
   })
   ```

2. `pnpm test --run api-error.test` — RED (dosya yok).

**Do not commit.**

---

## Task 1.4 — GREEN: api-error.ts helper yaz

**Files:**
- Create: `client/src/lib/api-error.ts`

**Steps:**

```typescript
/**
 * API hata mesajlarını kullanıcı diline çevirir. GlobalExceptionHandler
 * (.NET) 409 Conflict, 403 Forbidden, 400 BadRequest döner; bu helper
 * kullanıcıya "ne yapmalıyım?" cevabı veren mesaja dönüştürür.
 */

interface ErrorContext {
  resource?: 'expense' | 'budget' | 'special-item' | 'actual' | 'scenario'
  statusLabel?: string  // örn: 'Yürürlükte', 'Arşiv'
  requiredRole?: string // örn: 'CFO', 'FinanceManager'
}

interface AxiosLikeError {
  response?: {
    status?: number
    data?: { error?: string; detail?: string; title?: string }
  }
  message?: string
}

const FALLBACK = 'İşlem başarısız.'

export function translateApiError(
  error: unknown,
  context: ErrorContext = {},
): string {
  if (!error) return FALLBACK
  const e = error as AxiosLikeError
  const status = e.response?.status
  const detail = e.response?.data?.detail ?? e.response?.data?.error ?? ''

  // 409 Conflict — versiyon düzenlenemez
  if (status === 409) {
    const label = context.statusLabel ?? 'salt-okunur'
    return (
      `Bu versiyon **${label}** olduğu için değişiklik yapılamaz. ` +
      `Düzenlenebilir bir versiyon (Taslak veya Reddedildi) seçin ya da revizyon açın.`
    )
  }

  // 403 Forbidden — yetki
  if (status === 403) {
    const role = context.requiredRole
    if (role) {
      return `Bu işlem için **${role}** rolü gerekiyor. Yöneticinizle iletişime geçin.`
    }
    return 'Bu işlem için yetkiniz yok.'
  }

  // 401 Unauthorized
  if (status === 401) {
    return 'Oturum süresi dolmuş olabilir. Lütfen yeniden giriş yapın.'
  }

  // 400 Bad Request — InvalidOperationException
  if (status === 400 && detail) {
    // Backend mesajını sade Türkçeleştir
    const userMessage = detail
      .replace(/InvalidOperationException:?\s*/i, '')
      .replace(/^[A-Z][a-zA-Z]+ requires status (\w+) or (\w+), current is (\w+)$/, (
        _,
        s1: string,
        s2: string,
        current: string,
      ) => `Bu versiyon **${current}** durumunda. Aksiyon sadece **${s1}** veya **${s2}** durumlarında uygulanabilir.`)
      .replace(/^[A-Z][a-zA-Z]+ requires status (\w+), current is (\w+)$/, (
        _,
        s1: string,
        current: string,
      ) => `Bu versiyon **${current}** durumunda. Aksiyon sadece **${s1}** durumunda uygulanabilir.`)
    return userMessage || FALLBACK
  }

  // 500 + ağ hataları
  if (status && status >= 500) {
    return 'Sunucu hatası. Birkaç dakika sonra tekrar deneyin.'
  }

  if (e.message) {
    return e.message
  }

  return FALLBACK
}
```

2. Test:
   ```bash
   pnpm test --run api-error.test
   ```

**Expected:** 5 test geçer.

3. Commit:
   ```bash
   git add client/src/lib/api-error.ts client/src/lib/api-error.test.ts
   git commit -m "feat(client): translateApiError helper — 409/403/400 yönlendirici dilde

   Tüm mutation onError'larında çağırılır. 409 'cannot be edited' →
   'Bu versiyon X olduğu için... revizyon açın'. 403 → role gereksinimi.
   400 InvalidOperationException → state machine durum açıklaması."
   ```

---

## Task 1.5 — Boş durum ve mikro-yardım copy değişiklikleri

**Files (Modify):**
- `client/src/pages/DashboardPage.tsx` (mikro-yardım)
- `client/src/pages/BudgetEntryPage.tsx` (mikro-yardım)
- `client/src/pages/ExpenseEntriesPage.tsx` (mikro-yardım + boş durum)
- `client/src/pages/ApprovalsPage.tsx` (mikro-yardım + boş durum)
- `client/src/pages/BudgetPeriodsPage.tsx` (mikro-yardım + boş durum)
- `client/src/pages/VariancePage.tsx` (mikro-yardım)
- `client/src/pages/ForecastPage.tsx` (mikro-yardım)

**Steps:**

1. `client/src/styles/finopstur.css` veya `client/src/index.css` içine ekle:
   ```css
   .page-context-hint {
     font-size: 0.8125rem;
     color: var(--color-on-surface-variant);
     font-style: italic;
     margin-top: 0.25rem;
   }
   ```

2. Her sayfanın H2 başlık komşuluğuna ekle. Örnek `BudgetEntryPage.tsx`:
   ```tsx
   <h2 className="text-3xl font-extrabold tracking-display text-on-surface">
     Bütçe Planlama
   </h2>
   <p className="page-context-hint">
     Aktif veya taslak bütçeyi müşteri × ay × ürün matrisinde girin.
     Sadece <strong>Taslak</strong> ve <strong>Reddedildi</strong> sürümler düzenlenebilir.
   </p>
   ```

3. Mikro-yardım metinleri (design doc'tan kopyala):

   | Ekran | Cümle |
   |---|---|
   | Dashboard | (Görev Merkezi M2'de gelecek — şimdilik atla) |
   | Bütçe Planlama | "Aktif veya taslak bütçeyi müşteri × ay × ürün matrisinde girin. Sadece **Taslak** ve **Reddedildi** sürümler düzenlenebilir." |
   | Gider Girişi | "OPEX kategorileri için aylık bütçe gider planı. Tutarlar yıllık toplam KPI'lara dahil olur." |
   | Onay Akışı | "Bekleyen onayları yönetin. CFO onayı versiyonu yayına alır ve eski aktifi otomatik arşivler." |
   | Versiyonlar (BudgetPeriodsPage.tsx) | "Yıl ve sürümleri yönetin. Aynı yıl içinde max 1 yürürlükte + 1 çalışılan taslak olabilir." |
   | Sapma Analizi | "Bütçe planı vs gerçekleşenler. Yeşil = pozitif sapma, kırmızı = aşım." |
   | Forecast | "Yıl sonuna projeksiyon — gerçekleşen + plan kalanı." |

4. Boş durum metinleri — design doc M7 tablosundan al, ilgili sayfaya yansıt.

   Örnek `ExpenseEntriesPage.tsx`:
   ```tsx
   {entries.length === 0 ? (
     <div className="p-8 text-center">
       <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 48 }}>
         payments
       </span>
       <p className="text-base font-semibold text-on-surface mt-3">
         OPEX kategorileri için henüz gider girilmedi
       </p>
       <p className="text-sm text-on-surface-variant mt-1">
         İlk girişi "Yeni Gider" ile başlatın.
       </p>
     </div>
   ) : ( /* mevcut tablo */ )}
   ```

   Örnek `BudgetPeriodsPage.tsx` boş durum:
   ```tsx
   <div className="p-8 text-center">
     <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 48 }}>
       calendar_month
     </span>
     <p className="text-base font-semibold text-on-surface mt-3">
       {selectedYear?.year ?? 'Bu yıl'} için ilk taslağı oluşturun
     </p>
     <p className="text-sm text-on-surface-variant mt-1 max-w-md mx-auto">
       Tutarlar bu taslak üzerinde girilir; tamamlanınca onaya gönderilir.
       CFO onayıyla yürürlüğe girer.
     </p>
     {!hasInProgressDraft && (
       <button
         type="button"
         className="btn-primary mt-4"
         onClick={() => selectedYearId && setModal({ kind: 'version', yearId: selectedYearId })}
       >
         <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
         Yeni Taslak
       </button>
     )}
   </div>
   ```

5. Build:
   ```bash
   pnpm build 2>&1 | tail -3
   ```

6. Browser smoke (manuel — Playwright MCP ile):
   - `/` → mikro-yardım yok (Görev Merkezi M2'de gelecek)
   - `/budget/planning` → "Aktif veya taslak..." görünür
   - `/expenses` → "OPEX kategorileri için..." görünür
   - `/approvals` → "Bekleyen onayları yönetin..." görünür
   - 5 dakikalık göz gezdirme yeterli

7. Commit:
   ```bash
   git add client/src/styles/finopstur.css client/src/pages/*.tsx
   git commit -m "feat(client): mikro-yardım cümleleri + öğretici boş durumlar

   Her ana sayfada H2 altına 1 cümlelik bağlam (.page-context-hint).
   Boş durumlar yönlendirici: 'X için henüz Y yok. [Z ile başlayın]' +
   CTA buton.

   M7 + ekran-başı mikro-yardım Section."
   ```

---

## Task 1.6 — Mevcut hata mesajlarını translateApiError'a bağla

**Files (Modify):** Mutation `onError` olan tüm sayfalar.

**Steps:**

1. Tüm `mutationFn` + `onError` olan yerlerde güncelle. Örnek `ExpenseEntriesPage.tsx` saveMutation:
   ```typescript
   import { translateApiError } from '../lib/api-error'
   import { getStatusLabel } from '../components/budget-planning/types'

   const saveMutation = useMutation({
     mutationFn: async () => { /* ... */ },
     onSuccess: () => { /* ... */ },
     onError: (e: unknown) => {
       setSaveError(
         translateApiError(e, { resource: 'expense', statusLabel: getStatusLabel(currentVersion?.status) }),
       )
     },
   })
   ```

2. Aynı pattern: `BudgetEntryPage` (saveMutation, submitMutation, createDraftMutation), `ApprovalsPage` (actionMutation), `BudgetPeriodsPage` (transitionMutation, archiveMutation).

3. Build + smoke test (Active versiyon seç → tutar girmeye çalış → yeni mesaj görmeli).

4. Commit:
   ```bash
   git add client/src/pages/*.tsx
   git commit -m "feat(client): mutation hata mesajları translateApiError'a bağlandı

   Tüm sayfalarda 409/403/400 hataları kullanıcı diline çevrilir.
   ExpenseEntriesPage, BudgetEntryPage, ApprovalsPage, BudgetPeriodsPage
   mutation onError'ları güncellendi."
   ```

---

# GÜN 2 — Görev Merkezi (M2)

## Task 2.1 — RED: useTaskCenter testi

**Files:**
- Create: `client/src/components/dashboard/useTaskCenter.test.ts`

**Steps:**

1. Test dosyası — pure function olarak `deriveTasks` extract edilecek (hook içinde useMemo çağıracak):
   ```typescript
   import { describe, expect, it } from 'vitest'
   import { deriveTasks } from './useTaskCenter'

   const baseVersion = {
     id: 1, budgetYearId: 1, name: '2026 V1', status: 'Draft',
     isActive: false, rejectionReason: null, createdAt: '2026-01-01',
   }
   const baseEntries = [
     { customerId: 1, versionId: 1 },
     { customerId: 2, versionId: 1 },
   ] as const

   describe('deriveTasks', () => {
     it('Draft eksik müşteri → "Devam Et" task medium priority', () => {
       const tasks = deriveTasks({
         versions: [{ ...baseVersion, status: 'Draft' }],
         entriesPerVersion: { 1: [...baseEntries] },
         customerIds: [1, 2, 3, 4],   // 4 müşteri
         roles: ['Admin'],
         year: 2026,
       })
       expect(tasks).toHaveLength(1)
       expect(tasks[0].priority).toBe('medium')
       expect(tasks[0].title).toContain('2 eksik')
       expect(tasks[0].ctaLabel).toBe('Devam Et')
     })

     it('Draft tüm müşteri tamam → "Onaya Gönder" high priority', () => {
       const tasks = deriveTasks({
         versions: [{ ...baseVersion, status: 'Draft' }],
         entriesPerVersion: { 1: [{ customerId: 1, versionId: 1 }, { customerId: 2, versionId: 1 }] },
         customerIds: [1, 2],
         roles: ['Admin'],
         year: 2026,
       })
       expect(tasks[0].priority).toBe('high')
       expect(tasks[0].ctaLabel).toBe('Onaya Gönder')
     })

     it('Rejected → "Düzeltmeye Devam Et" high', () => {
       const tasks = deriveTasks({
         versions: [{ ...baseVersion, status: 'Rejected' }],
         entriesPerVersion: { 1: [] },
         customerIds: [1],
         roles: ['FinanceManager'],
         year: 2026,
       })
       expect(tasks[0].ctaLabel).toBe('Düzeltmeye Devam Et')
       expect(tasks[0].priority).toBe('high')
     })

     it('PendingFinance gösterir sadece Finance/Admin için', () => {
       const versions = [{ ...baseVersion, status: 'PendingFinance' }]
       const ctxFinance = {
         versions, entriesPerVersion: {}, customerIds: [], roles: ['FinanceManager'], year: 2026,
       }
       const ctxViewer = { ...ctxFinance, roles: ['Viewer'] }

       expect(deriveTasks(ctxFinance)).toHaveLength(1)
       expect(deriveTasks(ctxFinance)[0].ctaLabel).toBe('Finans Onayla')
       expect(deriveTasks(ctxViewer)).toHaveLength(0)
     })

     it('PendingCfo sadece CFO için + high priority', () => {
       const versions = [{ ...baseVersion, status: 'PendingCfo' }]
       expect(deriveTasks({
         versions, entriesPerVersion: {}, customerIds: [], roles: ['CFO'], year: 2026,
       })[0].priority).toBe('high')
     })

     it('Active + yıl içinde Draft yok → Revizyon Aç low priority', () => {
       const tasks = deriveTasks({
         versions: [{ ...baseVersion, status: 'Active', isActive: true }],
         entriesPerVersion: {},
         customerIds: [],
         roles: ['Admin'],
         year: 2026,
       })
       expect(tasks[0].ctaLabel).toBe('Revizyon Aç')
       expect(tasks[0].priority).toBe('low')
     })

     it('Active + yıl içinde Draft VAR → Revizyon Aç gösterilmez', () => {
       const tasks = deriveTasks({
         versions: [
           { ...baseVersion, id: 1, status: 'Active', isActive: true },
           { ...baseVersion, id: 2, status: 'Draft' },
         ],
         entriesPerVersion: { 2: [] },
         customerIds: [1],
         roles: ['Admin'],
         year: 2026,
       })
       // Sadece Draft task'ı, Active için Revizyon Aç görünmez
       expect(tasks.find(t => t.ctaLabel === 'Revizyon Aç')).toBeUndefined()
     })

     it('boş — hiç actionable yok ise tasks=[]', () => {
       const tasks = deriveTasks({
         versions: [{ ...baseVersion, status: 'Archived' }],
         entriesPerVersion: {},
         customerIds: [],
         roles: ['Viewer'],
         year: 2026,
       })
       expect(tasks).toHaveLength(0)
     })

     it('priority sıralama: high > medium > low', () => {
       const tasks = deriveTasks({
         versions: [
           { ...baseVersion, id: 1, status: 'Active', isActive: true },  // low
           { ...baseVersion, id: 2, status: 'Rejected' },                  // high
         ],
         entriesPerVersion: { 2: [] },
         customerIds: [],
         roles: ['Admin'],
         year: 2026,
       })
       expect(tasks[0].priority).toBe('high')
     })
   })
   ```

2. `pnpm test --run useTaskCenter.test` — RED.

**Do not commit.**

---

## Task 2.2 — GREEN: useTaskCenter hook + deriveTasks

**Files:**
- Create: `client/src/components/dashboard/useTaskCenter.ts`

**Steps:**

```typescript
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { useAuthStore } from '../../stores/auth'
import type { BudgetVersionStatus } from '../budget-planning/types'

export interface Task {
  id: string
  title: string
  subtitle: string
  ctaLabel: string
  ctaHref: string
  priority: 'high' | 'medium' | 'low'
  icon: string
}

interface VersionRow {
  id: number
  budgetYearId: number
  name: string
  status: string
  isActive: boolean
  rejectionReason: string | null
  createdAt: string
}

interface DeriveContext {
  versions: VersionRow[]
  entriesPerVersion: Record<number, { customerId: number }[]>
  customerIds: number[]
  roles: string[]
  year: number
}

const PRIORITY_ORDER: Record<Task['priority'], number> = { high: 0, medium: 1, low: 2 }

export function deriveTasks(ctx: DeriveContext): Task[] {
  const { versions, entriesPerVersion, customerIds, roles } = ctx
  const isAdmin = roles.includes('Admin')
  const isFinance = isAdmin || roles.includes('FinanceManager')
  const isCfo = isAdmin || roles.includes('CFO')

  const tasks: Task[] = []
  const hasInProgressInYear = versions.some((v) =>
    ['Draft', 'PendingFinance', 'PendingCfo', 'Rejected'].includes(v.status),
  )

  for (const v of versions) {
    const status = v.status as BudgetVersionStatus
    const href = `/budget/planning?versionId=${v.id}`
    const totalCustomers = customerIds.length
    const completedCount = new Set(
      (entriesPerVersion[v.id] ?? []).map((e) => e.customerId),
    ).size
    const missing = Math.max(0, totalCustomers - completedCount)

    if (status === 'Draft' && (isFinance || isAdmin)) {
      if (missing > 0) {
        tasks.push({
          id: `continue-${v.id}`, title: `${v.name} — ${missing} eksik müşteri`,
          subtitle: `Tamamlanma: ${completedCount}/${totalCustomers}`,
          ctaLabel: 'Devam Et', ctaHref: href, priority: 'medium', icon: 'edit_note',
        })
      } else {
        tasks.push({
          id: `submit-${v.id}`, title: `${v.name} — Onaya gönderilebilir`,
          subtitle: `${totalCustomers}/${totalCustomers} müşteri tamamlandı`,
          ctaLabel: 'Onaya Gönder', ctaHref: href, priority: 'high', icon: 'verified',
        })
      }
    }

    if (status === 'Rejected' && (isFinance || isAdmin)) {
      tasks.push({
        id: `fix-${v.id}`, title: `${v.name} — Düzeltmeye Devam Et`,
        subtitle: v.rejectionReason ?? 'Reddedildi',
        ctaLabel: 'Düzeltmeye Devam Et', ctaHref: href, priority: 'high', icon: 'build_circle',
      })
    }

    if (status === 'PendingFinance' && isFinance) {
      tasks.push({
        id: `approve-finance-${v.id}`, title: `${v.name} — Finans onayınızı bekliyor`,
        subtitle: 'Finans Kontrolünde',
        ctaLabel: 'Finans Onayla', ctaHref: '/approvals', priority: 'medium', icon: 'verified',
      })
    }

    if (status === 'PendingCfo' && isCfo) {
      tasks.push({
        id: `approve-cfo-${v.id}`, title: `${v.name} — CFO onayınızı bekliyor`,
        subtitle: 'Yayına alma adımı',
        ctaLabel: 'Onayla ve Yayına Al', ctaHref: '/approvals', priority: 'high', icon: 'rocket_launch',
      })
    }

    if (status === 'Active' && (isFinance || isAdmin) && !hasInProgressInYear) {
      tasks.push({
        id: `revise-${v.id}`, title: `${v.name} — Yürürlükte`,
        subtitle: 'Revize etmek için yeni taslak açın',
        ctaLabel: 'Revizyon Aç', ctaHref: href, priority: 'low', icon: 'restart_alt',
      })
    }
  }

  tasks.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
  return tasks
}

interface YearRow { id: number; year: number; isLocked: boolean }
interface CustomerRow { id: number; isActive: boolean }

export function useTaskCenter(): { tasks: Task[]; isLoading: boolean } {
  const { user } = useAuthStore()
  const roles = user?.roles ?? []

  const yearsQuery = useQuery({
    queryKey: ['budget-years'],
    queryFn: async () => (await api.get<YearRow[]>('/budget/years')).data,
  })
  const years = yearsQuery.data ?? []
  const currentYear = years.find((y) => y.year === new Date().getFullYear()) ?? years[0]

  const versionsQuery = useQuery({
    queryKey: ['budget-versions', currentYear?.id],
    queryFn: async () =>
      currentYear
        ? (await api.get<VersionRow[]>(`/budget/years/${currentYear.id}/versions`)).data
        : [],
    enabled: !!currentYear,
  })

  const customersQuery = useQuery({
    queryKey: ['customers'],
    queryFn: async () => (await api.get<CustomerRow[]>('/customers')).data,
  })

  const versions = versionsQuery.data ?? []
  const draftLikeIds = versions
    .filter((v) => ['Draft', 'PendingFinance', 'PendingCfo', 'Rejected'].includes(v.status))
    .map((v) => v.id)

  const entriesQueries = useQuery({
    queryKey: ['budget-entries-multi', draftLikeIds.join(',')],
    queryFn: async () => {
      const out: Record<number, { customerId: number }[]> = {}
      for (const id of draftLikeIds) {
        try {
          const { data } = await api.get<{ customerId: number }[]>(
            `/budget/versions/${id}/entries`,
          )
          out[id] = data
        } catch {
          out[id] = []
        }
      }
      return out
    },
    enabled: draftLikeIds.length > 0,
  })

  const customerIds = (customersQuery.data ?? []).filter((c) => c.isActive).map((c) => c.id)

  const tasks = useMemo(
    () =>
      deriveTasks({
        versions,
        entriesPerVersion: entriesQueries.data ?? {},
        customerIds,
        roles,
        year: currentYear?.year ?? 0,
      }),
    [versions, entriesQueries.data, customerIds, roles, currentYear?.year],
  )

  return {
    tasks,
    isLoading: yearsQuery.isLoading || versionsQuery.isLoading || customersQuery.isLoading,
  }
}
```

2. Test çalıştır:
   ```bash
   pnpm test --run useTaskCenter.test
   ```

**Expected:** 9 test geçer.

3. Commit:
   ```bash
   git add client/src/components/dashboard/useTaskCenter.ts \
           client/src/components/dashboard/useTaskCenter.test.ts
   git commit -m "feat(dashboard): useTaskCenter hook + deriveTasks (frontend derivation)

   Mevcut years + versions + customers + entries query'lerinden rol-aware
   Task[] üretir. PRIORITY_ORDER: high > medium > low. Yeni network call yok."
   ```

---

## Task 2.3 — TaskCenter UI bileşeni

**Files:**
- Create: `client/src/components/dashboard/TaskCenter.tsx`

**Steps:**

```tsx
import { Link } from 'react-router-dom'
import { useTaskCenter } from './useTaskCenter'

const PRIORITY_BORDER: Record<string, string> = {
  high: 'border-l-error',
  medium: 'border-l-warning',
  low: 'border-l-on-surface-variant',
}

export function TaskCenter() {
  const { tasks, isLoading } = useTaskCenter()

  if (isLoading) {
    return (
      <div className="card mb-4">
        <p className="label-sm">Görev Merkezi</p>
        <p className="text-sm text-on-surface-variant mt-2">Yükleniyor…</p>
      </div>
    )
  }

  return (
    <div className="card mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>
          task_alt
        </span>
        <h3 className="text-base font-bold text-on-surface">Görev Merkezi</h3>
        <span className="text-xs text-on-surface-variant ml-1">
          Bugün yapmanız gerekenler
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm font-semibold text-on-surface">
            ✓ Bugün için bekleyen aksiyonunuz yok.
          </p>
          <p className="text-xs text-on-surface-variant mt-1">
            Yürürlükteki bütçeyi inceleyebilir veya yeni bir revizyon başlatabilirsiniz.
          </p>
          <Link to="/budget/planning" className="btn-secondary inline-flex mt-3">
            Bütçe Planlama →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tasks.slice(0, 4).map((t) => (
            <div
              key={t.id}
              className={`flex items-start gap-3 p-3 rounded-md border-l-4 bg-surface-container-low ${PRIORITY_BORDER[t.priority]}`}
            >
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 24 }}>
                {t.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-on-surface truncate">{t.title}</p>
                <p className="text-xs text-on-surface-variant mt-0.5 truncate">{t.subtitle}</p>
                <Link to={t.ctaHref} className="btn-primary mt-2 inline-flex" style={{ padding: '.4rem .75rem', fontSize: '.75rem' }}>
                  {t.ctaLabel}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {tasks.length > 4 && (
        <Link to="/approvals" className="text-xs text-primary mt-3 inline-block">
          Tümünü gör ({tasks.length}) →
        </Link>
      )}
    </div>
  )
}
```

2. `DashboardPage.tsx`'in en üstüne (H2 başlığın hemen altına) ekle:
   ```tsx
   import { TaskCenter } from '../components/dashboard/TaskCenter'

   // ... return içinde
   <h2 className="text-3xl font-extrabold tracking-display text-on-surface">
     Executive Dashboard
   </h2>
   <p className="text-sm text-on-surface-variant">FY{year} · {versionName}</p>
   <TaskCenter />        {/* ← yeni */}
   {/* mevcut KPI grid */}
   ```

3. Build + browser smoke:
   ```bash
   pnpm build 2>&1 | tail -3
   ```
   Browser: `/` → "Görev Merkezi" görünür, kartlar veya boş durum gösterir.

4. Commit:
   ```bash
   git add client/src/components/dashboard/TaskCenter.tsx \
           client/src/pages/DashboardPage.tsx
   git commit -m "feat(dashboard): TaskCenter component — Görev Merkezi kart bandı

   Dashboard üstüne sticky-olmayan rol-bazlı görev kartı bandı:
   high (kırmızı şerit) / medium (warning) / low (gri).
   Max 4 task, daha fazlası 'Tümünü gör' link.
   Boş task → 'Bugün için bekleyen yok' + Bütçe Planlama CTA."
   ```

---

# GÜN 3 — Versiyonlar Refactor + Revizyon Zinciri (M3 + M4)

## Task 3.1 — RevisionTimeline component

**Files:**
- Create: `client/src/components/budget-planning/RevisionTimeline.tsx`

**Steps:**

```tsx
import type { BudgetVersionStatus } from './types'
import { getStatusLabel, getStatusChipClass } from './types'

interface VersionRow {
  id: number
  name: string
  status: string
  isActive: boolean
  createdAt: string
}

interface Props {
  versions: VersionRow[]
  yearLabel: number
  onSelect?: (versionId: number) => void
}

const DOT_COLOR: Record<string, string> = {
  Draft: 'bg-warning',
  PendingFinance: 'bg-warning',
  PendingCfo: 'bg-warning',
  Active: 'bg-success',
  Rejected: 'bg-error',
  Archived: 'bg-on-surface-variant',
}

export function RevisionTimeline({ versions, yearLabel, onSelect }: Props) {
  if (versions.length === 0) return null

  // Kronolojik sıraya göre soldan sağa
  const sorted = [...versions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )

  return (
    <div className="card mb-4">
      <p className="label-sm mb-2">Revizyon Zinciri (FY {yearLabel})</p>
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {sorted.map((v, i) => {
          const status = v.status as BudgetVersionStatus
          const dotClass = DOT_COLOR[status] ?? 'bg-on-surface-variant'
          return (
            <div key={v.id} className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
                onClick={() => onSelect?.(v.id)}
                title={`${v.name} — ${getStatusLabel(v.status)}`}
              >
                <span className={`w-3 h-3 rounded-full ${dotClass}`} />
                <span className="text-xs font-semibold text-on-surface whitespace-nowrap">
                  {v.name}
                </span>
                <span className={`chip ${getStatusChipClass(v.status)} text-xs`}>
                  {getStatusLabel(v.status)}
                </span>
              </button>
              {i < sorted.length - 1 && (
                <span className="text-on-surface-variant text-lg shrink-0">→</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

2. `BudgetPeriodsPage.tsx`'te tablodan ÖNCE ekle (yıl seçili ise):
   ```tsx
   import { RevisionTimeline } from '../components/budget-planning/RevisionTimeline'

   // selectedYear varsa, versions render'ından önce
   {selectedYear && versions.length > 0 && (
     <RevisionTimeline
       versions={versions}
       yearLabel={selectedYear.year}
       onSelect={(id) => {
         const row = document.getElementById(`version-row-${id}`)
         row?.scrollIntoView({ behavior: 'smooth', block: 'center' })
         row?.classList.add('bg-primary-fixed')
         setTimeout(() => row?.classList.remove('bg-primary-fixed'), 1000)
       }}
     />
   )}
   ```

3. Versiyonlar tablosundaki `<tr>`'a `id={`version-row-${v.id}`}` ekle.

4. Build + browser smoke (FY 2026 versiyonları zincir görünmeli).

5. Commit:
   ```bash
   git add client/src/components/budget-planning/RevisionTimeline.tsx \
           client/src/pages/BudgetPeriodsPage.tsx
   git commit -m "feat(budget-periods): RevisionTimeline component (yatay versiyon zinciri)

   Yıl içindeki tüm versiyonlar createdAt artan sıralı.
   Dot color: Active=success, Pending*=warning, Rejected=error, Archived=neutral.
   Tıklanırsa altta tablo satırına scroll + 1sn highlight."
   ```

---

## Task 3.2 — Versiyonlar tablosu: tek primary aksiyon + ⋯ menü

**Files:**
- Modify: `client/src/pages/BudgetPeriodsPage.tsx`

**Steps:**

1. Yeni helper inline veya ayrı dosya:
   ```typescript
   import { getStatusNextAction } from '../components/budget-planning/types'

   function primaryAction(version: BudgetVersionRow, roles: string[], handlers: {
     goToPlanning: (vid: number) => void
     transition: (vid: number, endpoint: string) => void
     createRevision: (vid: number) => void
   }): { label: string; onClick: () => void } | null {
     const isAdmin = roles.includes('Admin')
     const isFinance = isAdmin || roles.includes('FinanceManager')
     const isCfo = isAdmin || roles.includes('CFO')

     switch (version.status) {
       case 'Draft':
         return isFinance ? { label: 'Devam Et', onClick: () => handlers.goToPlanning(version.id) } : null
       case 'Rejected':
         return isFinance ? { label: 'Düzeltmeye Devam Et', onClick: () => handlers.goToPlanning(version.id) } : null
       case 'PendingFinance':
         return isFinance ? { label: 'Finans Onayla', onClick: () => handlers.transition(version.id, 'approve-finance') } : null
       case 'PendingCfo':
         return isCfo ? { label: 'Onayla ve Yayına Al', onClick: () => handlers.transition(version.id, 'approve-cfo-activate') } : null
       case 'Active':
         return isFinance ? { label: 'Revizyon Aç', onClick: () => handlers.createRevision(version.id) } : null
       default:
         return null
     }
   }
   ```

2. `useNavigate` ile `goToPlanning` ekle:
   ```typescript
   import { useNavigate } from 'react-router-dom'
   const navigate = useNavigate()
   const goToPlanning = (vid: number) => navigate(`/budget/planning?versionId=${vid}`)
   ```

3. `createRevision` mutation ekle (api.ts'ten import):
   ```typescript
   import { createRevision } from '../components/budget-planning/api'
   const createRevisionMutation = useMutation({
     mutationFn: createRevision,
     onSuccess: (created) => {
       invalidateVersions()
       navigate(`/budget/planning?versionId=${created.id}`)
     },
   })
   ```

4. Tablo `<tbody>` içeriğini sadeleştir — yeni kolonlar:
   ```tsx
   <thead>
     <tr>
       <th>Sürüm</th>
       <th>Durum</th>
       <th>Sıradaki Adım</th>
       <th>Ana Aksiyon</th>
       <th></th>
     </tr>
   </thead>
   <tbody>
     {versions.map((version) => {
       const action = primaryAction(version, roles, {
         goToPlanning,
         transition: (vid, endpoint) => transitionMutation.mutate({ versionId: vid, endpoint }),
         createRevision: (vid) => createRevisionMutation.mutate(vid),
       })
       return (
         <tr key={version.id} id={`version-row-${version.id}`}>
           <td>
             <strong>{version.name}</strong>
             {version.isActive && <span className="chip chip-success ml-2 text-xs">Aktif</span>}
             <p className="text-[0.65rem] font-mono text-on-surface-variant">#{version.id}</p>
           </td>
           <td>
             <span className={`chip ${getStatusChipClass(version.status)}`}>
               {getStatusLabel(version.status)}
             </span>
           </td>
           <td className="text-sm text-on-surface-variant">
             {getStatusNextAction(version.status)}
           </td>
           <td>
             {action ? (
               <button
                 type="button"
                 className="btn-primary"
                 style={{ padding: '.4rem .75rem', fontSize: '.75rem' }}
                 onClick={action.onClick}
                 disabled={transitionMutation.isPending || createRevisionMutation.isPending}
               >
                 {action.label}
               </button>
             ) : (
               <span className="text-xs text-on-surface-variant">—</span>
             )}
           </td>
           <td>
             <ActionMenu version={version} onReject={() => setModal({ kind: 'reject', versionId: version.id })} onArchive={() => archiveMutation.mutate(version.id)} />
           </td>
         </tr>
       )
     })}
   </tbody>
   ```

5. `<ActionMenu />` basit popover bileşeni — aynı dosya altına:
   ```tsx
   function ActionMenu({ version, onReject, onArchive }: {
     version: BudgetVersionRow
     onReject: () => void
     onArchive: () => void
   }) {
     const [open, setOpen] = useState(false)
     const canReject = ['PendingFinance', 'PendingCfo'].includes(version.status)
     const canArchive = version.status === 'Active'
     if (!canReject && !canArchive) return <span className="text-on-surface-variant">⋯</span>

     return (
       <details className="relative">
         <summary className="cursor-pointer text-on-surface-variant hover:text-on-surface text-lg list-none">⋯</summary>
         <div className="absolute right-0 top-6 bg-surface-container-lowest border border-outline-variant rounded-md shadow-lg p-1 z-10 min-w-[140px]">
           {canReject && (
             <button onClick={onReject} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-surface-container-low rounded">
               Reddet
             </button>
           )}
           {canArchive && (
             <button onClick={onArchive} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-surface-container-low rounded">
               Arşivle
             </button>
           )}
         </div>
       </details>
     )
   }
   ```

6. `useAuthStore` import et + `roles` al.

7. Build + smoke:
   - Versiyonlar tab'ında her satır tek primary buton (Draft → Devam Et, Active → Revizyon Aç vs.)
   - ⋯ menüsü Reddet/Arşivle aksiyonlarını içerir

8. Commit:
   ```bash
   git add client/src/pages/BudgetPeriodsPage.tsx
   git commit -m "feat(budget-periods): tek primary aksiyon + ⋯ menü + Sıradaki Adım kolonu

   Tablo kolon yapısı: Sürüm × Durum × Sıradaki Adım × Ana Aksiyon × ⋯
   Rol-aware primary button (Planner: Devam Et / Finance: Finans Onayla /
   CFO: Onayla ve Yayına Al / Active: Revizyon Aç).
   İkincil aksiyonlar (Reddet/Arşivle) ⋯ üç-nokta menüsünde."
   ```

---

# GÜN 4 — Çalışma Bandı + Onay Checklist (M5 + M6)

## Task 4.1 — WorkContextBar component

**Files:**
- Create: `client/src/components/budget-planning/WorkContextBar.tsx`

**Steps:**

```tsx
import { getStatusChipClass, getStatusLabel } from './types'
import type { BudgetVersionStatus } from './types'

interface Version {
  id: number
  name: string
  status: string
  isActive: boolean
}

interface Props {
  yearLabel: number
  version: Version
  isEditable: boolean
  completedCount: number
  totalCount: number
  currency: string
  scenarioName?: string
  onCreateRevision?: () => void
  createRevisionPending?: boolean
}

export function WorkContextBar({
  yearLabel, version, isEditable, completedCount, totalCount,
  currency, scenarioName, onCreateRevision, createRevisionPending,
}: Props) {
  const status = version.status as BudgetVersionStatus
  const statusLabel = getStatusLabel(version.status)

  if (isEditable) {
    return (
      <div className="card mb-4 border-l-4 border-primary">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold text-on-surface">
            FY {yearLabel} › {version.name}
          </span>
          <span className={`chip ${getStatusChipClass(version.status)}`}>{statusLabel}</span>
          <span className="text-xs text-success ml-1">
            ✏ Düzenleyebilirsiniz
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 max-w-md">
            <div className="h-2 bg-surface-container-low rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
              />
            </div>
          </div>
          <span className="text-xs text-on-surface-variant num whitespace-nowrap">
            {completedCount}/{totalCount} müşteri
          </span>
          <span className="text-xs text-on-surface-variant">·</span>
          <span className="text-xs text-on-surface-variant">{currency}</span>
          <span className="text-xs text-on-surface-variant">·</span>
          <span className="text-xs text-on-surface-variant">
            Senaryo: {scenarioName ?? '—'}
          </span>
        </div>
      </div>
    )
  }

  // Salt-okunur
  return (
    <div className="card mb-4 flex items-center gap-4 border-l-4 border-primary">
      <span className="material-symbols-outlined text-primary" style={{ fontSize: 24 }}>
        lock
      </span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-on-surface">
          FY {yearLabel} › {version.name}
          {' — '}
          <strong>{statusLabel}</strong>
          <span className="text-on-surface-variant"> (salt-okunur)</span>
        </p>
        <p className="text-xs text-on-surface-variant mt-0.5">
          {status === 'Active'
            ? 'Bu sürümde değişiklik yapılamaz. Düzenlemek için revizyon açın; tüm girişler yeni taslağa kopyalanır.'
            : 'Bu sürüm arşivde. Yeni sürüm açmak için Versiyonlar sekmesine geçin.'}
        </p>
      </div>
      {status === 'Active' && onCreateRevision && (
        <button
          type="button"
          className="btn-primary"
          disabled={createRevisionPending}
          onClick={onCreateRevision}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit_note</span>
          {createRevisionPending ? 'Oluşturuluyor…' : 'Revizyon Aç'}
        </button>
      )}
    </div>
  )
}
```

2. `BudgetEntryPage.tsx`'te mevcut salt-okunur banner ve düzenlenebilir banner'ı bu component ile değiştir:
   ```tsx
   import { WorkContextBar } from '../components/budget-planning/WorkContextBar'

   // ... mevcut iki banner yerine:
   {yearId && currentVersion && (
     <WorkContextBar
       yearLabel={years.find(y => y.id === yearId)?.year ?? 0}
       version={currentVersion}
       isEditable={isEditable}
       completedCount={completedCustomerCount}
       totalCount={totalCustomerCount}
       currency={currency}
       scenarioName={scenarios.find(s => s.id === scenarioId)?.name}
       onCreateRevision={() => createDraftMutation.mutate()}
       createRevisionPending={createDraftMutation.isPending}
     />
   )}
   ```

3. Build + smoke (Bütçe Planlama → V4 Reddedildi: progress bar görünür; V5 Yürürlükte: lock + Revizyon Aç).

4. Commit:
   ```bash
   git add client/src/components/budget-planning/WorkContextBar.tsx \
           client/src/pages/BudgetEntryPage.tsx
   git commit -m "feat(budget-planning): WorkContextBar — sticky çalışma bandı

   FY 2026 › V7 Taslak [Taslak] ✏ Düzenleyebilirsiniz
   ████████░░  4/5 müşteri · TRY · Senaryo: —

   Active için: 🔒 banner + Revizyon Aç CTA.
   İki ayrı banner kaldırıldı, tek component."
   ```

---

## Task 4.2 — RED: useSubmissionChecklist testi

**Files:**
- Create: `client/src/components/budget-planning/useSubmissionChecklist.test.ts`

**Steps:**

```typescript
import { describe, expect, it } from 'vitest'
import { computeChecklist } from './useSubmissionChecklist'

const customer = (id: number) => ({ id, isActive: true })
const entry = (customerId: number, month: number, type: 'REVENUE' | 'CLAIM' = 'REVENUE') => ({
  customerId, month, entryType: type,
})

describe('computeChecklist', () => {
  it('hardFail: müşterilerin hiçbirinde entry yok', () => {
    const r = computeChecklist({
      customers: [customer(1), customer(2)],
      entries: [],
      expenseEntries: [],
      scenarioId: null,
    })
    expect(r.canSubmit).toBe(false)
    expect(r.hardFailCount).toBe(1)
    const fail = r.items.find(i => i.level === 'fail')
    expect(fail?.message).toContain('0/2')
  })

  it('pass: tüm müşterilerde entry var', () => {
    const r = computeChecklist({
      customers: [customer(1), customer(2)],
      entries: [entry(1, 1), entry(2, 1)],
      expenseEntries: [],
      scenarioId: null,
    })
    expect(r.canSubmit).toBe(true)
    expect(r.items.find(i => i.id === 'all-customers')?.level).toBe('pass')
  })

  it('warn: boş ay var (müşterinin ayda entry yok)', () => {
    const r = computeChecklist({
      customers: [customer(1)],
      entries: [entry(1, 1)],   // sadece Ocak
      expenseEntries: [],
      scenarioId: null,
    })
    const empty = r.items.find(i => i.id === 'empty-months')
    expect(empty?.level).toBe('warn')
  })

  it('warn: senaryo seçilmedi', () => {
    const r = computeChecklist({
      customers: [customer(1)],
      entries: [entry(1, 1)],
      expenseEntries: [],
      scenarioId: null,
    })
    expect(r.items.find(i => i.id === 'scenario')?.level).toBe('warn')
  })

  it('warn: OPEX gider yok', () => {
    const r = computeChecklist({
      customers: [customer(1)],
      entries: [entry(1, 1)],
      expenseEntries: [],
      scenarioId: 5,
    })
    expect(r.items.find(i => i.id === 'opex')?.level).toBe('warn')
  })

  it('warn: bir müşteride hasar planı yok (sadece GELIR)', () => {
    const r = computeChecklist({
      customers: [customer(1)],
      entries: [entry(1, 1, 'REVENUE')],
      expenseEntries: [],
      scenarioId: 5,
    })
    expect(r.items.find(i => i.id === 'claim-missing')?.level).toBe('warn')
  })

  it('pass: hem GELIR hem CLAIM var', () => {
    const r = computeChecklist({
      customers: [customer(1)],
      entries: [entry(1, 1, 'REVENUE'), entry(1, 1, 'CLAIM')],
      expenseEntries: [{ id: 1 }],
      scenarioId: 5,
    })
    expect(r.canSubmit).toBe(true)
    expect(r.warnCount).toBe(0)
  })
})
```

2. `pnpm test --run useSubmissionChecklist.test` — RED.

**Do not commit.**

---

## Task 4.3 — GREEN: useSubmissionChecklist hook

**Files:**
- Create: `client/src/components/budget-planning/useSubmissionChecklist.ts`

**Steps:**

```typescript
import { useMemo } from 'react'

interface Customer { id: number; isActive: boolean }
interface Entry { customerId: number; month: number; entryType: 'REVENUE' | 'CLAIM' }
interface ExpenseEntry { id: number }

export interface ChecklistItem {
  id: string
  level: 'pass' | 'warn' | 'fail'
  message: string
}

export interface ChecklistResult {
  items: ChecklistItem[]
  canSubmit: boolean
  hardFailCount: number
  warnCount: number
}

interface Input {
  customers: Customer[]
  entries: Entry[]
  expenseEntries: ExpenseEntry[]
  scenarioId: number | null
}

export function computeChecklist(input: Input): ChecklistResult {
  const { customers, entries, expenseEntries, scenarioId } = input
  const activeCustomers = customers.filter((c) => c.isActive)
  const totalCount = activeCustomers.length

  // 1. Sert kural: tüm müşterilerde en az 1 entry
  const completedIds = new Set(entries.map((e) => e.customerId))
  const completedCount = activeCustomers.filter((c) => completedIds.has(c.id)).length
  const items: ChecklistItem[] = []

  if (completedCount === totalCount && totalCount > 0) {
    items.push({
      id: 'all-customers', level: 'pass',
      message: `${completedCount}/${totalCount} müşteri tamamlandı`,
    })
  } else {
    items.push({
      id: 'all-customers', level: 'fail',
      message: `${completedCount}/${totalCount} müşteri tamamlandı (${totalCount - completedCount} eksik)`,
    })
  }

  // 2. Boş ay (müşterinin ayda 0 entry)
  if (totalCount > 0 && completedCount > 0) {
    const customersWithEmptyMonths = activeCustomers.filter((c) => {
      const monthsWithEntries = new Set(
        entries.filter((e) => e.customerId === c.id).map((e) => e.month),
      )
      return monthsWithEntries.size > 0 && monthsWithEntries.size < 12
    })
    if (customersWithEmptyMonths.length > 0) {
      items.push({
        id: 'empty-months', level: 'warn',
        message: `${customersWithEmptyMonths.length} müşteride boş ay var`,
      })
    }
  }

  // 3. OPEX gider
  if (expenseEntries.length === 0) {
    items.push({
      id: 'opex', level: 'warn',
      message: 'OPEX kategorilerinde gider girilmedi',
    })
  } else {
    items.push({
      id: 'opex', level: 'pass',
      message: `${expenseEntries.length} OPEX gider satırı girildi`,
    })
  }

  // 4. Hasar planı
  if (totalCount > 0) {
    const customersMissingClaim = activeCustomers.filter((c) => {
      const cEntries = entries.filter((e) => e.customerId === c.id)
      const hasRevenue = cEntries.some((e) => e.entryType === 'REVENUE')
      const hasClaim = cEntries.some((e) => e.entryType === 'CLAIM')
      return hasRevenue && !hasClaim
    })
    if (customersMissingClaim.length > 0) {
      items.push({
        id: 'claim-missing', level: 'warn',
        message: `${customersMissingClaim.length} müşteride hasar planı yok`,
      })
    }
  }

  // 5. Senaryo
  if (scenarioId == null) {
    items.push({
      id: 'scenario', level: 'warn',
      message: 'Senaryo seçilmedi',
    })
  }

  const hardFailCount = items.filter((i) => i.level === 'fail').length
  const warnCount = items.filter((i) => i.level === 'warn').length

  return {
    items,
    canSubmit: hardFailCount === 0 && totalCount > 0,
    hardFailCount,
    warnCount,
  }
}

export function useSubmissionChecklist(input: Input): ChecklistResult {
  return useMemo(() => computeChecklist(input), [
    input.customers, input.entries, input.expenseEntries, input.scenarioId,
  ])
}
```

2. `pnpm test --run useSubmissionChecklist.test` — 7 test geçer.

3. Commit:
   ```bash
   git add client/src/components/budget-planning/useSubmissionChecklist.ts \
           client/src/components/budget-planning/useSubmissionChecklist.test.ts
   git commit -m "feat(budget-planning): useSubmissionChecklist hook (1 sert + 4 yumuşak kural)

   Pure derivation. canSubmit = hardFailCount === 0.
   Warn'lar göndermeyi engellemez ama UI'da listelenir."
   ```

---

## Task 4.4 — SubmissionChecklist UI bileşeni

**Files:**
- Create: `client/src/components/budget-planning/SubmissionChecklist.tsx`

**Steps:**

```tsx
import { useState } from 'react'
import type { ChecklistResult } from './useSubmissionChecklist'

const LEVEL_ICON: Record<string, string> = {
  pass: '✓',
  warn: '⚠',
  fail: '✗',
}
const LEVEL_COLOR: Record<string, string> = {
  pass: 'text-success',
  warn: 'text-warning',
  fail: 'text-error',
}

export function SubmissionChecklist({ result }: { result: ChecklistResult }) {
  const [open, setOpen] = useState(result.warnCount > 0 || result.hardFailCount > 0)

  if (result.items.length === 0) return null

  return (
    <div className="card mb-4">
      <button
        type="button"
        className="w-full flex items-center justify-between"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>
            checklist
          </span>
          <h3 className="text-base font-bold text-on-surface">Onaya Hazırlık</h3>
          {result.hardFailCount > 0 && (
            <span className="chip chip-error text-xs">{result.hardFailCount} eksik</span>
          )}
          {result.warnCount > 0 && (
            <span className="chip chip-warning text-xs">{result.warnCount} uyarı</span>
          )}
          {result.canSubmit && result.warnCount === 0 && (
            <span className="chip chip-success text-xs">Hazır ✓</span>
          )}
        </div>
        <span className="material-symbols-outlined">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      {open && (
        <ul className="mt-3 space-y-1.5">
          {result.items.map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-sm">
              <span className={`${LEVEL_COLOR[item.level]} font-bold`}>
                {LEVEL_ICON[item.level]}
              </span>
              <span className="text-on-surface">{item.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

2. `BudgetEntryPage.tsx`'e ekle (KPI grid'in altına, müşteri seç bölümünün üstüne):
   ```tsx
   import { SubmissionChecklist } from '../components/budget-planning/SubmissionChecklist'
   import { useSubmissionChecklist } from '../components/budget-planning/useSubmissionChecklist'

   // ...
   const checklist = useSubmissionChecklist({
     customers,
     entries,
     expenseEntries: [],  // Şimdilik boş; expense query'sini fetch etmek isterseniz ekleyin
     scenarioId,
   })

   // Onaya Gönder buton koşulunu güncelle:
   const canSubmit = isEditable && checklist.canSubmit && !submitMutation.isPending

   // Render:
   {isEditable && currentVersion && (
     <SubmissionChecklist result={checklist} />
   )}
   ```

3. Onaya Gönder onClick'inde warn varsa farklı confirm:
   ```typescript
   onClick={() => {
     if (!canSubmit) return
     const warningList = checklist.items
       .filter(i => i.level === 'warn')
       .map(i => `   • ${i.message}`).join('\n')
     const msg = checklist.warnCount > 0
       ? `Bu versiyon onaya gönderilecek.\n\n⚠ Uyarılar (göndermeyi engellemez):\n${warningList}\n\nDevam etmek istiyor musunuz?`
       : 'Bu versiyon onaya gönderilecek. Emin misiniz?'
     if (!confirm(msg)) return
     submitMutation.mutate()
   }}
   ```

4. Build + smoke test (V4 Reddedildi → checklist görünür, "0/4 müşteri" fail).

5. Commit:
   ```bash
   git add client/src/components/budget-planning/SubmissionChecklist.tsx \
           client/src/pages/BudgetEntryPage.tsx
   git commit -m "feat(budget-planning): SubmissionChecklist UI + Onaya Gönder confirm uyarıları

   Collapsible panel: ✓/⚠/✗ ikon + mesaj listesi.
   Hazır + warn>0 → confirm dialog uyarıları listeler.
   Hazır + warn=0 → basit confirm."
   ```

---

# GÜN 5 — Gider Modal Stepper + Smoke Test (M9)

## Task 5.1 — Stepper component

**Files:**
- Create: `client/src/components/budget-planning/Stepper.tsx`

**Steps:**

```tsx
interface StepperProps {
  steps: { label: string }[]
  current: number  // 1-based
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <div className="flex items-center gap-2 mb-4" role="navigation" aria-label="Adımlar">
      {steps.map((s, i) => {
        const num = i + 1
        const state =
          num < current ? 'done' : num === current ? 'current' : 'todo'
        const dotClass =
          state === 'done' ? 'bg-success text-white'
            : state === 'current' ? 'bg-primary text-white'
            : 'bg-surface-container-low text-on-surface-variant border border-outline-variant'
        return (
          <div key={s.label} className="flex items-center gap-2 flex-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${dotClass}`}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              {state === 'done' ? '✓' : num}
            </div>
            <span className={`text-xs ${state === 'current' ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}`}>
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className="flex-1 h-0.5 bg-surface-container-low rounded" />
            )}
          </div>
        )
      })}
    </div>
  )
}
```

2. Commit:
   ```bash
   git add client/src/components/budget-planning/Stepper.tsx
   git commit -m "feat(client): generic Stepper component (a11y aria-current)"
   ```

---

## Task 5.2 — ExpenseEntriesPage modal refactor

**Files:**
- Modify: `client/src/pages/ExpenseEntriesPage.tsx`

**Steps:**

1. Mevcut "Yeni Gider (Bütçe)" modal'ını tamamen yeniden yaz. State:
   ```typescript
   import { Stepper } from '../components/budget-planning/Stepper'

   type Step = 1 | 2 | 3 | 4

   const [step, setStep] = useState<Step>(1)
   const [draft, setDraft] = useState<{
     categoryId?: number
     month?: number
     amount: string
     currency: 'TRY' | 'USD' | 'EUR'
     notes: string
   }>({ amount: '', currency: 'TRY', notes: '' })

   const canAdvance = (s: Step): boolean => {
     if (s === 1) return draft.categoryId != null
     if (s === 2) return draft.month != null
     if (s === 3) return Number(draft.amount) > 0
     return true
   }

   const stepLabels = [
     { label: 'Kategori' },
     { label: 'Ay' },
     { label: 'Tutar' },
     { label: 'Onay' },
   ]
   ```

2. Modal render — adım bazlı içerik:
   ```tsx
   <Modal open={showModal} onClose={() => { setShowModal(false); setStep(1) }}>
     <h3 className="text-lg font-bold mb-4">Yeni Gider (Bütçe)</h3>
     <Stepper steps={stepLabels} current={step} />

     {step === 1 && (
       <div>
         <p className="text-sm text-on-surface-variant mb-2">
           Hangi gider kategorisi için kayıt yapıyorsunuz?
         </p>
         <select
           className="select w-full"
           value={draft.categoryId ?? ''}
           onChange={(e) => setDraft({ ...draft, categoryId: Number(e.target.value) || undefined })}
         >
           <option value="">— Seçin —</option>
           {categories.map((c) => (
             <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
           ))}
         </select>
       </div>
     )}

     {step === 2 && (
       <div>
         <p className="text-sm text-on-surface-variant mb-2">Bu giderin ait olduğu ay.</p>
         <select
           className="select w-full"
           value={draft.month ?? ''}
           onChange={(e) => setDraft({ ...draft, month: Number(e.target.value) || undefined })}
         >
           <option value="">— Seçin —</option>
           {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
             <option key={m} value={m}>{m} — {MONTH_LABELS[m - 1]}</option>
           ))}
         </select>
       </div>
     )}

     {step === 3 && (
       <div>
         <p className="text-sm text-on-surface-variant mb-2">
           Tutar <strong>orijinal döviz</strong> cinsinden. Sistem TL karşılığını otomatik hesaplar.
         </p>
         <div className="grid grid-cols-3 gap-2">
           <select
             className="select"
             value={draft.currency}
             onChange={(e) => setDraft({ ...draft, currency: e.target.value as 'TRY' | 'USD' | 'EUR' })}
           >
             {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
           </select>
           <input
             type="number"
             className="input col-span-2"
             value={draft.amount}
             onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
             placeholder="0,00"
             min="0"
             step="0.01"
           />
         </div>
       </div>
     )}

     {step === 4 && (
       <div>
         <p className="text-sm text-on-surface-variant mb-3">
           Aşağıdaki bilgileri kontrol edin. Kaydet'e basınca versiyona eklenecek.
         </p>
         <div className="bg-surface-container-low p-3 rounded text-sm space-y-2">
           <div><strong>Kategori:</strong> {categories.find(c => c.id === draft.categoryId)?.name}</div>
           <div><strong>Ay:</strong> {MONTH_LABELS[(draft.month ?? 1) - 1]}</div>
           <div><strong>Tutar:</strong> {Number(draft.amount).toLocaleString('tr-TR')} {draft.currency}</div>
           <div><strong>Versiyon:</strong> {currentVersion?.name}</div>
         </div>
         <label className="block mt-3">
           <span className="label-sm block mb-1">Not (opsiyonel)</span>
           <textarea
             className="input w-full" rows={2}
             value={draft.notes}
             onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
           />
         </label>
       </div>
     )}

     <div className="flex justify-between mt-6">
       <button
         type="button"
         className="btn-secondary"
         onClick={step === 1 ? () => { setShowModal(false); setStep(1) } : () => setStep((step - 1) as Step)}
       >
         {step === 1 ? 'Vazgeç' : '← Geri'}
       </button>
       <button
         type="button"
         className="btn-primary"
         disabled={!canAdvance(step) || saveMutation.isPending}
         onClick={() => {
           if (step < 4) setStep((step + 1) as Step)
           else saveMutation.mutate()
         }}
       >
         {step < 4 ? 'Devam →' : (saveMutation.isPending ? 'Kaydediliyor…' : '✓ Kaydet')}
       </button>
     </div>
   </Modal>
   ```

3. saveMutation `mutationFn` draft state'ini kullanacak şekilde güncelle:
   ```typescript
   mutationFn: async () => {
     if (!yearId || !versionId) throw new Error('Yıl ve versiyon seçilmedi')
     const payload = {
       categoryId: draft.categoryId!,
       month: draft.month!,
       amountOriginal: Number(draft.amount),
       currencyCode: draft.currency,
       entryType: entryType === 'BUDGET' ? 'BUDGET' : 'ACTUAL',
       notes: draft.notes || null,
     }
     await api.post(`/expenses/${yearId}/entries?versionId=${versionId}`, payload)
   },
   onSuccess: () => {
     setShowModal(false)
     setStep(1)
     setDraft({ amount: '', currency: 'TRY', notes: '' })
     // toast (Task 5.3'te eklenecek)
     invalidate()
   },
   ```

4. Build + browser smoke (Yeni Gider butonuna tıkla → 4 adım sırayla doldur → kaydet).

5. Commit:
   ```bash
   git add client/src/pages/ExpenseEntriesPage.tsx
   git commit -m "feat(expenses): Yeni Gider modal 4 adımlı stepper'a refactor

   ① Kategori → ② Ay → ③ Tutar → ④ Onay
   Her adımda mikro-yardım cümlesi. ← Geri / Devam → / ✓ Kaydet."
   ```

---

## Task 5.3 — Toast component (basit)

**Files:**
- Create: `client/src/components/shared/Toast.tsx`

**Steps:**

```tsx
import { useEffect, useState } from 'react'

interface ToastState {
  id: number
  message: string
  level: 'success' | 'error'
}

let nextId = 1
const listeners: Array<(t: ToastState) => void> = []

export function showToast(message: string, level: 'success' | 'error' = 'success') {
  const t: ToastState = { id: nextId++, message, level }
  listeners.forEach((l) => l(t))
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastState[]>([])

  useEffect(() => {
    const handler = (t: ToastState) => {
      setToasts((prev) => [...prev, t])
      setTimeout(() => setToasts((prev) => prev.filter((p) => p.id !== t.id)), 3000)
    }
    listeners.push(handler)
    return () => {
      const i = listeners.indexOf(handler)
      if (i >= 0) listeners.splice(i, 1)
    }
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-md shadow-lg max-w-sm ${
            t.level === 'success'
              ? 'bg-success text-white'
              : 'bg-error text-white'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
```

2. `App.tsx`'e ekle:
   ```tsx
   import { ToastContainer } from './components/shared/Toast'

   // App layout root'ta:
   <>
     {/* mevcut routes */}
     <ToastContainer />
   </>
   ```

3. `ExpenseEntriesPage` saveMutation onSuccess'inde çağır:
   ```typescript
   import { showToast } from '../components/shared/Toast'

   onSuccess: () => {
     // ... existing
     showToast(
       `"${categories.find(c => c.id === draft.categoryId)?.name} — ${MONTH_LABELS[(draft.month ?? 1) - 1]} ${currentYear}" gideri eklendi.`,
     )
   }
   ```

4. Build + smoke (Yeni gider kaydet → toast görünür 3 sn).

5. Commit:
   ```bash
   git add client/src/components/shared/Toast.tsx client/src/App.tsx \
           client/src/pages/ExpenseEntriesPage.tsx
   git commit -m "feat(client): Toast bileşeni + Gider kayıt sonrası bildirim

   Basit setTimeout-based toast, role='status' a11y. App köküne ToastContainer.
   showToast(message, level) helper. ExpenseEntries kayıt sonrası tetikler."
   ```

---

## Task 5.4 — Final smoke test (Playwright manuel)

**Files:** none

**Steps:**

1. API + dev server canlı mı:
   ```bash
   curl -s http://localhost:5100/api/v1/budget/years -o /dev/null -w "api:%{http_code}\n"
   curl -s http://localhost:3000/ -o /dev/null -w "client:%{http_code}\n"
   ```

2. Playwright MCP ile:
   1. Login: `admin@tag.local` / `Devpass!2026`
   2. **Dashboard:** "Görev Merkezi" görünür, V6/V4/V5 için kartlar listelenir
   3. Görev kartından "Devam Et" tıkla → Bütçe Planlama'ya gider
   4. **Bütçe Planlama:** WorkContextBar görünür (FY 2026 › V?? · ✏ Düzenleyebilirsiniz · progress bar)
   5. SubmissionChecklist görünür (eğer warn varsa açık)
   6. Mikro-yardım: "Aktif veya taslak bütçeyi..." H2 altında
   7. **Versiyonlar tab:** RevisionTimeline görünür (V1→V2→...→V6 zinciri)
   8. Tabloda her satır tek primary aksiyon + ⋯ menü
   9. **Gider Girişi:** modal aç → 4 adım sırayla geçer → kaydet → toast
   10. **Onay Akışı:** mikro-yardım, mevcut akış değişmeden çalışır
   11. **Active versiyon seçildiğinde:** salt-okunur banner + "Revizyon Aç" CTA
   12. **Bir mutation hata aldığında:** translateApiError'dan kullanıcı dilinde mesaj

3. Tüm adımlar geçiyorsa **✅ E2E doğrulandı** yaz.

**Commit yok** (runtime).

---

# Execution Handoff

Plan tamamlandı. **5 gün, 16 task, 9 modül**.

## Execution modları

### Seçenek 1: Sequential (bu oturum, direkt) — TAVSİYE
Ben gün gün sırayla yaparım, her commit sonunda kısa rapor + browser smoke. Onayın olmadan ilerlerim (önceki release'de bu çalıştı).

### Seçenek 2: Subagent-Driven
Her gün için fresh subagent dispatch. Overhead: bu boyutta gereksiz.

### Seçenek 3: Separate Session
Plan kaydedilir, başka oturumda `executing-plans` ile koşturulur.

**Tavsiyem:** Seçenek 1 — bu sprint'te 16 task çoğunluğu mekanik UI değişikliği, sıralı yapmak en temiz.

---

# Sonraki Adım

Plan dosyasını commit'le + execution mode seç.

```bash
git add docs/plans/2026-04-19-self-onboarding-release-plan.md
git commit -m "docs(plan): self-onboarding release implementation plan"
```

**Execute modu seç: 1 / 2 / 3**
