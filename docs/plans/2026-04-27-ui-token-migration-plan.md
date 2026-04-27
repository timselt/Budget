# UI Color Token Migration — Implementation Plan

**Goal:** 32 hardcoded hex usage'ını (8 unique hex) `@theme` token system'ine taşı, info semantic family'sini ekle, regresyonu pre-commit lint gate ile kalıcı hale getir.

**Bağlam:** Sprint 1 redesign (2026-04-19) ile `index.css` `@theme` token sistemi kuruldu (primary, secondary, surface, status). Token adoption `client/src/` içinde ~%0; sayfalar hâlâ `text-[#002366]`, `bg-[#1e293b]`, `border-[#f5c7c3] bg-[#fff7f5]` gibi arbitrary value kullanıyor. Bu plan adoption'u %100'e çıkarır ve linter ile koruma altına alır.

**Tech Stack:** React 19 + TypeScript 6 + Tailwind 4 (`@theme` token system).

**Branch:** `feat/ui-token-migration` (mevcut sprint branch'inden ayrı tutulabilir).

**Önkoşul:** `docs/plans/2026-04-19-sprint1-deep-screen-redesign-design.md` (token system'in geldiği commit).

---

## Bulgular (Baseline — 2026-04-27)

```bash
grep -rE '(bg|text|border|from|to|ring)-\[#' client/src/ | wc -l
# 32 instance
```

Unique hex değerleri:
| Hex | Kullanım | Önerilen Token |
|-----|----------|----------------|
| `#002366` (20×) | Başlık, KPI, ribbon | `text-secondary` (zaten var) |
| `#1e293b` (3×) | Tablo TOPLAM satırı | Yeni utility: `.tbl-total-row` |
| `#DA291C` | SIGORTA segment dot | `bg-primary` |
| `#006d3e` | FILO segment dot, ribbon-success | Yeni token: `--color-success-strong` |
| `#8a5300` | ALTERNATIF segment, ribbon-warning | Yeni token: `--color-warning-strong` |
| `#6f42c1` | SGK_TESVIK segment | Yeni token: `--color-segment-special` (marka onayı bekler) |
| `#005b9f` / `#8a5300` | Revenue / OPEX label rengi | `text-info` / `text-warning` |
| `#f5f8ff` / `#c9d8ff` | Selected row / border | `bg-info-container` / `border-info` |
| `#fff7f5` / `#f5c7c3` | Validation error tile | `bg-error-container` / `border-error-container` (color-mix) |

**Yeni token gereksinimi:**
- `--color-info: #0b4f99` (mevcut `#005b9f`'in semantic eşdeğeri, biraz daha doygun)
- `--color-info-container: #d2e4ff` (zaten `.chip-info` içinde var, `@theme`'e taşınmalı)
- `--color-on-info: #ffffff`
- `--color-on-info-container: #002366`

---

## PR Sırası

### PR #1 — feat(theme): add info family + alert/total utility classes

**Dosya:**
- `client/src/index.css` — `@theme` bloğuna info token ailesi ekle
- `client/src/styles/finopstur.css` — yeni utility'ler:
  - `.tbl-total-row` (bg, text, font-weight)
  - `.alert-tile` (border, bg, padding) info varyantı
  - `.alert-tile-error`, `.alert-tile-warning` paralel varyantlar
  - `.segment-dot-{sigorta,otomotiv,filo,alternatif,sgk}` token-bound

**Test:**
- `pnpm build` — Tailwind 4 token tarama hatası yok
- `pnpm test` — UI snapshot regresyonu yok (mevcut suite)
- Manuel: dev server'da Sprint 1 redesign sayfaları visual diff yok

**Risk:** LOW — sadece additive; mevcut hex'lere dokunmuyor.

**Efor:** ~2h.

---

### PR #2 — refactor(ui): replace `#002366` with `text-secondary`

**Dosya (20 satır, 5 sayfa + 1 component):**
- `client/src/pages/DashboardPage.tsx` (12 satır)
- `client/src/pages/ConsolidationPage.tsx` (1)
- `client/src/pages/ForecastPage.tsx` (1)
- `client/src/pages/VariancePage.tsx` (3)
- `client/src/components/budget-planning/BudgetTreePanel.tsx` (1 — segment dot SIGORTA #DA291C → `bg-primary`)

**Yöntem:** `replace_all` ile her dosyada `text-[#002366]` → `text-secondary`. Build sonrası grep doğrulaması.

**Test:**
- `pnpm build && pnpm lint && pnpm test`
- Dev server: Dashboard, Consolidation, Forecast, Variance ekranlarını gözle kontrol et
- Token hex değeri (`--color-secondary: #002366`) zaten aynı, pixel diff = 0

**Risk:** LOW — token aynı hex'e map ediyor.

**Efor:** ~1h.

---

### PR #3 — refactor(ui): alert tiles to info-container

**Dosya:**
- `client/src/pages/BudgetEntryPage.tsx`:
  - `border-[#f5c7c3] bg-[#fff7f5]` → `alert-tile-error` utility
  - `border-[#c9d8ff] bg-[#f5f8ff]` → `alert-tile-info` utility
  - `bg-[#f5f8ff]` (selected row) → `bg-info-container`
- `client/src/components/budget-planning/BudgetCustomerGrid.tsx` (revenue/opex label renkleri)

**Test:**
- `pnpm test` — varsa BudgetEntryPage testleri hâlâ geçmeli
- Dev server: validation alert ve selected row hover state'leri görsel kontrol
- Playwright (varsa): smoke test

**Risk:** MEDIUM — `color-mix()` ile error-container'dan tile rengi türetmek gerek; ΔE≤2 toleransı için Playwright pixel diff opsiyonel.

**Efor:** ~3-5h.

---

### PR #4 — refactor(ui): table-total + segment dots

**Dosya:**
- `client/src/components/budget-planning/BudgetOpexGrid.tsx` — `bg-[#1e293b] text-white` → `tbl-total-row`
- `client/src/components/budget-planning/BudgetCustomerGrid.tsx` — aynı
- `client/src/pages/ActualsPage.tsx` — aynı
- `client/src/components/budget-planning/BudgetTreePanel.tsx` — kalan 4 segment hardcoded class → token-bound utility

**Test:**
- `pnpm test`
- Dev server: tüm bütçe grid'lerinde TOPLAM satırı görsel kontrol
- BudgetTreePanel'de segment chip renkleri kontrol

**Risk:** LOW — utility class swap.

**Efor:** ~2-3h.

---

### PR #5 — chore(lint): pre-commit gate for hardcoded hex

**Dosya:**
- `.husky/pre-commit` — yeni grep step
- `package.json` — script: `"lint:colors": "! grep -rE '(bg\|text\|border\|from\|to\|ring)-\\[#' client/src/"`

**Mantık:** Pre-commit'te `pnpm lint:colors` çalışır; hardcoded hex eklenirse commit blocklanır. Mesaj: "Hardcoded hex bulundu — `@theme` token kullan veya `client/src/styles/finopstur.css`'e utility ekle."

**İstisna listesi:** Yok. Tüm hex değerleri ya token ya utility üzerinden gelmeli.

**Test:**
- `git commit` ile dummy `bg-[#abcdef]` ekleyip block edildiğini doğrula
- Token kullanan değişiklikler geçer

**Risk:** LOW — yalnızca CI/hook etkisi.

**Efor:** ~1h.

---

## Final Kabul Kriteri

```bash
grep -rE '(bg|text|border|from|to|ring)-\[#' client/src/ | wc -l
# Beklenen: 0 (şu an 32)
```

- Tüm Sprint 1 redesign sayfalarında pixel-perfect aynı görünüm (ΔE≤2)
- Pre-commit hook hardcoded hex eklemeyi blokluyor
- `--color-info` family `@theme` içinde, `.chip-info` token-bound
- `--color-tertiary` DEPRECATED comment'ı korunur (ayrı follow-up'ta temizlenir)

## Açık Notlar

- **SGK_TESVIK mor** (`#6f42c1`): Marka onayı bekler — yeni token `--color-segment-special` mı, mevcut mor'a en yakın token mı (yok)? Yoksa `bg-primary` ile birleştir mi? Karar muhasebe/marka turunda alınır.
- **`--color-tertiary` DEPRECATED alias**: PR #5 sonrası ayrı PR'da `success` referanslarına refactor + token sil.
- **Dark mode**: Bu plan kapsamında değil. Token sistemi hazır olduğu için sonraki sprint'te `[data-theme="dark"]` override'larıyla ayrı plan açılır.
