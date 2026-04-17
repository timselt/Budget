# Tur Assist Brand System v1 — Architectural Precision

**Creative North Star:** "The Financial Architect / Architectural Precision"

Kaynak: Timur tarafından 2026-04-17'de paylaşılan resmi Design System Document. Stitch MCP design system token'ları ve frontend Tailwind config bu dokümana bire bir uygulanmalı.

---

## Renk Paleti (AUTHORITATIVE — varsayım yapma)

| Token | Hex | Kullanım |
|-------|-----|----------|
| `primary` | `#b50303` | Primary action, critical status |
| `primary_container` | `#da291c` | CTA gradient 135° ile `primary`'ye geçer |
| `secondary` | `#435b9f` | Sidebar arka plan (Monolith) |
| `on_secondary_container` | `#002366` | Navy anchor, başlık rengi |
| `on_secondary_fixed` | `#00174a` | Sidebar derin ton |
| `surface` | `#f7f9fb` | Base layer |
| `surface_container_low` | `#f2f4f6` | Content section |
| `surface_container_lowest` | `#ffffff` | Interaktif kart |
| `surface_container_high` | `#e6e8ea` | Inactive/recessed |
| `error` | `#93000a` | Critical text |
| `error_container` | `#ffdad6` | Over-budget chip zemin |
| `on_background` | `#191c1e` | Tüm metin — ASLA `#000` |
| `outline_variant` | `#e6bdb7` @ 15% | Fallback ghost border |

## Tipografi

**Font:** `Manrope` — geometric clarity + modern professional (Inter DEĞİL).

| Level | Size | Weight | Role |
|-------|------|--------|------|
| Display-LG | 3.5rem | 800 | Hero moments, yüksek etki veri |
| Headline-MD | 1.75rem | 700 | Bölüm girişi, architectural anchor |
| Title-SM | 1.0rem | 600 | Kart başlık, primary nav |
| Body-MD | 0.875rem | 400 | Standard finansal veri (workhorse) |
| Label-SM | 0.6875rem | 700 | Uppercase metadata, tablo başlık |

**Typographic Tension:** `Display-LG` değer ile `Label-SM` metadata'yı yakın koy → editorial hiyerarşi.

## Layout & Depth İlkeleri

- **No-Line Rule:** 1px solid border YASAK. Bölümlemeyi background color shift ile yap.
- **Tonal Layering:** Kartları `surface_container_lowest` ile `surface_container_low` üzerine koy → doğal lift (shadow gerekmez).
- **Ambient Shadow** (yalnızca floating için): `0 20px 40px rgba(0, 35, 102, 0.06)` — navy-tonal.
- **Glass & Gradient:** Modal/dropdown → `surface_container_lowest` @ 80% opacity + 20px backdrop-blur. CTA gradient `primary`→`primary_container` @ 135°.
- **Breathing Room:** Major container arası 32px+ padding.
- **Asymmetric Layout:** Büyük metrik solda + yoğun tablo sağda = architectural interest.

## Signature Pattern: Monolith Navigation

- Sidebar 280px sabit genişlik
- `secondary` (#435b9f) + `on_secondary_fixed` (#00174a) tonları
- Elevation YOK — solid monolithic block
- Active state "cut-out" — aktif item main content `surface` rengiyle aynı, fiziksel köprü etkisi

## Component Kuralları

- **Primary Button:** Gradient `#b50303`→`#da291c`, beyaz metin, `0.25rem` radius, Manrope 700
- **Secondary Button:** `surface_container_highest` + `on_surface` text
- **Ghost Action:** No background, `primary` text 700 — "Add Row", "Export" in-table
- **Input:** Border YOK. Zemin `surface_container_high`. Focus'ta `surface_container_lowest` + 2px primary ring @ 40% opacity
- **Card dividers:** YASAK. Zebra stripe (`surface` / `surface_container_low`) veya 16-24px whitespace
- **Budget chip (over-budget):** `error_container` zemin + `on_error_container` text

## Don't (Kritik)

- 1px border ile bölümleme
- Standard drop shadow (yalnızca ambient `0 20px 40px rgba(0,35,102,0.06)`)
- Kırmızı dekoratif kullanım (yalnızca primary action + critical status)
- Pure black `#000` (her zaman `#191c1e`)

## Stitch Design System Asset

- Asset ID (canlı): `assets/198b2a38bf384c4b931d15183a332aba` — FinOps Tur projesi (`projects/10132860177847584046`) ile bağlı
- Display name: "Tur Assist — Architectural Precision"
- Font: Manrope (headline + body + label)
- Tokenlar bu dokümana bire bir hizalı (2026-04-17 itibarıyla)

## Uygulama Noktaları

1. **Stitch:** `update_design_system` ile asset token'larını yukarıdaki tabloyla eşle
2. **Tailwind:** `client/tailwind.config.ts` → theme.extend.colors, fontFamily, borderRadius, boxShadow
3. **Global CSS:** `client/src/styles/globals.css` → CSS variable'lar semantic token olarak
4. **Component library:** `client/src/components/ui/` — Button, Input, Card, Chip bu sistemle sıfırdan
