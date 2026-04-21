# Muhasebe Seansı Kararları — 2026-04-17

> **2026-04-21 notu:** Bu doküman içinde geçen Shadow Run (F8) + F9 Excel Emekliliği referansları artık geçerli değil; **shadow run planı 2026-04-21'de iptal edildi**. Belgenin iş kararları (GENERAL/TECHNICAL sınıflandırmaları, SGK Teşvik, konsantrasyon eşikleri) hâlâ geçerli; sadece "shadow run'da doğrulanacak" cümleleri uygulanmayacak.

> **Bu doküman `docs/accounting-session-prep.md` şablonunun doldurulmuş halidir.** CLAUDE.md §Açık Doğrulama Bekleyen Maddeler #1–#4'ün resmi kapanış kaydıdır.

**Katılımcılar:** Timur Selçuk Turan (proje sahibi), muhasebe ekibi  
**Süre:** ~1 saat  
**Tarih:** 2026-04-17

---

## Karar Özeti

| # | Madde | Karar | Kod Etkisi |
|---|---|---|---|
| 1 | Holding Giderleri sınıflandırması | **GENERAL** | Mevcut seed korundu — migration yok |
| 2 | Amortisman sınıflandırması | **TECHNICAL** (teyit) | Mevcut seed korundu — migration yok |
| 3 | SGK Teşvik operasyonel model | **Şirket geneli tek satır, tahakkuk bazlı** | Deploy sonrası muhasebe manuel müşteri tanımlar |
| 4 | Müşteri konsantrasyon eşikleri | **%30 uyarı / %50 kritik** (öneri kabul) | `ConcentrationThresholds` sabit eklendi |

---

## Madde 1 — Holding Giderleri → GENERAL

**Karar:** Holding giderleri Şirket Genel Giderleri (`GENERAL`) altında sınıflanacak.

**Gerekçe:** Muhasebe ekibi mevcut Excel şablonunda holding giderlerini genel yönetim maliyetleri başlığında raporluyor; olağandışı gider değil, düzenli operasyonel tüketim. P&L'de EBITDA'nın üstüne çıkar.

**Kod etkisi:** `InitialSchema` migration §3.2 SEED DATA'da `HOLDING → GENERAL` zaten kayıtlı. Değişiklik yok.

---

## Madde 2 — Amortisman → TECHNICAL

**Karar:** Amortisman giderleri Teknik Giderler (`TECHNICAL`) olarak kalacak.

**Gerekçe:** Amortismanın büyük kısmı operasyonel/teknik ekipman (filo, IT donanım) — doğrudan servis üretimine bağlı. Teknik Marj hesaplamasına dahil edilmesi muhasebe ekibinin mevcut raporlamasıyla örtüşüyor.

**Kod etkisi:** `InitialSchema` §3.2 `AMORTISMAN → TECHNICAL` mevcut. Değişiklik yok.

---

## Madde 3 — SGK Teşvik Operasyonel Model

**Karar:**
- **Hangi müşteriler:** Müşteri bazında değil, **şirket geneli tek satır** olarak işlenecek.
- **Tahakkuk / tahsilat:** **Tahakkuk bazlı** (fatura/tahakkuk oluştuğunda tanınır, tahsilat zamanı beklenmez).
- **Karşı taraf:** Doğrudan SGK; muhasebe ekibi manuel olarak aylık tahakkuk girecek.

**Operasyonel akış:**
1. Prod deploy sonrası muhasebe ekibi bir tek müşteri kaydı oluşturur: `customer_code = 'SGK-TESVIK'`, `name = 'SGK Teşvik (Şirket Geneli)'`, `segment = SGK_TESVIK`.
2. Aylık bütçe ve gerçekleşen girişlerde bu tek müşteri altında tahakkuk tutarı kaydedilir.
3. KPI motoru bu girişi diğer gelirlerle toplar; segment-bazlı analizde `SGK_TESVIK` kendi sütununda raporlanır.

**Kod etkisi:** Migration gerekmez — mevcut `segments` seed'inde `SGK_TESVIK` var, `customers` tablosu kullanıcı-doldurulu. Master data init F7 deploy sonrası muhasebe ekibi tarafından yapılacak.

**Alternatif reddedildi:** Müşteri bazında kırılım — SGK Teşvik reel bir karşı taraf değil, alt-müşteri ayrımı muhasebede gerek yok.

---

## Madde 4 — Müşteri Konsantrasyon Eşikleri

**Karar:** **%30 uyarı / %50 kritik** (öneri kabul edildi).

**Gerekçe:** Muhasebe ekibinin Excel heuristiği ile örtüşüyor — tek müşteri %30'u aşınca "portföy dengesiz" uyarısı; %50 üstü "iş riski, yönetime bildirilsin" seviyesi. HHI opsiyonel olarak dashboardda gösterilir ancak hard threshold yok (muhasebe ekibi per-customer % görünümünü tercih etti).

**Kod etkisi:**
- `src/BudgetTracker.Application/Calculations/ConcentrationThresholds.cs` — yeni sabit sınıf:
  ```csharp
  public const decimal WarningShare = 0.30m;
  public const decimal CriticalShare = 0.50m;
  ```
- Dashboard + variance UI bu sabitleri referans alacak (F4 Part 2 frontend consumer'ları F7+ sonrası bağlanır).
- Kritik eşik aşıldığında `CUSTOMER_CONCENTRATION_CRITICAL` audit event yazılması F8 shadow run sırasında eklenir (muhasebe ekibi ilk 2 hafta Excel ile karşılaştırırken bu alert'ın noise seviyesini ölçecek).

---

## Shadow Run (F8) Beklentisi

Bu 4 madde shadow run Excel-vs-system karşılaştırmasının kritik fark noktaları. Haftalık `docs/shadow-run-report-YYYY-WW.md` raporlarında şu satırlar her zaman açıkça doğrulanacak:

- **[1]** Holding giderleri GENERAL altında toplanıyor → Excel GENEL YÖNETİM satırı ile eşleşmeli.
- **[2]** Amortisman TECHNICAL altında → Excel Teknik Marj hesabında aynı tutar.
- **[3]** SGK Teşvik tek satır → Excel SGK Teşvik satırı ile tutar eşleşmesi.
- **[4]** Konsantrasyon uyarıları Excel'de elle işaretli kalemlerle örtüşüyor.

2 hafta sıfır fark → F9 Excel Emekliliği başlar.

---

## Uygulama Adımları (Timur — bu seans sonrası)

- [x] Karar dokümanı (`docs/accounting-session-decisions-2026-04-17.md`) commit'e taşındı.
- [x] `ConcentrationThresholds.cs` sabit sınıfı eklendi.
- [x] CLAUDE.md §Açık Doğrulama Bekleyen Maddeler tüm 4 satır "Kapandı" bölümüne taşındı.
- [ ] F7 deploy branch'i açılır (`feat/f7-production-deploy`).
- [ ] Prod deploy sonrası muhasebe ekibi SGK_TESVIK müşteri kaydını oluşturur (Madde 3).
- [ ] F8 shadow run başlangıcında bu 4 madde baseline karşılaştırma tablosunda kilitli referans olarak kullanılır.
