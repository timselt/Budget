# Paralel Önkoşul Orkestrasyon Kılavuzu

- **Tarih:** 2026-04-19
- **Durum:** Uygulamaya hazır
- **Hedef:** 3 önkoşul spec'ini 3 ayrı Claude Code oturumunda paralel yürütmek; ~1.5 haftada tamamlamak
- **Orkestra:** Timur (sen)
- **Bağlı olduğu:** [`00a`](./00a_prereq_customer_external_ref.md) · [`00b`](./00b_prereq_pricebook.md) · [`00c`](./00c_prereq_recon_agent_role.md)

## 1. Neden Paralel?

3 spec **neredeyse birbirinden bağımsız**. Tek ortak nokta: hepsi aynı migration pipeline'ına yazıyor. Migration isimlerini ayırdığımız sürece çakışma olmaz. Seri yaparsak 3 hafta, paralel yaparsak ~1.5 hafta.

## 2. Paralel Çalışma Kuralları

### 2.1 Branch Stratejisi

Her önkoşul kendi branch'inde çalışır:

| Spec | Branch | Migration prefix | Merge öncelik |
|---|---|---|---|
| 00a — Customer ext ref | `feat/prereq/customer-ext-ref` | `20260420_01_customer_ext_ref` | 1. sırada |
| 00b — PriceBook | `feat/prereq/pricebook` | `20260420_02_contract_pricebook` | 2. sırada |
| 00c — RBAC | `feat/prereq/recon-agent-role` | `20260420_03_recon_agent_role` | 3. sırada |

**Merge sırası zorunlu** — aşağıdaki bağımlılıklar var:
- 00a → 00b: PriceBook lookup `Customer.external_customer_ref`'i kullanmıyor ama test verisi için gerekir
- 00a → 00c: ReconAgent test kullanıcısı Customer'a bağlı
- 00b → 00c: PriceBook.Approve policy'si 00c'de tanımlı

### 2.2 Çakışma Noktaları ve Çözümü

