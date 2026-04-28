# Bütçe Planlama UX Düzeltmeleri — Tasarım

**Tarih:** 2026-04-28
**Kaynak:** `admin@tag.local` test oturumu (PR #49 — `claude/check-project-connection-wepHp`).
**Brainstorm referansı:** `.superpowers/brainstorm/75949-1777355408/content/`

## 1. Bağlam ve sebep

Bütçe planlama akışı uçtan uca test edilirken Bütçe Planlama ekranında testin devam etmesini engelleyen dört UX sorunu tespit edildi. Sorunlar tek tek küçük gibi görünüyor; ama bir araya geldiklerinde "ben bu ekranda ne yapacağım" sorusunu doğuruyor ve test ekibinin pilot kapsamı (89 müşteri × ~20 ürün) doldurmasını imkânsız hâle getiriyor. Bu spec, dört sorunu birlikte çözmek için yapılacak tasarım değişikliklerini tanımlar.

Düzeltmeler **ayrı bir branch ve ayrı bir PR** ile yürütülür. PR #49 (modal + token refactor) bu değişikliklerden etkilenmez.

## 2. Kapsam

Spec'in kapsamı:

- **Madde 1:** Bütçe hücresine ne girileceğinin netleştirilmesi (adet + tutar bağımsız alan)
- **Madde 2 + 3:** Hiyerarşik Planlama → Müşteri Odaklı Giriş tab'ları arası state propagation (pre-select)
- **Madde 4:** GELİR / HASAR satırlarının tek ürün satırı altında alt rozet olarak gösterilmesi

Kapsam dışı (sonraki turlar için `docs/backlog/feature-requests.md`'de takipte):

- Toplu sözleşme oluşturma (89 müşteri × 20 ürün manuel sorunu)
- Bütçe Planlama > Versiyonlar ekranındaki "Yeni Yıl / Yeni Versiyon / Yeni Taslak" buton karmaşası
- Birim fiyat ile bütçe arasında otomatik hesaplama (kullanıcı talebi: kaldırıldı)

## 3. Tasarım kararları

### 3.1 Madde 1 — Bütçe hücresi (Tasarım C-revize-v3)

**Mevcut davranış:** Hücreye sadece tutar girilir; field adı `amount` / `amountOriginal`. Birim fiyat yok, etiket yok, kullanıcı ne girdiğini bilmez.

**Yeni tasarım:**

- Her hücrede **dikey iki input** alt alta: üst input = adet, alt input = tutar
- Alanların yanında küçük gri etiket: `adet` ve `tutar`
- Boş input'larda placeholder olarak `"Adet"` / `"Tutar"` görünür
- **İki alan bağımsız** — biri girilince diğeri otomatik dolmaz
- **En az birinin dolu olması yeterli** — ikisi de boş hücre kayda gitmez
- Sözleşmedeki birim fiyat ekranda görünmez. Kullanıcı tutarı kafadan kendisi hesaplayıp girer (ya da sadece tutarı bilmeden adetle ilerler)
- Ürün başlığı satırın başında bir kez yazılır: `Yol Yardım` + altında monospace kontrat kodu (`TA1SGK0B…V1`)

**Veri modeli etkisi:**

- Backend `BudgetEntry` entity'sinde `Quantity int?` alanı **zaten mevcut** (`BudgetEntry.cs:34`). DB kolonu da hâlihazırda var.
- Ancak alan API katmanına bağlanmamış: `CreateBudgetEntryRequest` ve `BudgetEntryUpsert` DTO'larında Quantity yok. Spec ile pipeline'a bağlanır.
- Mevcut `AmountOriginal` korunur (geriye dönük uyumluluk; mevcut kayıtlar `Quantity = NULL` ile çalışmaya devam eder)
- Kayıt validasyonu: `Quantity != null OR AmountOriginal != null` (ikisi de boş → kayıt silinir / oluşturulmaz)
- **Migration gerek yok.** Yalnızca BudgetEntryConfiguration'ın kolon haritasını içerdiği doğrulanır.
- Quantity türü `int?` (tam sayı). Kullanıcının girdiği tutar / birim fiyat oranı kesirli çıkarsa adet alanı `null` bırakılır, yalnızca tutar saklanır.

### 3.2 Madde 2 + 3 — Tab geçişinde pre-select

**Mevcut davranış:**

- Hiyerarşik Planlama tab'ında müşteriye tıklanınca tab kendiliğinden Müşteri Odaklı Giriş'e geçer
- Müşteri Odaklı Giriş tab'ında müşteri listesi tekrar gösterilir; ürünlere ulaşmak için ikinci kez tıklamak gerekir
- Sonuç: aynı müşteri iki kere seçilir

**Yeni tasarım:**

- Tab yapısı korunur (Hiyerarşik / Müşteri Odaklı / Versiyonlar — üç tab)
- Hiyerarşik'te bir müşteriye tıklayınca tab Müşteri Odaklı'ya geçmeye devam eder (mevcut davranış)
- **Müşteri Odaklı tab açıldığında:**
  - Hiyerarşik'te seçilmiş `customerId` ve `segmentId` pre-select edilmiş olarak gelir
  - Müşteri seçim listesi atlanır; doğrudan o müşterinin **ürün matrisi** açılır
  - Üstte küçük bir "Müşteri Değiştir" butonu kalır (kullanıcı isterse listeye dönebilir)

**State akışı:**

`BudgetEntryPage` → `customerModeSegmentId` ve `customerModeCustomerId` state'lerine Hiyerarşik tab'daki seçim aktarılır. `useEffect` ile mode değiştiğinde otomatik propagation. Hâlihazırdaki state isimlendirmesi yeterli; yeni state eklenmez.

### 3.3 Madde 4 — GELİR / HASAR alt rozet düzeni (Tasarım B)

**Mevcut davranış:**

- "GELİR" ve "HASAR" iki ayrı section header
- Her section'ın altında ürün satırı tekrar yazılır (kontrat kodu iki yerde)
- Aynı ürünün gelir ve hasar girişlerini eşlemek için iki bölümü gözle takip etmek gerekir
- "Bu satırda gelir mi hasar mı yazıyorum" görsel olarak hemen seçilmez

**Yeni tasarım:**

- **Ürün her satırın başında bir kez yazılır** (kontrat kodu tekrar yok)
- Hücrelerin **solunda** küçük rozet etiketler:
  - `Gelir` rozeti (kırmızı/coral renk)
  - `Hasar` rozeti (sarı/turuncu renk)
- Aynı ürün için Gelir ve Hasar **iki yatay satır** olur; ürün başlığı sol kolonda `rowspan=2` ile iki satıra birleşik yayılır → kontrat kodu tekrar etmez
- **Hasar satırında adet alanı yok** — sadece tutar (her hasarın tutarı farklı, "kaç hasar" anlamlı değil; kullanıcı operasyonel maliyeti tutar olarak girer)
- Toplam ve formül satırları aşağıda kalır:
  - `Gelir Toplam`
  - `Hasar Toplam`
  - `Teknik Marj (Gelir − Hasar)` — formülü parantez içinde yazılı
  - `Loss Ratio (Hasar / Gelir)` — formülü parantez içinde yazılı

**Veri modeli etkisi:**

- Yok. Backend zaten `BudgetEntry.entryType` (örn. REVENUE / LOSS) ile ayrımı tutuyor; sadece UI grupla şekli değişiyor.

## 4. Mimari ve teknik etki

### Frontend (etkilenen dosyalar)

- `client/src/pages/BudgetEntryPage.tsx` — state propagation, mode geçiş davranışı
- `client/src/components/budget-planning/BudgetCustomerGrid.tsx` — yeni hücre düzeni (adet + tutar input'ları, Gelir/Hasar rozetleri)
- `client/src/components/budget-planning/BudgetTreePanel.tsx` — müşteri seçimi pre-select sinyali
- Yeni paylaşılan komponent: `client/src/components/budget-planning/BudgetCellInputs.tsx` — adet + tutar dikey input bileşeni (test edilebilir tek birim)

### Backend (etkilenen dosyalar)

> Entity ve DB kolonu zaten mevcut. Bu liste yalnızca pipeline'a bağlama işlerini kapsar.

- `src/BudgetTracker.Application/BudgetEntries/CreateBudgetEntryRequest.cs` — `int? Quantity` alanı eklenir
- `src/BudgetTracker.Application/BudgetEntries/BudgetEntryUpsert.cs` — `int? Quantity` alanı eklenir
- `src/BudgetTracker.Application/BudgetEntries/BulkUpdateBudgetEntriesRequest.cs` — `Quantity` desteği (her entry için)
- `src/BudgetTracker.Application/BudgetEntries/CreateBudgetEntryRequestValidator.cs` — `Quantity != null || AmountOriginal != null` validasyon kuralı
- `src/BudgetTracker.Application/BudgetEntries/IBudgetEntryService.cs` ve implementation — upsert imzasına `quantity` geçirilir
- `src/BudgetTracker.Application/BudgetEntries/BudgetEntryDto.cs` — `Quantity` zaten dönüyor mu doğrulanır; yoksa eklenir
- `src/BudgetTracker.Api/Controllers/BudgetVersionsController.cs` — POST/PUT akışlarında Quantity'nin doğru şekilde okunup yazıldığı doğrulanır
- `src/BudgetTracker.Infrastructure/Persistence/Configurations/BudgetEntryConfiguration.cs` — kolon haritasının zaten doğru olduğu doğrulanır

### Veri tabanı

- `budget_entries.quantity` kolonu **zaten mevcut**. Yeni migration gerekmez.
- Geriye dönük uyumluluk: mevcut kayıtlarda `quantity` NULL kalır; UI bu durumu "tutar girilmiş, adet bilinmiyor" olarak gösterir

## 5. Test planı

### Birim test (vitest)

- `BudgetCellInputs.test.tsx` — yeni hücre bileşeni: adet, tutar, ikisi, hiçbiri durumları
- `BudgetEntryPage.test.tsx` — Hiyerarşik → Müşteri Odaklı pre-select davranışı

### Backend testleri

- `CreateBudgetEntryRequestValidatorTests.cs` — `quantity` NULL, `amount` NULL, ikisi de NULL durumları (son durumda validasyon hatası)
- `BudgetEntryServiceTests.cs` — Upsert akışında Quantity'nin doğru şekilde saklandığını doğrular
- Mevcut entry testleri — Quantity'siz oluşturulan kayıtların hâlâ çalıştığını doğrular (regresyon)

### Manuel kabul testi (kullanıcının tekrar yapacağı senaryo)

1. `admin@tag.local` ile login
2. Sompo Sigorta için Yol Yardım sözleşmesi var (zaten oluşturuldu)
3. Bütçe Planlama → Hiyerarşik tab → Sompo'ya tıkla → Müşteri Odaklı'ya geç → **müşteri zaten seçili olmalı, ürün matrisi açık olmalı**
4. Yol Yardım için Ocak ayında **adet = 10** gir → kaydet
5. Şubat ayında **tutar = 5500** gir → kaydet
6. Mart ayında **ikisini de boş bırak** → kayda gitmediğini doğrula
7. HASAR rozetli satırda Ocak için **tutar = 3200** gir → kaydet
8. Teknik Marj satırında Ocak için **2300** görünmeli; Loss Ratio %58,2 olmalı

## 6. Bilinen sınırlar ve sonraki iş

- **Promosyon / sapma vakası:** Adet × ortalama fiyat ≠ tutar olduğunda kullanıcı "uyarı" görmüyor. İlk versiyon için bu kabul; ileride raporlarda anomali tespiti.
- **Hasar adet alanı:** Şu an UI'da yok. Eğer iş tarafı "kaç hasar olacak" istatistiği isterse ileri sürümde eklenebilir.
- **Sözleşmenin birim fiyatı UI'dan kalktı:** Kullanıcı isterse "sözleşme detayı" panelinde ya da hover/tooltip ile geri getirilebilir — şu anki versiyonda yok.

## 7. Açık konular

Yok. Tüm tasarım kararları brainstorm sırasında kesinleşti.
