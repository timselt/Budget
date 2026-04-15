# Tasarım Kararı: 8 Açık Karar Dondurma

**Tarih:** 2026-04-15
**Karar Sahibi:** Timur Selçuk Turan
**Statü:** FROZEN — değişiklik için ADR gereklidir
**İlgili Master Spec:** `docs/BUTCE_TAKIP_YAZILIMI.md` Bölüm 12

---

## 1. Bağlam

Master spec v2.0.0 oluşturulduğunda Bölüm 12'de 8 madde "açık karar" olarak işaretlenmişti. 2026-04-15 brainstorming oturumunda her biri tartışıldı, alternatifler değerlendirildi ve karara bağlandı.

---

## 2. Kararlar

### Karar #1 — Excel Import: **Hibrit**

**Seçim:** Tek seferlik C# migration konsolu (tarihsel veri için) + UI'da kalıcı "Aylık Aktüel Yükle" modülü.

**Reddedilen alternatifler:**
- Yalnızca tek seferlik script — ileride muhasebeden gelen aktüelleri yükleyemezdik.
- Kalıcı tam Excel import (her şey dahil) — bütçe versiyonlama ve onay workflow ile çatışırdı; kullanıcı UI'da girip "kaydet" yerine her şeyi Excel'den yükleyebilseydi audit izi bozulurdu.

**Etki:**
- Bütçe girişi her zaman UI üzerinden yapılır (AG-Grid)
- Aylık aktüeller `IErpAdapter.ImportActuals(stream)` üzerinden yüklenir
- Tarihsel veri için ayrı bir `BudgetTracker.Migration` console projesi yaratılır

---

### Karar #2 — FX Kuralı: **Çift Raporlama**

**Seçim:** Tüm tutar tablolarında 4 alan: `amount_original`, `currency_code`, `amount_try_fixed` (yıl başı TCMB), `amount_try_spot` (ay sonu TCMB).

**Reddedilen alternatifler:**
- Yalnızca yıl başı sabit kuru — gerçek nakit akışı yansımazdı, CFO için yetersiz.
- Yalnızca ay sonu spot kuru — varyans analizinde "FX etkisi" ve "operasyonel sapma" karışırdı.

**Etki:**
- `budget_entries`, `actual_entries`, `expense_entries` tablolarına 3 ek kolon
- `fx_rates` tablosu + Hangfire job (TCMB, her gün 15:45 TR)
- Varyans raporları her ikisini de gösterir, kullanıcı toggle ile seçer
- Golden fixture testleri her iki TRY değerini de doğrular

---

### Karar #3 — Gider Sınıflandırması: **Tablo + Tip Enum**

**Seçim:** `expense_categories` tablosu + `classification` CHECK constraint (`TECHNICAL` | `GENERAL` | `FINANCIAL` | `EXTRAORDINARY`).

**Reddedilen alternatifler:**
- Sabit enum (kod içinde hardcoded) — kullanıcı yeni kategori ekleyemezdi.
- Hiyerarşik ağaç + tip override — bu ölçekte gereksiz karmaşıklık, raporlama zorlaşırdı.

**Etki:**
- KPI formülleri: `WHERE classification = 'TECHNICAL'` filtresiyle çalışır
- Seed verisi: 9 kategori (Manus referansından alındı, bkz. ui-ux-entegrasyon-design.md)
- Yeni kategori eklendiğinde admin tip seçer

---

### Karar #4 — Hosting: **Railway**

**Seçim:** Railway (Frankfurt region) — web service + Hangfire worker + PostgreSQL 16.

**Reddedilen alternatifler:**
- Azure Turkey — daha kurumsal ama daha pahalı, daha karmaşık ops.
- On-premise — güçlü BT operasyon ekibi gerektirir, küçük ölçek için orantısız.
- Vercel — .NET çalıştırmaz, eleneme nedeni teknik.
- Türk cloud sağlayıcıları — olgunluk farkı, .NET 9 + PostgreSQL 16 native destek belirsiz.

**KVKK notu:** Kullanıcı netleştirdi: "Bu projede kendi bilgilerimiz var, KVKK ile ilişkili değil." Müşteri verileri kurumsal (şirket müvekkilleri), kişisel veri sadece sistem kullanıcılarına ait (~20 çalışan: ad, e-posta, rol). Bu yurt dışı veri aktarımı için VERBİS'te beyan gerektirir ama yasal engel oluşturmaz.

**Etki:**
- `railway.toml` config dosyası
- Docker image portable — gerekirse Azure Turkey'e taşıma yolu açık
- Otomatik backup, TLS, health check Railway tarafında
- Sentry / Seq monitoring entegrasyonu eklenir

---

### Karar #5 — Auth: **ASP.NET Identity + OpenIddict**

**Seçim:** ASP.NET Core Identity (kullanıcı yönetimi) + OpenIddict (OIDC sunucusu, MIT lisansı).

