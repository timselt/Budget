# Onay Akışı Yeniden Tasarımı — Design Doc

- **Tarih:** 2026-04-19
- **Durum:** Onaylı (brainstorm tamamlandı), implementation plan bekliyor
- **Yazar:** Claude (brainstorming skill) + Timur (karar verici)
- **İlişkili ADR:** (implementation sonrası açılacak — ADR-00xx)

---

## 1. Problem

Mevcut onay akışı kullanıcı tarafında karışık algılanıyor:

- Aşama sayısı fazla: 5 onay adımı (`SUBMITTED → DEPT_APPROVED → FINANCE_APPROVED → CFO_APPROVED → ACTIVE`)
- Müşteri bazlı ilerleme görünmüyor: bir versiyonda 10 müşteriden kaçının dolu olduğu UI'da belirsiz
- Versiyon kavramı karışık: `V1 Draft`, `V2 Draft`, `V3 Draft` aynı anda yaşayabiliyor; hangisi çalışılan, hangisi eski belirsiz
- Terminoloji tutarsız: "Gönderildi / Dept Onaylı / CFO Onaylı / Aktif" set'inde fiil + sıfat karışımı
- İki aksiyon redundancy: `CFO Onayla` sonrası ayrı `Aktifleştir` adımı

## 2. Hedef

Onay akışını **iki onay aşamasıyla** (Finans → CFO) sadeleştirmek, müşteri girişlerinin ilerleme durumunu açıkça göstermek, yıl başına versiyon sayısını yönetilebilir tutmak, terminolojiyi tutarlı hâle getirmek.

## 3. Karar Özeti

| Karar | Değer |
|---|---|
| Onay aşama sayısı | **2** (Finans + CFO) |
| Durum kodları (backend enum) | `Draft`, `PendingFinance`, `PendingCfo`, `Active`, `Rejected`, `Archived` |
| Türkçe etiketler | Taslak, Finans Onayında, CFO Onayında, Yürürlükte, Reddedildi, Arşiv |
| CFO aksiyonu | **"Onayla ve Yayına Al"** (tek tuş, atomic) |
| Reddet sonrası | `Rejected`'ta kalır; "Tekrar Gönder" direkt Finans'a atar |
| Müşteri tamamlandı kriteri | En az 1 `BudgetEntry` (GELIR veya HASAR) |
| Onaya Gönder butonu | Tüm müşteriler tamamlanana kadar **kilitli** |
| İlerleme göstergesi | Üst banner + müşteri dropdown chip |
| Versiyon politikası | Yıl başına max 1 `Active` + max 1 çalışılan taslak |
| Yeni revizyon taslağı | Aktif versiyonun entry'leri kopyalanır |
| Aktifleştirme | Atomic: yeni → `Active`, eski → `Archived` |

## 4. State Machine

```
          ┌── Onaya Gönder ──┐         ┌── Finans Onayla ──┐        ┌── CFO Onayla & Yayına Al ──┐
          │                  ▼         │                   ▼        │                             ▼
┌────────────┐        ┌──────────────────┐          ┌───────────────┐                    ┌──────────────┐
│  Taslak    │        │ Finans Onayında  │          │ CFO Onayında  │                    │  Yürürlükte  │
└────────────┘        └──────────────────┘          └───────────────┘                    └──────────────┘
      ▲                        │                            │                                   │
      │                        │ Reddet (sebep zorunlu)     │ Reddet (sebep zorunlu)           │ Arşivle
      │                        ▼                            ▼                                   ▼
      │                  ┌──────────────────────────────────┐                           ┌──────────────┐
      └───── (düzeltme ──│           Reddedildi             │                           │    Arşiv     │
             sonrası)    └──────────────────────────────────┘                           └──────────────┘
             (Tekrar Gönder)
```

### Geçiş Tablosu

| Mevcut durum | İzin verilen geçiş | Aksiyon butonu | Rol gereksinimi |
|---|---|---|---|
| `Draft` | → `PendingFinance` | "Onaya Gönder" | Planlamacı / Admin |
| `PendingFinance` | → `PendingCfo` | "Finans Onayla" | FinanceManager / Admin |
| `PendingFinance` | → `Rejected` | "Reddet" | FinanceManager / Admin |
| `PendingCfo` | → `Active` (+ eski Active → Archived, atomic) | "Onayla ve Yayına Al" | Cfo / Admin |
| `PendingCfo` | → `Rejected` | "Reddet" | Cfo / Admin |
| `Rejected` | → `PendingFinance` | "Tekrar Gönder" | Planlamacı / Admin |
| `Active` | → `Archived` | "Arşivle" | Admin |

### Önemli davranışlar

