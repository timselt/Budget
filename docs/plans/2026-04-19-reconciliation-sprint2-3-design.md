# Mutabakat Modülü — Sprint 2-3 Tasarım Kararları

- **Tarih:** 2026-04-19
- **Durum:** Brainstorming kapandı, implementation plan'a hazır
- **Referans:** `docs/Mutabakat_Modulu/docs/specs/01_phase1_domain_model.md`, `02_sprint1_claude_code_prompt.md`
- **Kapsam:** 4 konu — (A) Sprint 1 UI boşlukları, (D) önkoşul kapsama raporu, (B) Sprint 2 scope, (C) Sprint 3 müşteri onay UX'i

---

## A — Sprint 1 UI boşlukları ("menüdeki satır çalışmıyor")

### Kanıtla tespit (Playwright ile doğrulandı)

| Ekran | Durum |
|---|---|
| `/mutabakat/batches` (Batch Listesi) | ✅ Sayfa yüklenir, 3 batch listelenir, filtreler çalışır, upload butonu aktif. **❌ Satıra tıklanınca hiçbir şey olmaz — batch detay sayfası yok.** **❌ Draft sil butonu UI'da yok.** |
| `/pricing/lookup` (Fiyat Arama) | ✅ Sayfa + API çalışır. ⚠️ Çoğu müşteride `ContractNotFound` döner — **pilot seed veri eksik**. |

### Kararlar

- **A.1:** Batch satırı tıklanabilir hale getirilecek → Batch Detay ekranı (S3) Sprint 2'ye dahil.
- **A.2:** Draft batch sil butonu Batch Detay ekranına inline eklenecek.
- **A.3:** Pilot seed CSV hazırlığı D.1 kararıyla birleşik yürütülür.

---

## D — Önkoşul uygulanma durumu

### Bulgular (3 paralel Explore ajan raporu)

| Önkoşul | Skor | Kritik Açık |
|---|---|---|
| **00a — Customer external_customer_ref** | ✅ 13/13 | Yok |
| **00b — Contract + PriceBook** | ⚠️ 8/10 | Pilot seed (❌) + ID tipi int (spec UUID ister, ⚠️) |
| **00c — ReconAgent + RBAC** | ⚠️ 7/10 | PriceBook controller `RequireFinanceRole`/`Cfo` alias kullanıyor (spec `PriceBook.Edit`/`PriceBook.Approve` ister) + HTTP 403 integration test yok |

### Kararlar

- **D.1 — Pilot seed:** 3 sigorta + 3 otomotiv için mock seed CSV hazırla, mevcut bulk import endpoint'iyle yükle. Gerçek fiyatlar sonradan operasyon ekibiyle değiştirilir. **Dosya:** `docs/Mutabakat_Modulu/seed/pricebook-pilot-seed.csv` (yeni).
- **D.2 — Policy alias cleanup:** Sprint 2 başında küçük cleanup PR. PriceBook controller'da `[Authorize(Policy = "PriceBook.Edit")]` ve `[Authorize(Policy = "PriceBook.Approve")]` kullanılsın. ReconAgent 403 + FinanceManager 200 integration testleri eklensin.
- **D.3 — UUID vs int:** Kabul edildi. `docs/architecture.md`'ye **ADR-0016** yazıldı (ADR-0014/0015 sırasıyla Kontrat Kodu Domain'i + PriceBook Altyapısı olarak zaten kullanımda): "Mutabakat modülü entity ID tipi int — rationale: mevcut proje EF Core identity pattern'iyle tutarlılık, Guid migration maliyeti MVP için yüksek, external API sözleşmesi dış tarafa UUID göstermediği için risk düşük."

---

## B — Sprint 2 kapsamı

**Süre:** 3 hafta (15 iş günü).

### Kararlar

- **B.1 — Case/Line auto-creation timing:** **Atomic** — parse sırasında aynı transaction içinde Case + Line'lar üretilir. Sprint 1 "Draft + Parsed atomic" pattern'iyle tutarlı. 20K satır limiti Postgres için risk değil.
- **B.2 — Customer eşleşmeyen satırlar:** **UnmatchedCustomers bucket** — `SourceRow.parse_status = Warning` + özel alan `unmatched_customer_ref`. Batch Detay ekranında "Eşlenmemiş müşteriler" sekmesi gösterilir; ReconAgent mevcut `/customers/{id}/link-external` endpoint'ini kullanarak Customer'a linkler, sonrasında "Case oluştur" aksiyonu tekrar tetiklenir. Otomatik "placeholder customer" YOK.
- **B.3 — Grid teknolojisi:** **Karma** — liste sayfaları (Batch, Case) custom `<table>` (Sprint 1 pattern), Lines Grid AG-Grid (inline edit, gelecekte kopyala/yapıştır). AG-Grid zaten `PriceBookEditorPage`'de kurulu.
- **B.4 — Süre:** 3 hafta — auto-creation + 4 ekran + minimal state machine + D.1 seed CSV + D.2 cleanup PR. Tam dispute/revize akışı Sprint 3'e bırakıldı.

### Sprint 2 teslim listesi