**Reddedilen alternatifler:**
- Keycloak — ayrı bir servis çalıştırma yükü, küçük kullanıcı sayısı için orantısız.
- Duende IdentityServer — ticari lisans (>1M USD ciro üstü ücretli), Tur Assist Group eşiği aşıyor.
- Azure AD B2C — vendor lock-in, vazgeçildi.

**Etki:**
- Tek process OIDC sunucusu (.NET 9 web service içinde)
- MFA: TOTP authenticator (QR + Google Authenticator)
- AD federasyonu opsiyonel — ileride OpenIddict external provider ile eklenir
- Refresh token rotation, PKCE, authorization code flow

---

### Karar #6 — Veri Grid: **AG-Grid Community (MIT)**

**Seçim:** AG-Grid Community sürümü + range copy-paste için custom clipboard handler.

**Reddedilen alternatifler:**
- AG-Grid Enterprise — ~1000 USD/dev/yıl, range copy-paste için fazla.
- Handsontable — ticari kullanım için lisans gerekir, ~750 USD/dev/yıl.
- TanStack Table + custom — 2-3 sprint ekstra iş yükü.

**Etki:**
- Bütçe Girişi sayfasında 500×15 hücre, sanal scroll, frozen kolonlar
- Zustand store ile lokal değişiklik takibi, "Kaydet" toplu submit
- Custom clipboard: Excel'den range yapıştırma, validasyon, hata raporu

---

### Karar #7 — AI Forecast (P2): **ML.NET SSA + Şema Hazır**

**Seçim:** Microsoft.ML.TimeSeries SSA (Singular Spectrum Analysis). MVP'de `forecast_entries` tablosu ve `/api/v1/forecast` endpoint stub olarak hazır; gövde P2'de doldurulacak.

**Reddedilen alternatifler:**
- Python FastAPI + Prophet/XGBoost — ek microservice, MLOps yükü, P2/P3'e ertelenebilir.
- LLM tabanlı (Claude/GPT) — sayısal tahmin için uygun değil; ileride ayrı "bütçe yorumlama" özelliği olarak değerlendirilebilir.
- Şimdi karar verme — şema uyumluluğu için en azından tablo + endpoint hazır olmalı.

**Etki:**
- `forecast_entries` tablosu master spec §3.2'ye eklendi
- `/api/v1/forecast/{year}` endpoint stub, MVP'de 501 Not Implemented döner
- P2'de tek dosyalık `ForecastService.cs` ile gövde doldurulur
- Açıklanabilir model — regülatör ve CFO için kritik

---

### Karar #8 — ERP Entegrasyonu (P2): **Adapter Pattern, MVP'de CSV**

**Seçim:** `IErpAdapter` interface + MVP'de `CsvFileAdapter`. P2'de `LogoAdapter` (mevcut ERP: Logo Tiger).

**Reddedilen alternatifler:**
- MVP'de doğrudan Logo Tiger entegrasyonu — henüz gerek yok, kullanıcı "şimdilik entegrasyon yapmayalım" dedi.
- Hiç adapter yapma — ileride entegrasyon eklemek için tüm import modülünü yeniden yazmak gerekirdi.

**Etki:**
- `IErpAdapter` interface: `ImportActuals(Stream)`, `GetChartOfAccounts()`, `GetCustomers()`
- MVP somut sınıf: `CsvFileAdapter` — Karar #1 hibrit import bunu kullanır
- P2 somut sınıf: `LogoAdapter` — Logo Tiger SQL Server tablolarına bağlanır veya Logo Connect REST API
- DI üzerinden adapter seçimi: `appsettings.json` `Erp:Adapter` config

---

## 3. Karar Matrisi Özeti

| # | Konu | Karar | P0/P1/P2 |
|---|------|-------|----------|
| 1 | Excel import | Hibrit | P0 |
| 2 | FX kuralı | Çift raporlama | P0 |
| 3 | Gider sınıflandırma | Tablo + tip enum | P0 |
| 4 | Hosting | Railway | P0 |
| 5 | Auth | ASP.NET Identity + OpenIddict | P0 |
| 6 | Veri grid | AG-Grid Community | P0 |
| 7 | AI forecast | ML.NET SSA + şema hazır | P0 stub, P2 gövde |
| 8 | ERP | Adapter + CSV | P0 adapter, P2 Logo |

---

## 4. Onay

- ✅ Kullanıcı (Timur Selçuk Turan) — 2026-04-15
- ✅ Master spec Bölüm 12 "DONDURULDU" işaretlendi
- ✅ Şema değişiklikleri §3.2'ye işlendi (FX kolonları, forecast_entries, seed)

---

## 5. Sonraki Adım

`/plan` skill'i ile dondurulmuş kararlara dayalı **15 stage'lik (S1–S15) implementation plan** zaten oluşturuldu. Bir sonraki adım:

- **S1:** `BudgetTracker.sln` oluştur, Clean Architecture klasör yapısı, `docker-compose.dev.yml` (Postgres 16), `.gitignore`, `docs/architecture.md` ADR-0001, `git init`
- Dependency-ordered ilerleme: S1 → S2 → S3 → S5 → S7 → S11 → S14 (kritik yol)