- **Dept Onayı kaldırıldı** — 5 aşama → 2 aşama
- **CFO Onay + Aktifleştir tek atomic aksiyon** — state machine'de `Active`'e direkt geçiş
- **Reddedilen taslak**: `Rejected` durumunda kalır; kullanıcı düzeltip "Tekrar Gönder" ile direkt `PendingFinance`'a atar (tekrar `Draft`'a dönmez)
- **"Onayla ve Yayına Al" atomic**: tek transaction'da (i) yeni versiyon `Active`, (ii) varsa eski `Active` versiyon `Archived`, (iii) `IsActive` bayrağı yeni versiyona geçer

## 5. UI/UX

### 5.1 Durum etiketleri ve chip renkleri

| Backend kod | UI etiketi | Chip class |
|---|---|---|
| `Draft` | Taslak | `chip-neutral` |
| `PendingFinance` | Finans Onayında | `chip-warning` |
| `PendingCfo` | CFO Onayında | `chip-warning` |
| `Active` | Yürürlükte | `chip-success` |
| `Rejected` | Reddedildi | `chip-error` |
| `Archived` | Arşiv | `chip-neutral` (soluk) |

### 5.2 Bütçe Planlama — üst ilerleme banner'ı

Sayfa başlığının altı, KPI kartlarının üstü:

**Eksik müşteri varken:**
```
2026 V2 Taslak                                       [Taslak]
Müşteri girişi: ████████░░░░░░░░  5/10 müşteri tamamlandı
5 müşteride henüz tutar girilmedi.    [ Onaya Gönder (5 eksik) — kilitli ]
```

**Tüm müşteriler tamamsa:**
```
2026 V2 Taslak                                       [Taslak]
Müşteri girişi: ████████████████  10/10 müşteri tamamlandı ✓
                                                   [ Onaya Gönder → ]
```

**Active versiyon açıkken (revize davet):**
```
⚠ 2026 V1 Yürürlükte — salt-okunur
Revize etmek için yeni bir revizyon taslağı açabilirsin.
                                              [ Revizyon Taslağı Oluştur ]
```

### 5.3 Müşteri dropdown chip'i

Müşteri Odaklı Giriş sekmesinde müşteri seçim dropdown'unda her müşteri satırının yanında durum chip'i:
- 🟢 Tamamlandı (bu versiyonda en az 1 `BudgetEntry` var)
- ⚪ Boş (hiç entry yok)

### 5.4 Onay Akışı sayfası

Üç bölüm (rol-filtreli):
- **Bekleyen Onaylar** — `PendingFinance`, `PendingCfo`, `Rejected`
- **Yürürlükteki Versiyonlar** — `Active`
- **Arşiv** — `Archived` (collapsible, default kapalı)

Aksiyon sütunu kullanıcı rolüne göre:
- FinanceManager + `PendingFinance` → "Finans Onayla", "Reddet"
- Cfo + `PendingCfo` → **"Onayla ve Yayına Al"**, "Reddet"
- Planlamacı + `Rejected` → "Tekrar Gönder"
- Admin → her aşamada tüm butonlar
- Yetkisi olmayan → "— Yetkisiz —" chip

Basit filtre: **Yıl** (FY 2025 / FY 2026) + **Sadece benimle ilgili olanlar** toggle.

## 6. Versiyon Politikası: Revizyon Zinciri

### 6.1 Yıl başına invariant

| Durum | Max |
|---|---|
| `Active` | 1 |
| `Draft` / `PendingFinance` / `PendingCfo` / `Rejected` (toplam) | 1 |
| `Archived` | sınırsız |

DB seviyesinde iki **partial unique index** ile zorlanır:

```sql
CREATE UNIQUE INDEX uq_year_active
  ON budget_versions (budget_year_id, company_id)
  WHERE status = 'Active';

CREATE UNIQUE INDEX uq_year_inprogress
  ON budget_versions (budget_year_id, company_id)
  WHERE status IN ('Draft', 'PendingFinance', 'PendingCfo', 'Rejected');
```

### 6.2 Yeni taslak açma noktaları

1. **İlk planlama (yılda versiyon yok):** Bütçe Versiyonları sayfasında "Yeni Taslak Oluştur" butonu → boş `Draft`. İsim: `{Yıl} V1 Taslak`.
2. **Revize (Active var, çalışılan taslak yok):** Bütçe Planlama sayfasında banner üzerinden "Revizyon Taslağı Oluştur". İsim: `{Yıl} V{n+1} Taslak`. Aktif versiyonun tüm `BudgetEntry`'leri yeni taslağa kopyalanır.
3. **Reddedilen taslağı düzeltme:** "Tekrar Gönder" aksiyonu, yeni versiyon yaratmadan mevcut `Rejected`'ı `PendingFinance`'a atar.

### 6.3 Aktifleştirme (atomic)

