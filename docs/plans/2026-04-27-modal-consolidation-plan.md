# Modal Consolidation + A11y — Implementation Plan

**Goal:** 17 modal call-site'ı (5 dedicated component + 12 page-level inline) tek `shared/Modal` primitive'inde topla. Focus trap, body scroll lock, role/aria-modal, Escape, portal mount ve focus restore'u zorunlu kıl. Inline modal markup'ını ESLint ile yasakla.

**Bağlam:** İlk denetimde 4 modal varsayıldı; gerçekte 17 call-site var. Hiçbiri:
- focus trap kullanmıyor
- `role="dialog"` / `aria-modal="true"` taşımıyor
- body scroll'u lock etmiyor
- portal'a mount olmuyor
- focus restore yapmıyor

Kritik a11y ve UX açığı; klavye-only kullanıcı modal'a hapsoluyor (ya da modal'dan çıkmadan diğer ekran tabbable hâlâ erişilir).

**Tech Stack:** React 19, TypeScript 6, Tailwind 4, Vitest 2, Playwright (smoke), `vitest-axe` (yeni dev dep, ~5KB).

**Branch:** `feat/modal-consolidation` (UI token migration ile paralel ilerleyebilir).

**Önkoşul:** Yok — UI token migration ile bağımsız.

---

## Bulgular (Baseline — 2026-04-27)

### Dedicated modal component (5)
1. `client/src/components/budget-planning/RejectModal.tsx`
2. `client/src/components/budget-planning/ExcelImportModal.tsx`
3. `client/src/components/budget-planning/QuickActionModals.tsx` (`ModalShell` iç wrapper)
4. `client/src/components/reconciliation/UploadBatchModal.tsx`
5. `client/src/components/customers/CustomerImportModal.tsx`

### Page-level inline modal (12)
- `SpecialItemsPage`, `SegmentsPage`, `ExpenseEntriesPage`, `AdminPage`, `ContractPriceBooksPage`, `ReconciliationBatchDetailPage`, `ContractsPage`, `ExpenseCategoriesPage`, `ProductsPage`, `BudgetPeriodsPage`, `ScenariosPage`, `CustomersPage`

Tümü `fixed inset-0 ... z-50 flex` benzeri ad-hoc markup kullanıyor.

---

## Modal API (PR #1'de donduruluyor)

```ts
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';        // default 'md'
  closeOnBackdropClick?: boolean;            // default true
  closeOnEscape?: boolean;                   // default true
  initialFocusRef?: React.RefObject<HTMLElement>;
  headerActions?: React.ReactNode;           // başlık yanında yardımcı action (ör. "Şablon İndir")
  footer?: React.ReactNode;
  labelledBy?: string;                       // override aria-labelledby; default `${id}-title`
  children: React.ReactNode;
}
```