| Çakışma | Nerede | Çözüm |
|---|---|---|
| Migration dosya adı | `migrations/` klasörü | Timestamp + numaralı prefix ile ayır (tabloya bak §2.1) |
| `IdentitySeeder` | 00a ve 00c ikisi de dokunuyor | 00c'nin branch'i 00a merge edildikten sonra rebase |
| `DbContext.OnModelCreating` | Hem 00a hem 00b entity ekliyor | Her branch kendi kısmını ekler; merge conflict Timur çözer (veya Claude'a bırak) |
| `appsettings.json` | Yeni policy isimleri | 00c tek başına ekler, diğerleri dokunmaz |

### 2.3 Ortak Konvansiyonlar

Tüm 3 oturum aynı kuralları uygulayacak:

- Migration down-script'i çalışır olmalı
- Integration test: Testcontainers gerçek Postgres
- Unit test coverage hedefi %80
- Conventional Commits: `feat(customer): ...`, `feat(pricebook): ...`, `feat(auth): ...`
- PR description'da KVKK checklist
- PR başlığı: `feat(prereq): 00x — <spec adı>`

## 3. Üç Hazır Claude Code Prompt'u

### 3.1 Oturum A — Customer.external_customer_ref

Yeni Claude Code oturumu aç, aşağıyı kopyala-yapıştır:

```
Bağlam: FinOps Tur projesine Mutabakat modülü ekleniyor. Bu oturumun
görevi, modülün önkoşullarından ilki olan "Customer.external_customer_ref"
alanını eklemek.

Referanslar (sırayla oku):
- CLAUDE.md
- Mutabakat_Modulu/README.md (hızlı bağlam)
- Mutabakat_Modulu/docs/specs/00a_prereq_customer_external_ref.md (ana görev)
- Mutabakat_Modulu/docs/specs/03_parallel_prereq_orchestration.md §2 (branch + migration kuralı)

Görev:
1. Yeni branch aç: feat/prereq/customer-ext-ref
2. Migration dosyası: 20260420_01_customer_ext_ref
3. 00a spec'indeki 6 bölümün tamamını uygula (entity, index, API, UI, backfill, test)
4. PR başlığı: "feat(prereq): 00a — customer external ref"

Kurallar:
1. Önce 3-5 maddelik mini-plan sun, onay bekle
2. CLAUDE.md Day-1 kurallarına uy (multi-tenant, RLS, audit)
3. UNIQUE index'i WHERE NOT NULL ile koşullu yap
4. Backfill script ayrı dosyada: scripts/backfill-customer-ext-ref.csx
5. Integration test: 2 farklı tenant'ta aynı external_ref izin veriliyor
6. Unit test: duplicate aynı tenant'ta engelleniyor
7. Bloke olursan "durum + 3 seçenek + önerim" formatında sor
8. Coverage %80 altına düşerse uyar

Başla: mini-plan.
```

### 3.2 Oturum B — PriceBook Altyapısı

Yeni Claude Code oturumu aç, aşağıyı kopyala-yapıştır:

```
Bağlam: FinOps Tur projesine Mutabakat modülü ekleniyor. Bu oturumun
görevi, sözleşme + PriceBook altyapısını kurmak.

Referanslar (sırayla oku):
- CLAUDE.md
- Mutabakat_Modulu/README.md
- Mutabakat_Modulu/docs/specs/00b_prereq_pricebook.md (ana görev, 213 satır)
- Mutabakat_Modulu/docs/specs/03_parallel_prereq_orchestration.md §2 (branch + migration)
- Mutabakat_Modulu/analysis/EXCEL_ANALYSIS.md §4 (risk kuralı grup farkı — ileride lazım)

Görev:
1. Yeni branch aç: feat/prereq/pricebook
2. Migration dosyası: 20260420_02_contract_pricebook
3. 00b spec'indeki 10 bölümü uygula:
   - Contract entity (varsa genişlet, yoksa yeni)
   - PriceBook + PriceBookItem entity + EXCLUDE USING gist
   - 11 REST endpoint
   - Bulk CSV import parser
   - 4 UI ekranı (Contract listesi, Contract detay, PriceBook düzenleme, Fiyat arama)
   - Lookup algoritması (/api/v1/pricing/lookup)
   - Audit event'leri (PriceBookVersionCreated, PriceBookApproved, PriceBookItemsChanged)
4. PR başlığı: "feat(prereq): 00b — contract + pricebook"

Kurallar:
1. Önce 5-7 maddelik mini-plan sun, onay bekle
2. Aktif PriceBook sürümü tek olmalı — EXCLUDE USING gist ile garanti et
3. Versiyonlama: period_code'a göre geçmiş dönem eski fiyatla hesaplanır
4. Lookup endpoint'i < 5ms cache edilebilir (Redis veya in-memory, L1)
5. KVKK: fiyat verisi hassas değil ama PriceBook dışa export edilirken audit log
6. UI ekranları için AG-Grid kullan (mevcut pattern)
7. Mevcut Contract entity'si varsa ilk iş: analiz et, spec ile karşılaştır, Timur'a rapor et
8. Bloke olursan "durum + 3 seçenek + önerim" formatında sor
9. Coverage %80

NOT: 00a branch'i merge edildiğinde bu branch rebase et. Çakışma yok ama
migration timestamp sırası doğru olmalı.

Başla: mini-plan.
```

### 3.3 Oturum C — ReconAgent Rolü

Yeni Claude Code oturumu aç, aşağıyı kopyala-yapıştır:

```
Bağlam: FinOps Tur projesine Mutabakat modülü ekleniyor. Bu oturumun
görevi, ReconAgent rolünü ve ilgili authorization policy'lerini eklemek.

Referanslar (sırayla oku):
- CLAUDE.md
- Mutabakat_Modulu/README.md
- Mutabakat_Modulu/docs/specs/00c_prereq_recon_agent_role.md (ana görev)
- Mutabakat_Modulu/docs/specs/01_phase1_domain_model.md §11 (RBAC matrisi)

Görev:
1. Yeni branch aç: feat/prereq/recon-agent-role
2. Migration dosyası: 20260420_03_recon_agent_role
3. 00c spec'indeki 12 bölümü uygula:
   - ReconAgent rolü IdentityConstants + seed
   - 9 authorization policy
   - Görev ayrılığı domain servisleri (aynı kullanıcı PriceBook create + approve engeli vs.)
   - IdentitySeeder güncellemesi: recon@tag.local
   - Audit event tipleri
   - Admin panelde rol açıklaması UI
4. PR başlığı: "feat(prereq): 00c — recon agent rbac"

Kurallar:
1. Önce 4-6 maddelik mini-plan sun, onay bekle
2. Policy'leri AddPolicy() ile Program.cs'ye ekle
3. 00a merge edilmeden seed çalışmayabilir — rebase bekle
4. Integration test: ReconAgent kullanıcısı muhasebe export 403, finance 200
5. Integration test: aynı kullanıcı PriceBook create+approve yapamıyor (domain exception)
6. Mevcut 5 rolü (Admin, Cfo, FinanceManager, DepartmentHead, Viewer) bozma
7. Backward compatibility: eski kullanıcılar eski rolleriyle çalışmaya devam eder
8. KVKK: rol ataması zaten audit log'a yazılıyor, ek çalışma yok
9. Bloke olursan "durum + 3 seçenek + önerim" formatında sor
10. Coverage %80

NOT: Bu branch son merge olacak. Diğer iki branch merge edilmeden bu branch'i
main'e mergeleme — domain service testleri Customer ve PriceBook entity'lerine
bağımlı.

Başla: mini-plan.
```

## 4. Timur'un Kontrol Checklist'i

Her oturum için aynı ritm:

### 4.1 Oturum Başlatıldığında (5 dk)

- [ ] Claude Code doğru spec dosyasını okuyup mini-plan sundu mu?
- [ ] Mini-plan §4.2 formatına uyuyor mu?
- [ ] Spec'te olmayan bir iş eklemedi mi?
- [ ] Tahmin süresi spec ile uyumlu mu?

### 4.2 Mini-Plan Formatı

Beklenen format:
```
1. <iş adı> (<süre tahmini>)
2. <iş adı> (<süre tahmini>)
...
N. Testler + PR (<süre tahmini>)

Toplam: <X> iş günü. Onaylıyor musun?
```

Değilse: "§4.2 formatında tekrar sun" diye geri iste.

### 4.3 Mini-Plan Onaylandıktan Sonra (periyodik)

- [ ] Her commit Conventional Commit formatında
- [ ] Her "blocked" durumu §3'teki "durum + 3 seçenek + önerim" formatında
- [ ] Test yazıldı mı (unit + integration)?
- [ ] Migration down-script'i çalışıyor mu?

### 4.4 PR Geldiğinde (15-30 dk)

- [ ] Branch adı doğru
- [ ] Migration dosya prefix'i doğru
- [ ] PR description'da KVKK checklist tam
- [ ] CI yeşil
- [ ] Coverage %80+
- [ ] Spec'teki tüm kabul kriterleri ✓
- [ ] Gereksiz eklenti yok (YAGNI)

### 4.5 Merge Öncesi

- [ ] Doğru sırada: 00a → 00b → 00c
- [ ] Sıra dışı merge istenirse rebase tetikle

## 5. Bekleyen Riskler ve Mitigasyon

| Risk | Olasılık | Mitigasyon |
|---|---|---|
| Mevcut `Contract` entity'si çakışır | Orta | Oturum B'nin ilk işi mevcut yapıyı analiz etmek (prompt §3.2 Kural 7) |
| Migration timestamp çakışması | Düşük | Branch'ler farklı prefix kullanıyor (§2.1) |
| 3 oturum aynı DbContext değişikliği yapar | Orta | Her branch kendi kısmını ekler; Timur merge sırasında çözer |
| ReconAgent test kullanıcısı seed başarısız (Customer yoksa) | Orta | 00c'yi 00a merge sonrasına bekleme kuralı (§2.1) |
| Claude Code spec dışına çıkar | Düşük-orta | Her oturumda "spec dışı iş yapma" kuralı var; mini-plan aşamasında yakala |
| İki oturum aynı anda aynı dosyayı okur/yazar | Yok | Her biri kendi branch'i, izole ortam |

## 6. Zaman Çizelgesi (Tahmini)

```
Gün 1 (Pzt):
  Sabah:   3 oturum başlat, mini-plan onayları
  Öğleden sonra: Kodlama başlar

Gün 2-3 (Sal-Çar):
  3 paralel kodlama + testler

Gün 4 (Per):
  Oturum A PR'ı — review + merge
  Oturum B + C rebase

Gün 5 (Cum):
  Oturum B PR'ı — review + merge
  Oturum C rebase (son)

Gün 6 (Pzt):
  Oturum C PR'ı — review + merge
  Seed verisi yüklenir

Gün 7 (Sal):
  Regression test + pilot sözleşme + PriceBook girişi
  Sprint 1 için yeşil ışık
```

## 7. Sprint 1'e Geçiş

3 önkoşul merge edildiği gün, [`02_sprint1_claude_code_prompt.md`](./02_sprint1_claude_code_prompt.md) dosyasındaki prompt'u yeni bir Claude Code oturumuna ver. Sprint 1 başlar.

## 8. Oturum Yönetimi İpuçları (Timur İçin)

- **3 terminal pencere aç**, her biri ayrı proje klasörünün kopyasında çalışsın (veya aynı repo'da farklı branch). Claude Code her oturumda ayrı branch'te git durumunu takip eder.
- **Mini-plan onayı**: üç oturumda aynı anda "onaylıyor musun?" gelirse **oturumu adlandır** — "A:", "B:", "C:" öneki ekleyerek takip et.
- **Bloke durum**: 3 oturumdan biri blokeleşirse, diğer ikisi devam edebilir. Bloke olanı sen çöz.
- **PR sıralaması**: merge sırası önemli (§2.1). Claude Code merge etmez; sen merge edersin. Sıra dışı istersen rebase tetikle.
- **Günlük standup (kendin için)**: 10 dk, 3 oturumun mini durumu + blockers.

## 9. Sonuç

Bu kılavuza uyulursa:
- ~1.5 haftada (7 iş günü) 3 önkoşul tamamlanır
- Sonrasında Sprint 1 başlar (2 hafta)
- **Toplam Sprint 1 sonu: bugünden ~3.5 hafta** (seri planda ~5 haftaydı; paralel 1.5 hafta kazandırdı)
