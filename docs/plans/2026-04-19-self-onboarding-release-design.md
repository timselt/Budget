# Self-Onboarding Release — Design Doc

- **Tarih:** 2026-04-19
- **Durum:** Onaylı (brainstorm tamamlandı), implementation plan bekliyor
- **Yazar:** Claude (brainstorming skill) + Timur (karar verici)
- **Bağlam:** Önceki release (Onay Akışı 2-aşamalı) tamamlandıktan sonra "anlatmadan anlaşılması" hedefi için UX katmanı

---

## 1. Problem

Mevcut sistem teknik olarak doğru çalışıyor ama kullanıcı eğitim olmadan ne yapacağını anlamıyor:

- Dashboard "ne yapmalıyım?" cevabı vermiyor — sadece KPI'lar gösteriliyor
- Status etiketleri (`PendingFinance`, `PendingCfo`) teknik dilde, kullanıcıya "ne aşamada?" sorusunu yanıtlamıyor
- Versiyonlar ekranında satır başına çok aksiyon (5 buton) → kullanıcı hangisinin "doğru" olduğuna karar veremiyor
- "Onaya Gönder" pasifse kullanıcı **neden** olduğunu sadece tooltip'ten görüyor — checklist yok
- Aktif sürüm seçildiğinde sadece "düzenlenemez" diyor — "ne yap?" demiyor (revizyon aç önerisi banner'da var ama tek yer)
- 409 / 403 hataları teknik mesajla geliyor, yönlendirici çözüm sunmuyor
- Boş durumlar ("henüz versiyon yok") talimat içermiyor
- Gider Girişi modal flat-form — adım adım rehberlik yok

## 2. Hedef

UX katmanını öyle iyileştir ki: **yeni kullanıcı eğitim almadan giriş yaptığında ilk 30 saniyede ne yapacağını ekranın kendisinden öğrensin.** Backend ve workflow değişmez; sadece görsel ve kopya katmanı.

## 3. Karar Özeti

| Karar | Değer |
|---|---|
| Kapsam | Tüm P1: 9 modül, 1 release |
| Status etiket | Chip resmi (`Reddedildi`) + sıradaki adım eylem-odaklı (`Düzeltmeye Devam Et`) — her ikisi yan yana |
| Görev Merkezi | Frontend derivation (yeni backend endpoint yok) |
| Onay öncesi checklist | Esnek: 1 sert kural + 4 yumuşak uyarı |
| Versiyonlar ekranı | Tek primary aksiyon + ⋯ menü ikincil |
| Revizyon zinciri | Yatay timeline görseli (versions array'inden, lineage backend'i yok) |
| Hata mesajları | `translateApiError()` helper — 409/403/400 kullanıcı diline çevrilir |
| Gider modal | 4 adımlı stepper |
| Mikro-yardım | Her ana ekranda 1 cümle bağlam |

---

## 4. Modül Listesi (9 madde)

### M1 — Status copy katmanı (terminoloji)

`client/src/components/budget-planning/types.ts`'te tek kaynak:

```typescript
export const STATUS_LABELS: Record<BudgetVersionStatus, string> = {
  Draft: 'Taslak',
  PendingFinance: 'Finans Kontrolünde',  // 'Finans Onayında' yerine
  PendingCfo: 'CFO Onayında',
  Active: 'Yürürlükte',
  Rejected: 'Reddedildi',
  Archived: 'Arşiv',
}

export const STATUS_NEXT_ACTIONS: Record<BudgetVersionStatus, string> = {
  Draft: 'Bütçeyi tamamla',
  PendingFinance: 'Finans onayı bekleniyor',
  PendingCfo: 'CFO onayı bekleniyor',
  Active: 'Revizyon aç',
  Rejected: 'Düzeltmeye Devam Et',
  Archived: '—',
}

export function getStatusNextAction(status: string | null | undefined): string
```

Tüm sayfalarda bu sözlük kullanılır — drift önlenir.

### M2 — Görev Merkezi (`<TaskCenter />`)

`DashboardPage`'in üstüne rol-bazlı görev kartı bandı.

**Yeni dosyalar:**
- `client/src/components/dashboard/TaskCenter.tsx` (~150 satır)
- `client/src/components/dashboard/useTaskCenter.ts` (~100 satır)

**Derivation:** mevcut `versions` + `entries` query'lerinden `Task[]` üretir. Yeni network call yok.

**Görev türevi tablosu:**

| Versiyon durumu | Rol | Task title | CTA | Priority |
|---|---|---|---|---|
| Draft, eksik müşteri | Planner+Finance | "{name} — N eksik müşteri" | "Devam Et" | medium |
| Draft, tüm tam | Planner+Finance | "{name} — Onaya gönderilebilir" | "Onaya Gönder" | high |
| Rejected | Planner+Finance | "{name} — Düzeltmeye Devam Et" | "Düzeltmeye Devam Et" | high |
| PendingFinance | FinanceManager | "{name} — Finans onayınızı bekliyor" | "Finans Onayla" | medium |
| PendingCfo | Cfo | "{name} — CFO onayınızı bekliyor" | "Onayla ve Yayına Al" | high |
| Active (yıl içinde Draft yok) | Planner+Finance | "{name} — Yürürlükte. Revize edin." | "Revizyon Aç" | low |

Boş task durumu: "✓ Bugün için bekleyen aksiyonunuz yok. [Bütçe Planlama →]"

CFO ekranında veri girişi task'ları görünmez (rol bazlı sadeleştirme).

### M3 — Versiyonlar: tek ana aksiyon

`BudgetPeriodsPage` tablosunda kolon yapısı:

| Sürüm | Durum | Sıradaki Adım | Ana Aksiyon | ⋯ |
|---|---|---|---|---|

**Tek primary button mantığı (rol-aware):**

| Versiyon durumu | Planner | Finance | CFO | Admin |
|---|---|---|---|---|
| Draft | Devam Et | — | — | Devam Et |
| Rejected | Düzeltmeye Devam Et | — | — | Düzeltmeye Devam Et |
| PendingFinance | — | Finans Onayla | — | Finans Onayla |
| PendingCfo | — | — | Onayla ve Yayına Al | Onayla ve Yayına Al |
| Active | Revizyon Aç | Revizyon Aç | Revizyon Aç | Revizyon Aç |
| Archived | — | — | — | — |

**İkincil aksiyonlar** (Reddet, Arşivle, Detay) → ⋯ üç-nokta popover menüsü.

`Oluşturuldu`, `Aktif?`, `Açıklama` (red sebebi) satır altı hover-expand ile gösterilir.

### M4 — Revizyon Zinciri (`<RevisionTimeline />`)

`BudgetPeriodsPage` üstünde yatay timeline:

```
V3 Arşiv ──→ V4 Arşiv ──→ V5 Arşiv ──→ V6 Yürürlükte ──→ V7 Taslak
⚪          ⚪          ⚪          🟢                  🟡
```

**Veri kaynağı:** seçili yıldaki tüm versiyonlar, `createdAt` artan. Lineage backend alanı yok — sadece kronolojik sıralama.

**Tıklama:** node tıklanırsa altta versiyonlar tablosunda o satıra scroll + 1 sn highlight.

**Mobil:** overflow-x scroll. **Masaüstü:** flex-wrap.

### M5 — Çalışma Bandı (`<WorkContextBar />`)

`BudgetEntryPage` H2 başlığının altına:

**Düzenlenebilir versiyon:**
```
FY 2026  ›  2026 V7 Taslak   [Taslak]   ✏ Düzenleyebilirsiniz
Tamamlanma: ████████░░  4/5 müşteri  ·  TRY  ·  Senaryo: —
```

**Salt-okunur versiyon:**
```
FY 2026  ›  2026 V6 Yürürlükte   [Yürürlükte]   🔒 Salt-okunur
Bu sürümde değişiklik yapılamaz. Düzenlemek için revizyon açın.
[ Revizyon Aç → ]
```

Mevcut filtre kartı bu bandın altına taşınır — kullanıcı önce "neredeyim?" görür, sonra "değiştirebilirim" anlar.

### M6 — Esnek Onay Checklist (`<SubmissionChecklist />`)

`BudgetEntryPage`'de KPI kartlarının altında, müşteri seç bölümünün üstünde collapsible panel.

**Hook:** `useSubmissionChecklist({ customers, entries, expenseEntries, scenarioId })` →

```typescript
interface ChecklistResult {
  items: ChecklistItem[]   // {id, level: 'pass'|'warn'|'fail', message}
  canSubmit: boolean       // tüm fail'ler 0
  hardFailCount: number
  warnCount: number
}
```

**Sert kural (fail) — 1 tane:**
- Tüm aktif müşterilerin **en az 1 BudgetEntry**'si var mı?

**Yumuşak uyarılar (warn) — 4 tane:**
1. Müşterilerde boş ay var mı (yıl içinde tamamen boş)
2. Senaryo seçilmedi mi (`scenarioId == null`)
3. OPEX gider girilmedi mi (`expenseEntries.length === 0`)
4. Müşteride hem GELIR hem HASAR var mı

**Pass göstergeleri (pass):** ✓ N/N müşteri tamamlandı, ✓ N OPEX gider, ✓ Hem gelir hem hasar var.

**Default davranış:**
- `canSubmit && warnCount === 0` → checklist gizli
- `warnCount > 0` veya `hardFailCount > 0` → checklist açık
- Kullanıcı manuel kapatabilir

**Confirm dialog:** `canSubmit && warnCount > 0` → uyarıları listeleyen confirm:

```
"2026 V7 Taslak onaya gönderilecek.

⚠ Uyarılar (göndermeyi engellemez):
   • 3 müşteride boş ay var
   • Senaryo seçilmedi

Devam etmek istiyor musunuz?"

[ Vazgeç ]    [ Yine de Gönder ]
```

### M7 — Boş durumlar öğretici

| Yer | Eski | Yeni |
|---|---|---|
| Yıl yok | "Henüz yıl tanımlı değil." | "**Bütçeye başlamak için yıl ekleyin.** İlk yılı oluşturduktan sonra sürüm açıp tutarlarını girebilirsiniz." + `[+ Yeni Yıl]` CTA |
| Yılda versiyon yok | "Bu yıla henüz versiyon eklenmemiş." | "**2026 için ilk taslağı oluşturun.** Tutarlar bu taslak üzerinde girilir; tamamlanınca onaya gönderilir." + `[+ Yeni Taslak]` |
| Müşteri tablosunda kayıt yok | "Henüz veri yok." | "**Bu kategori için henüz müşteri yok.** Müşteri Yönetimi'nden ekleyebilirsiniz." + link |
| Gider satırı yok | "Bu versiyon için henüz bütçe gider kaydı yok." | "**OPEX kategorileri için henüz gider girilmedi.** İlk girişi 'Yeni Gider' ile başlatın." |
| Onay kuyruğunda satır yok | "Bekleyen onay yok." | "**Şu an onayınızı bekleyen versiyon yok.** Bütçe Planlama'dan yeni bir taslak başlatabilirsiniz." |

### M8 — Kilitli ekran yönlendirmeleri + hata yardımı

**Tüm sayfalarda salt-okunur banner şablonu** (Bütçe Planlama, Gider Girişi, Özel Kalemler, Aktualler, Senaryolar):

```
🔒 {versionName} — Yürürlükte (salt-okunur)
   Bu sürümde değişiklik yapılamaz. Düzenlemek için revizyon açın;
   tüm girişler yeni taslağa kopyalanır.
                                              [Revizyon Aç →]
```

`Archived` versiyon seçilirse: "🗄 Arşiv (geçmiş kayıt) · Sadece okuma. Yeni sürüm için Versiyonlar sekmesine geçin."

**`translateApiError(error, context)` helper:**

| Kaynak | Eski (raw) | Yeni (yönlendirici) |
|---|---|---|
| ExpenseEntry 409 | "Request failed with status code 409" | "Bu versiyon **{statusLabel}** olduğu için gider eklenemez. Düzenlenebilir bir versiyon (Taslak veya Reddedildi) seçin." |
| BudgetEntry 409 | (aynı) | "Bu versiyon yürürlükte. Tutar girmek için revizyon açın → [Revizyon Aç]" |
| 403 forbidden | "İşlem başarısız" | "Bu işlem için **{requiredRole}** rolü gerekiyor. Yöneticinizle iletişime geçin." |
| 400 (state machine) | "InvalidOperationException..." | "Bu versiyon **{currentStatus}**, bu aksiyon sadece **{validStatuses}** durumlarında yapılabilir." |

`client/src/lib/api-error.ts → translateApiError(error, context): string`. Tüm sayfalar mutation `onError`'unda bunu çağırır.

### M9 — Gider Girişi modal: 4 adımlı stepper

`ExpenseEntriesPage` modal yeniden:

```
① Kategori → ② Ay → ③ Tutar → ④ Onay
```

| Adım | Alan | Mikro-yardım |
|---|---|---|
| 1 | Kategori dropdown | "Hangi gider kategorisi için kayıt yapıyorsunuz?" |
| 2 | Ay dropdown 1-12 | "Bu giderin ait olduğu ay." |
| 3 | Tutar + döviz | "Tutar **orijinal döviz** cinsinden. Sistem TL karşılığını otomatik hesaplar." |
| 4 | Özet + opsiyonel not | "Aşağıdaki bilgileri kontrol edin. Kaydet'e basınca versiyona eklenecek." |

**Generic stepper:** `client/src/components/budget-planning/Stepper.tsx` (~50 satır CSS-only Tailwind).

**Kayıt sonrası feedback:** toast (yeni mini-component, `div.fixed.bottom-4.right-4` + 3 sn timer):

```
✓ "PERSONEL — Ocak 2026" gideri eklendi.
   Toplam OPEX bu versiyonda artık 42.000.000 TL.
```

### Ek — Mikro-yardım ekran-başı cümleleri

Her ana ekranın H2 başlığının hemen altına 1 cümle (CSS class `.page-context-hint`):

| Ekran | Mikro-yardım |
|---|---|
| Bütçe Planlama | "Aktif veya taslak bütçeyi müşteri × ay × ürün matrisinde girin. Sadece **Taslak** ve **Reddedildi** sürümler düzenlenebilir." |
| Gider Girişi | "OPEX kategorileri için aylık bütçe gider planı. Tutarlar yıllık toplam KPI'lara dahil olur." |
| Onay Akışı | "Bekleyen onayları yönetin. CFO onayı versiyonu yayına alır ve eski aktifi otomatik arşivler." |
| Versiyonlar (tab) | "Yıl ve sürümleri yönetin. Aynı yıl içinde max 1 yürürlükte + 1 çalışılan taslak olabilir." |
| Sapma Analizi | "Bütçe planı vs gerçekleşenler. Yeşil = pozitif sapma, kırmızı = aşım." |
| Forecast | "Yıl sonuna projeksiyon — gerçekleşen + plan kalanı." |

### Header sadeleştirme — Bütçe Planlama

Mevcut: 3 buton (`Excel İçe Aktar`, `Taslak Kaydet`, `Onaya Gönder`).

Yeni: `Excel İçe Aktar` ⋯ menüsüne taşınır. Header sadeleşir:
```
[ Bütçe Planlama ]    [ Taslak Kaydet ] [ Onaya Gönder → ] [ ⋯ ]
                                                            └─ Excel İçe Aktar
                                                            └─ Geçmişi Göster (P3)
                                                            └─ Dışa Aktar (P3)
```

---

## 5. Etkilenen Kod Alanları

### Yeni dosyalar (8)

| Dosya | Boyut | Görev |
|---|---|---|
| `client/src/components/budget-planning/WorkContextBar.tsx` | ~80 satır | Çalışma bandı (M5) |
| `client/src/components/budget-planning/SubmissionChecklist.tsx` | ~120 satır | Esnek checklist UI (M6) |
| `client/src/components/budget-planning/useSubmissionChecklist.ts` | ~80 satır | Checklist derivation hook (M6) |
| `client/src/components/budget-planning/RevisionTimeline.tsx` | ~70 satır | Versiyon zinciri görseli (M4) |
| `client/src/components/budget-planning/Stepper.tsx` | ~50 satır | Generic 4-adım header (M9) |
| `client/src/components/dashboard/TaskCenter.tsx` | ~150 satır | Görev Merkezi kart bandı (M2) |
| `client/src/components/dashboard/useTaskCenter.ts` | ~100 satır | Görev Merkezi derivation hook (M2) |
| `client/src/lib/api-error.ts` | ~60 satır | `translateApiError()` helper (M8) |

**Toplam:** ~710 satır yeni kod.

### Güncellenecek dosyalar (10)

| Dosya | Değişiklik |
|---|---|
| `client/src/components/budget-planning/types.ts` | `STATUS_NEXT_ACTIONS` map + `getStatusNextAction()` (M1) |
| `client/src/pages/DashboardPage.tsx` | `<TaskCenter />` üst bant (M2) |
| `client/src/pages/BudgetEntryPage.tsx` | `<WorkContextBar />` + `<SubmissionChecklist />` + header sadeleştirme (M5+M6) |
| `client/src/pages/BudgetPeriodsPage.tsx` | `<RevisionTimeline />` üstte; tablo kolon yeniden, tek ana aksiyon, ⋯ menü (M3+M4) |
| `client/src/pages/ApprovalsPage.tsx` | `getStatusNextAction()` kullan, ana aksiyon button label rol-aware düzelt (M1+M3) |
| `client/src/pages/ExpenseEntriesPage.tsx` | Modal stepper refactor + toast (M9) |
| `client/src/pages/ActualsPage.tsx` | Kilitli ekran banner şablonu (M8) |
| `client/src/pages/SpecialItemsPage.tsx` | Kilitli ekran banner şablonu (M8) |
| `client/src/pages/ScenariosPage.tsx` | Kilitli ekran banner şablonu (M8) |
| Tüm sayfalar (~15) | H2 başlık altına `<p className="page-context-hint">` (Ek) |

### Etkilenmeyen alanlar

- **Backend:** hiçbir değişiklik yok
- **DB schema, migration, EF:** dokunulmuyor
- **Auth/permissions:** mevcut policy'ler yeterli
- **TanStack Query keys:** mevcutlar yeniden kullanılır

---

## 6. Test Stratejisi

- **Unit (Vitest):** `useSubmissionChecklist`, `useTaskCenter`, `translateApiError` için ~15 senaryo
- **Visual smoke (Playwright manuel):**
  1. Login → Dashboard → Görev Merkezi görünür
  2. Görev kartına tıkla → Bütçe Planlama'ya gider
  3. Çalışma bandı görünür, checklist warn'ları listeler
  4. Onaya Gönder confirm dialog'unda uyarılar görünür
  5. Versiyonlar tab'ında zincir + tek primary button + ⋯ menü
  6. Active versiyon seç → "Revizyon Aç" CTA
  7. Gider Girişi modal 4 adım
- **Accessibility:** stepper `aria-current="step"`, checklist `role="list"`, toast `role="status"`

---

## 7. Uygulama Sırası (Sprint planı)

| Gün | İş |
|---|---|
| 1 | M1 (status sözlük) + M7 (boş durumlar) + M8 (`translateApiError`) — düşük risk, tüm sayfalara dokunur |
| 2 | M2 (Görev Merkezi) — Dashboard'a yeni bant |
| 3 | M3+M4 (Versiyonlar refactor + zinciri) — embed mod uyumlu |
| 4 | M5+M6 (Çalışma bandı + checklist) — en büyük UI iş |
| 5 | M9 (Gider modal stepper) + final smoke test |

---

## 8. Başarı Kriterleri

- Yeni kullanıcı **eğitim almadan** Dashboard'a girip ilk dakika içinde "ne yapmam gerek?" yanıtını ekrandan alabilir
- "Düzenleyemiyorum" hatasıyla karşılaşan kullanıcı **409** mesajı görmez, doğrudan "Revizyon Aç" CTA'sına yönlenir
- "Onaya Gönder" basmadan önce kullanıcı boş ay ve eksik senaryo gibi yumuşak eksikleri görür ve bilinçli karar verir
- Tüm sayfalarda **aynı status sözlüğü** kullanılır (terminoloji drift'i ortadan kalkar)
- Yeni Gider modal'ı 4 adımda tamamlanır, her adımda kullanıcı ne yaptığını anlar

---

## 9. Kapsam Dışı (P2/P3'e ertelendi)

- Revizyon zinciri için backend lineage alanı (şimdilik versions array sıralaması yeterli)
- Approvals onay-kuyruğu refactor (mevcut hali doğru çalışıyor)
- İlk kullanım rehber balonları (P3)
- Hazır red sebebi şablonları (P3)
- Bağlamsal tooltip'ler her alanda (P3)
- Boş durumlar **kart** yapısına geçiş (sadece copy iyileştirme yapılır, görsel refactor yok)
- Stepper "Hızlı mod" toggle (P3 — bazı kullanıcılar 4 adımı yavaş bulabilir)