Render davranışı:
- React Portal → `document.body` ile `<div id="modal-root">` veya inline `createPortal(node, document.body)`
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby={...-title}`, `aria-describedby={...-description}` (varsa)
- Backdrop: `bg-black/40 fixed inset-0 z-50`
- Panel: card-floating utility (token system'inden)
- Açıkken `document.body.style.overflow = 'hidden'`

---

## Focus Trap Stratejisi — `useFocusTrap` Custom Hook

Karar: **focus-trap-react paketi yerine custom hook**. Sebep:
- ~30 satır kod
- 0 yeni dep, bundle bütçesi (300KB) korunur
- `<dialog>` native element React 19 transition state ile karmaşık (özellikle Tailwind backdrop styling)
- Tam kontrol — Tab/Shift-Tab loop, ilk focus, restore davranışı

```ts
useFocusTrap(active: boolean, containerRef: RefObject<HTMLElement>, options?: {
  initialFocusRef?: RefObject<HTMLElement>;
  restoreFocus?: boolean;       // default true
});
```

Davranış:
1. `active=true` → containerRef içindeki ilk focusable veya `initialFocusRef.current.focus()`
2. `keydown Tab` → son focusable'a ulaştıysa ilkine wrap (Shift+Tab tersi)
3. `active=false` → previously focused element'e focus geri ver

---

## PR Sırası

### PR #1 — feat(shared): Modal primitive + hooks

**Dosya (yeni):**
- `client/src/shared/ui/Modal.tsx` (~120 satır — props, portal, ESC, backdrop, ARIA)
- `client/src/shared/hooks/useFocusTrap.ts` (~40 satır)
- `client/src/shared/hooks/useBodyScrollLock.ts` (~15 satır)
- `client/src/shared/ui/Modal.test.tsx` — Vitest + Testing Library:
  - Açıldığında initial focus
  - Tab loop
  - Escape kapatır
  - Backdrop click kapatır (closeOnBackdropClick=false ise kapatmaz)
  - Kapandığında focus restore
  - `role="dialog"` + `aria-modal` + `aria-labelledby` doğru
  - body scroll lock toggle

**Dev dep ekle:**
```bash
pnpm add -D vitest-axe
```

**Test:**
- `pnpm test shared/ui/Modal` — tüm assertion'lar geçer
- `pnpm build` — bundle artışı <5KB
- Manuel smoke: dev server'da test sayfası ile aç/kapa/Tab loop

**Risk:** LOW — kod izole, mevcut modal'lara dokunmuyor.

**Efor:** ~M (4-6h).

---

### PR #2 — refactor(budget-planning): port RejectModal (POC)

**Dosya:**
- `client/src/components/budget-planning/RejectModal.tsx` — body içeriğini `<Modal>` wrap'ine taşı, kendi backdrop/positioning markup'ını sil

**POC olma sebebi:** En küçük modal (sadece reason textarea + 2 buton). API mismatch/regresyon erken yakalanır.

**Test:**
- Mevcut `RejectModal` testi varsa hâlâ geçmeli
- Dev server: bütçe red akışı manuel doğrulama
- A11y: jaws/voiceover ile spot check

**Risk:** LOW.

**Efor:** ~S (1-2h).

---

### PR #3 — refactor(budget-planning): replace ModalShell with shared Modal

**Dosya:**
- `client/src/components/budget-planning/QuickActionModals.tsx` — iç `ModalShell` component'ini sil, tüm `ModalShell` render'larını `<Modal>` ile değiştir

**Test:**
- QuickActions akış testi (varsa)
- Dev server: her quick action modal'ını aç/kapa

**Risk:** LOW — API'ler benzer.

**Efor:** ~S.

---

### PR #4a — refactor(modals): port 4 dedicated components

**Dosya:**
- `client/src/components/budget-planning/ExcelImportModal.tsx` — `headerActions` slot'unda "Şablon İndir" butonu
- `client/src/components/reconciliation/UploadBatchModal.tsx`
- `client/src/components/customers/CustomerImportModal.tsx`
- (RejectModal + QuickActionModals zaten PR #2/#3'te yapıldı)

**Test:**
- Her modal için varsa unit test
- Dev server: her birini manuel açıp Tab loop, Escape, backdrop click, focus restore doğrula

**Risk:** MEDIUM — ExcelImportModal'ın "Şablon İndir" butonu header'da; layout regresyonu olabilir.

**Efor:** ~M (3-5h).

---

### PR #4b — refactor(modals): port 12 page-level inline modals

**Dosya (12 sayfa):**
- `SpecialItemsPage`, `SegmentsPage`, `ExpenseEntriesPage`, `AdminPage`, `ContractPriceBooksPage`, `ReconciliationBatchDetailPage`, `ContractsPage`, `ExpenseCategoriesPage`, `ProductsPage`, `BudgetPeriodsPage`, `ScenariosPage`, `CustomersPage`

Her sayfada inline `fixed inset-0 ...` markup'ını sil, `<Modal open={...}>` ile sar.

**Test:**
- Her sayfa için hızlı dev server smoke (CRUD modal'larını aç/kapa)
- Playwright (varsa) smoke run
- Lint sonrası eski markup kalmadığını doğrula

**Risk:** MEDIUM — sayfa state machine'leri farklı olabilir; `open` koşulu doğru bağlanmazsa modal açılmaz.

**Efor:** ~L (1-2 gün, 12 dosya).

---

### PR #5 — chore(lint): forbid inline modal markup

**Dosya:**
- `.eslintrc.cjs` veya `eslint.config.ts` — `no-restricted-syntax` rule:
  ```js
  {
    selector: "JSXElement[openingElement.name.name='div'][openingElement.attributes.some(a => a.name.name === 'className' && /fixed inset-0.*z-50/.test(a.value.value))]",
    message: "Inline modal markup yasak — shared/ui/Modal kullan."
  }
  ```
  (Tam selector implementation'da düzeltilir; mantık: `<div className="fixed inset-0 ... z-50">` JSX yakalanır.)

**Test:**
- `pnpm lint` — kod tabanında 0 hit
- Dummy inline modal eklendiğinde lint error
- ESLint disable comment'ı ile bypass mümkün ama review'da yakalanır

**Risk:** LOW.

**Efor:** ~S.

---

## Final Kabul Kriteri

- 17 modal call-site'ın tamamı `shared/ui/Modal`'a port edildi
- ESLint inline modal markup'ı blokluyor
- Vitest test suite + axe smoke geçer
- Playwright keyboard nav E2E geçer (en az 1 modal için)
- A11y kabul: NVDA/VoiceOver spot check OK
- Bundle artışı <8KB (gzip)

## Açık Notlar

- **vitest-axe vs jest-axe**: Vitest 2 ile uyumlu varyant `vitest-axe`; eklenmez ise `axe-core` ile manuel assertion yazılabilir.
- **Modal stacking**: 2+ modal aynı anda açılıyorsa (örn. confirm-within-modal), z-index ve focus trap sırası şu an plan dışı; ilk versiyon tek-modal varsayar.
- **Animasyon**: Şu an plan'da yok; sonraki sprint'te `<Transition>` veya CSS animation eklenebilir.
- **Modal #2 + #3 sıralı yapılır** çünkü `ModalShell` (PR #3) `RejectModal`'dan büyük; POC sırasını korumak gerekir.