CFO "Onayla ve Yayına Al" tek transaction'da:
1. Yeni versiyon: `PendingCfo` → `Active`
2. Varsa eski `Active` versiyon: `Active` → `Archived`
3. `IsActive` bayrağı yeni versiyona geçer

## 7. Backend Tasarımı

### 7.1 `BudgetVersionStatus` enum (yeni)

```csharp
public enum BudgetVersionStatus
{
    Draft = 0,
    PendingFinance = 1,
    PendingCfo = 2,
    Active = 3,
    Rejected = 4,
    Archived = 5,
}
```

Eski değerler (`Submitted`, `DeptApproved`, `FinanceApproved`, `CfoApproved`) **kaldırılır**.

### 7.2 `BudgetVersion` domain metotları (yeni set)

```csharp
public void Submit(int actorUserId);             // Draft | Rejected → PendingFinance
public void ApproveByFinance(int actorUserId);   // PendingFinance → PendingCfo
public void ApproveByCfoAndActivate(
    int actorUserId,
    BudgetVersion? currentActive);               // PendingCfo → Active; eski Active → Archived
public void Reject(int actorUserId, string reason); // PendingFinance | PendingCfo → Rejected
public void Archive(int actorUserId);            // Active → Archived
```

`ApproveByDepartment` ve ayrı `Activate` **kalkar**.

### 7.3 API endpoint'leri

```
POST /budget/versions/{id}/submit               # Draft|Rejected → PendingFinance
POST /budget/versions/{id}/approve-finance      # PendingFinance → PendingCfo
POST /budget/versions/{id}/approve-cfo-activate # PendingCfo → Active + eski Active Archived
POST /budget/versions/{id}/reject               # {reason} body
POST /budget/versions/{id}/archive              # Active → Archived
POST /budget/versions/{id}/create-revision      # Active → yeni Draft (entry kopyasıyla)
```

Eski `approve/dept`, `approve/finance` (farklı davranış), `approve/cfo`, `activate` endpoint'leri kaldırılır.

### 7.4 Authorization

- `Submit`, `Reject` (Rejected iken), `CreateRevision` → `RequireFinanceRole` (Planlamacı/Finans/Admin)
- `ApproveByFinance`, `Reject` (PendingFinance iken) → `FinanceManager` (veya Admin)
- `ApproveByCfoAndActivate`, `Reject` (PendingCfo iken), `Archive` → `Cfo` (veya Admin)

### 7.5 Test planı (unit)

Mevcut `BudgetVersionStateMachineTests` yeniden yazılır. Yeni senaryolar:
- `Submit_FromDraft_GoesToPendingFinance`
- `Submit_FromRejected_GoesToPendingFinanceAndClearsReason`
- `ApproveByFinance_FromPendingFinance_GoesToPendingCfo`
- `ApproveByFinance_FromNonPendingFinance_Throws`
- `ApproveByCfoAndActivate_FromPendingCfo_MarksActive`
- `ApproveByCfoAndActivate_WithExistingActive_ArchivesOld`
- `Reject_FromPendingFinance_GoesToRejected`
- `Reject_FromPendingCfo_GoesToRejected`
- `Reject_FromDraft_Throws`
- `Reject_WithoutReason_Throws`
- `Archive_FromActive_GoesToArchived`
- `CreateRevision_CopiesEntriesFromActive`

Coverage hedefi 80%+ (domain entity için ~100% beklenir).

## 8. Frontend Tasarımı

### 8.1 Yeni dosyalar / güncellenecekler

- `client/src/components/budget-planning/types.ts`
  - `EDITABLE_STATUSES` → `['Draft', 'Rejected']`
  - `STATUS_LABELS: Record<string, string>` — TR etiket map
  - `STATUS_CHIP_CLASS: Record<string, string>` — chip class map

- `client/src/components/budget-planning/api.ts`
  - `approveFinance(versionId)`
  - `approveCfoAndActivate(versionId)`
  - `reject(versionId, reason)`
  - `resubmit(versionId)` (yeni transition hedefi `PendingFinance`)
  - `createRevision(versionId)` (Active → yeni Draft)
  - Eski `submitVersion` davranışı bu yeni set'e bağlanır

- `client/src/pages/BudgetEntryPage.tsx`
  - Üst ilerleme banner'ı (müşteri tamamlandı sayısı + ilerleme çubuğu + kilitli/açık Onaya Gönder butonu)
  - Active versiyon açıkken "Revizyon Taslağı Oluştur" banner'ı (şu anki "Yeni DRAFT Oluştur" banner'ı bunun üzerine inşa edilir)

- `client/src/components/budget-planning/BudgetCustomerGrid.tsx` + müşteri seçim dropdown'u
  - Her müşteri seçeneğinin yanında tamamlandı chip'i