1. Case/Line auto-creation (parse sonrası atomic)
2. PriceBook lookup entegrasyonu (Line status: `Ready` / `PricingMismatch` / `Rejected`)
3. **S3 — Batch Detay ekranı** (parse özet + hata satırları + unmatched müşteriler + Case linkler + Draft sil butonu)
4. **S4 — Case Listesi (Sigorta)**
5. **S5 — Case Listesi (Otomotiv)**
6. **S6 — Case Detay + Lines Grid** (AG-Grid, inline `unit_price`/`quantity` edit, statü butonları)
7. State machine enforcement (`Draft → UnderControl → PricingMatched`)
8. UnmatchedCustomers akışı (bucket + link flow)
9. D.1 pilot seed CSV + bulk import dokumentasyonu
10. D.2 cleanup PR (policy alias + 403 testleri)
11. D.3 ADR-0016

**Kapsam dışı (Sprint 3'e):** `SentToCustomer`, `CustomerApproved`, `CustomerDisputed`, dispute reason kayıt, evidence upload, muhasebe export, dispute yönetimi ekranı.

---

## C — Sprint 3 müşteri onay UX'i

**Süre:** 2 hafta (Sprint 3 başı).

### Kararlar

- **C.1 — Onay mekanizması (aşamalı):**
  - **Sprint 3: Y1 — E-posta PDF + manuel cevap kaydı**
    - ReconAgent "Müşteriye gönder" → sistem PDF üretir (QuestPDF) + SMTP ile müşteriye yollar (KVKK aydınlatma metni PDF içinde)
    - Müşteri cevabı e-postayla/başka kanaldan ReconAgent'a döner
    - ReconAgent UI'da "Müşteri onayladı" / "İtiraz var" butonlarıyla manuel işaretler
    - E-posta ekran görüntüsü/PDF `evidence_file_ref` olarak yüklenir
  - **Sprint 4+: Y2 — Magic link portal** (müşteri login'siz, tokenla)
    - 1 dönem Y1 canlı operasyon → UX gereksinimleri netleşir → portal doğru tasarlanır
- **C.2 — Evidence saklama: Railway Volume + DB path**
  - `/app/evidence/<company_id>/<case_id>/<file_id>.<ext>` pattern'i
  - Volume Railway service config'inde mount edilir
  - DB'de sadece path + SHA-256 hash + boyut + MIME tipi
  - BYTEA reddedildi (DB şişer), local FS reddedildi (Railway deploy silinir), Azure Blob CLAUDE.md yasağı
- **C.3 — Dispute reason: Kod zorunlu + OTHER ise not zorunlu**
  - Enum: `PRICE_MISMATCH`, `QTY_MISMATCH`, `PKG_NOT_IN_CONTRACT`, `SERVICE_NOT_RENDERED`, `DUPLICATE`, `POLICY_CANCELLED`, `PERIOD_MISMATCH`, `OTHER`
  - `OTHER` seçildiğinde `dispute_note` boş olamaz (FluentValidation rule)
  - Diğer kodlarda not opsiyonel

### Sprint 3 teslim listesi

1. PDF üretimi (QuestPDF, Case özet + line listesi + KVKK metni)
2. SMTP entegrasyonu (`IEmailSender`, Railway environment config)
3. **S7 — Müşteriye Gönderme Modal'ı** (e-posta önizleme + PDF preview + gönder butonu)
4. **S8 — Müşteri Onay Kaydı** (cevap türü + dispute reason + not + evidence upload)
5. Case state machine: `PricingMatched → SentToCustomer → CustomerApproved | CustomerDisputed`
6. `CustomerDisputed → UnderControl` revizyon geçişi
7. `ReconciliationDecision` append-only kayıt
8. Evidence upload → Railway Volume
9. **S12 — Dispute Yönetimi Listesi** (tüm itiraz edilmiş line'lar, flow filtresi)
10. Integration tests: state machine geçişleri + file upload

**Kapsam dışı (Sprint 4'e):** Muhasebe export (S9), risk kuralı UI (S10), dönem yönetimi (S11), dashboard (S1).

---

## İleriye taşınan TODO'lar (Sprint 4+)

| TODO | Açıklama | Sprint |
|---|---|---|
| Muhasebe export (Excel + ACK) | S9 + `AccountingInstruction` lifecycle | 4 |
| Risk kuralı UI + ADR-0015 | S10, grup bazlı eşik yönetimi | 4 |
| Dönem yönetimi UI | S11 | 4 |
| Mutabakat Dashboard | S1, KPI kartları | 4 |
| Y2 magic link portal | C.1 Y2, müşteri self-service | 5 |
| Faturalama (Faz 2) | `IssuedInvoice` + açık alacak + vade | 6-8 |
| Tahsilat (Faz 3) | `CollectionTransaction` + allocation + yönetici dashboard | 9-11 |

---

## Onay

Bu design doc onaylanırsa `writing-plans` skill'ine geçilir: her Sprint için gün gün kırılmış implementation plan yazılır. Sprint 2 plan dosyası: `docs/plans/2026-04-19-reconciliation-sprint2-plan.md` (yeni, ayrı dosya).