- `client/src/pages/ApprovalsPage.tsx`
  - Yeni seksiyon yapısı (Bekleyen / Yürürlükte / Arşiv-collapse)
  - Rol-bazlı aksiyon butonu görünürlüğü
  - Yıl filtresi + "Sadece benimle ilgili" toggle

- `client/src/pages/BudgetPeriodsPage.tsx`
  - Yeni durum enum'una göre chip mapping
  - "Yeni Versiyon" sadece yılda çalışılan taslak yoksa enable

### 8.2 Müşteri tamamlandı hesabı

`BudgetEntryPage` içinde useMemo:
```typescript
const completedCustomerIds = useMemo(() => {
  const ids = new Set<number>()
  for (const e of entries) ids.add(e.customerId)
  return ids
}, [entries])
const completedCount = completedCustomerIds.size
const totalCount = customers.length
const allComplete = completedCount === totalCount && totalCount > 0
```

`allComplete` → "Onaya Gönder" enabled.

## 9. Veri Göçü

### 9.1 Enum mapping

| Eski değer | Yeni değer |
|---|---|
| `Draft` | `Draft` |
| `Submitted` | `PendingFinance` |
| `DeptApproved` | `PendingFinance` |
| `FinanceApproved` | `PendingCfo` |
| `CfoApproved` | `PendingCfo` |
| `Active` | `Active` |
| `Rejected` | `Rejected` |
| `Archived` | `Archived` |

### 9.2 Invariant ihlali temizliği

Bir yılda birden fazla `Active` olursa → en yeni olanı koru, diğerlerini `Archived`.
Bir yılda birden fazla "çalışılan taslak" olursa (yeni mapping sonrası) → en yeni olanı koru, diğerlerini `Archived`.

Tek EF migration içinde:
1. Enum değerlerini string kolonda mapping yap (PostgreSQL: `CASE WHEN ... THEN ... END`)
2. Partial unique index'leri oluştur
3. İhlal varsa temizlik UPDATE

### 9.3 Dev DB durumu

Şu an:
- V1 (eski `Active`)
- V2 (eski `Active`, bizim test sonrası)
- V3 (eski `Submitted`)

Migration sonrası:
- V2 → `Active` (en yeni)
- V1 → `Archived`
- V3 → `PendingFinance`

Fakat invariant ihlal — `Active` tek olmalı, o yüzden V1 archived olur; taslak ise V3 olur.

## 10. Uygulama Sırası

1. Backend: state machine refactor + unit test (Core + UnitTests) — TDD
2. Backend: controller endpoint refactor + authorization policies
3. EF migration (enum + partial unique indexes + data mapping) — Integration test
4. Frontend: `types.ts` + status label/chip sözlükleri
5. Frontend: `BudgetEntryPage` ilerleme banner + kilitli gönder
6. Frontend: müşteri dropdown tamamlandı chip'i
7. Frontend: `ApprovalsPage` refactor
8. Frontend: `BudgetPeriodsPage` refactor
9. Frontend: "Revizyon Taslağı Oluştur" akışı (backend `create-revision` ile)
10. E2E doğrulama (Playwright)

## 11. Kapsam Dışı (YAGNI)

- Audit log timeline UI detayı (mevcut `audit_log` verisi korunur, ayrı özellik)
- E-posta / Slack / in-app bildirim
- Çoklu CFO onayı (tek CFO varsayılır)
- Koşullu onay eşikleri (X TL üstü ek onay vb.)
- Revizyon diff (V1 vs V2 entry karşılaştırma UI'ı)

## 12. Başarı Kriterleri

- Bir planlamacı Bütçe Planlama sayfasında üst banner'dan kaç müşterinin dolu kaç müşterinin boş olduğunu anlık görebilir
- Tüm müşteriler dolana kadar "Onaya Gönder" butonu kilitli — kullanıcı unutkanlık kaynaklı eksik onay riski taşımaz
- Onay akışında tek bir Finans kullanıcısı aksiyon alır, sonra tek bir CFO kullanıcısı aksiyon alır — toplam 2 onay
- CFO "Onayla ve Yayına Al" tek tuşla basar; atomic şekilde eski aktif arşive gider, yeni aktifleşir
- `Bütçe Planlama` → `Bütçe Versiyonları` → `Onay Akışı` üçlüsünde aynı bütçenin durumu her zaman tutarlı görünür
- Yıl başına 1 Active + 1 Draft invariant'i DB seviyesinde zorlanır — iki taslağın yan yana yaşayamayacağından emin olunur
- Tüm state machine transitionları domain unit test'leri ile kapsanır (≥12 yeni test)
- Kritik E2E senaryosu: "Yeni taslak → 3 müşteri giriş → Onaya Gönder → Finans Onayla → CFO Onayla ve Yayına Al → eski Active Archived" — Playwright ile geçer
