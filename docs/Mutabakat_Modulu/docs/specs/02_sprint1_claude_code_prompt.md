# Sprint 1 — Claude Code Executable Prompt

- **Tarih:** 2026-04-19
- **Süre:** 2 hafta (10 iş günü)
- **Amaç:** Mutabakat modülünün çekirdek entity'leri + migration'lar + import parser iskeleti + batch listesi UI'ının hazır olması

## 1. Sprint Kapsamı (Definition of Done)

Sprint sonunda şunlar çalışır olmalı:

- [ ] 8 yeni entity EF Core'da tanımlı, migration çalıştı, DB'de tablolar var
- [ ] RLS policy yeni tablolarda aktif
- [ ] `POST /api/v1/reconciliation/batches` endpoint'i xlsx/csv dosya kabul ediyor
- [ ] Parser sigorta ve otomotiv şablonlarını tanıyıp `SourceRow` oluşturuyor
- [ ] Hatalı satırlar `parse_status=Error` ile kaydediliyor, batch düşmüyor
- [ ] `GET /api/v1/reconciliation/batches` listesi dönüyor
- [ ] SPA'da "Mutabakat > Batch Listesi" sayfası görünüyor (AG-Grid ile)
- [ ] Integration test: uçtan uca xlsx upload → SourceRow kaydı
- [ ] Unit test: parser'ın TR/EN sayı formatı + başlık eşleme toleransı
- [ ] Audit event: `ReconciliationBatchImported`
- [ ] PR açıldı, CI yeşil, Timur review edecek

## 2. Sprint 1 Kapsamı DIŞI

Sonraki sprint'lerde yapılacak, burada YAPILMAYACAK:

- Case/Line otomatik oluşturulması (Sprint 2)
- Fiyat eşleştirmesi / PriceBook lookup (Sprint 2)
- Müşteri onay akışı (Sprint 3)
- Muhasebe export (Sprint 4)
- Dashboard / KPI sayfaları (Sprint 4)

## 3. Önkoşul Kontrolü (Sprint Başlamadan)

Bunların hazır olduğunu doğrula:

- [ ] `Customer.external_customer_ref` alanı eklendi → [00a spec](./00a_prereq_customer_external_ref.md)
- [ ] `PriceBook` altyapısı devreye alındı (Sprint 1'de `lookup` kullanılmıyor ama tablolar var) → [00b spec](./00b_prereq_pricebook.md)
- [ ] `ReconAgent` rolü tanımlı → [00c spec](./00c_prereq_recon_agent_role.md)
- [ ] Pilot sözleşme + PriceBook seed verisi yüklendi (en az 3 sigorta + 3 otomotiv)

Eğer önkoşullar hazır değilse, Sprint 1 BAŞLAMAZ.

## 4. Claude Code'a Verilecek Tam Prompt

Aşağıdaki metni Claude Code oturumuna kopyala-yapıştır:

```
Bağlam: FinOps Tur projesine "Mutabakat, Faturalama ve Tahsilat Yönetimi" modülünü
ekliyoruz. Sprint 1'deyiz.

Önce şu referansları oku:
- CLAUDE.md (proje anayasası, Day-1 prensipleri)
- Mutabakat_Modulu/README.md
- Mutabakat_Modulu/docs/RECONCILIATION_BILLING_COLLECTIONS.md
- Mutabakat_Modulu/docs/plans/2026-04-19-reconciliation-billing-collections-plan.md
- Mutabakat_Modulu/docs/specs/01_phase1_domain_model.md (§3 Entity, §4 State, §6 Import)
- Mutabakat_Modulu/docs/specs/02_sprint1_claude_code_prompt.md (bu dosya)
- Mutabakat_Modulu/analysis/EXCEL_ANALYSIS.md (veri yapısı referansı)

Görev — Sprint 1:
1) 8 entity + EF Core migration + RLS policy
   - ReconciliationFlow (enum)
   - ReconciliationBatch
   - ReconciliationSourceRow
   - ReconciliationCase (iskelet — Sprint 2'de genişleyecek)
   - ReconciliationLine (iskelet)
   - ReconciliationDecision (iskelet)
   - AccountingInstruction (iskelet)
   - RiskRuleSet

2) Import parser
   - Xlsx + CSV okuyucu (ClosedXML + CsvHelper)
   - Sigorta şablonu (spec §6.1) ve otomotiv şablonu (spec §6.2)
   - Başlık eşleme toleransı: büyük-küçük harf, Türkçe karakter normalizasyon
   - TR/EN sayı ve tarih formatı desteği
   - Hatalı satır SourceRow.parse_status=Error; batch reddedilmez
   - File hash (SHA-256) ile duplicate import engeli

3) API endpoint'leri (v1)
   - POST /api/v1/reconciliation/batches (multipart form, file + flow + period_code)
   - POST /api/v1/reconciliation/batches/{id}/parse
   - GET  /api/v1/reconciliation/batches?flow=&period_code=&status=
   - GET  /api/v1/reconciliation/batches/{id}
   - DELETE /api/v1/reconciliation/batches/{id} (sadece Draft)

4) SPA (React 19 + TanStack Query + AG-Grid)
   - "/mutabakat" route
   - "/mutabakat/batches" sayfası (AG-Grid liste + yeni batch upload modal)
   - Sigorta/Otomotiv sekmesi (flow filtresi)
   - i18n TR default, EN mirror

5) Audit
   - ReconciliationBatchImported event'i audit_log'a yazılıyor
   - context_json: flow, period_code, row_count, source_file_hash

Kurallar:
1. CLAUDE.md'yi her adımda referans al. Day-1 kuralları (multi-tenant, versiyonlama,
   FX, audit) bu modülde de geçerli.
2. Önce 3-7 maddelik mini-plan sun, onayımı bekle.
3. Kodlamaya başlayınca Conventional Commits kullan.
4. Her endpoint için integration test (real Postgres via Testcontainers).
5. Parser için unit test matrisi: başlık varyasyonları, sayı formatları, hatalı satır.
6. Test coverage hedefi %80; altına düşersen uyar.
7. Migration down-script'i çalışır olmalı (geri alınabilir).
8. Kararsız kaldığında "durum + 3 seçenek + önerim" formatında sor.
9. PR description'a KVKK checklist ekle (dosya upload retansiyon, hash log).
10. PR başlığı: "feat(reconciliation): sprint 1 — batch import + parser + UI"

Başla: önce mini-planı sun.
```

## 5. Mini-Plan Beklentisi

Claude Code'un ilk cevabı şuna benzer olmalı:

```
Sprint 1 Mini Plan:

1. Entity + migration (1 gün)
   - 8 entity tanımla, DbContext'e ekle
   - InitialReconciliationModule migration
   - RLS policy'sini yeni tablolar için aktif et
   - Seed: boş

2. Import parser altyapısı (2 gün)
   - IReconciliationImportParser arayüzü
   - XlsxParser + CsvParser implementasyonu
   - ColumnMappingResolver (Türkçe karakter/büyük-küçük harf toleransı)
   - NumberAndDateFormatDetector (TR/EN)

3. Parser iş mantığı + duplicate koruması (1 gün)
   - SHA-256 file hash hesaplayıcı
   - Sigorta template validator
   - Otomotiv template validator
   - ParseErrorCollector

4. API endpoint'leri (1 gün)
   - 5 endpoint + FluentValidation + OpenAPI
   - Policy: Reconciliation.Import, Reconciliation.Manage, Reconciliation.ViewReports

5. SPA entegrasyonu (2 gün)
   - Menü öğesi "Mutabakat" eklendi
   - /mutabakat/batches sayfası (AG-Grid)
   - Upload modal: flow seç, dönem seç, dosya yükle
   - TanStack Query hooks: useBatches, useUploadBatch
   - i18n keys

6. Testler (2 gün)
   - Unit: parser matrisi (20+ senaryo)
   - Integration: xlsx upload → SourceRow kaydı
   - Integration: RLS — iki tenant birbirini görmüyor
   - E2E smoke: upload → parse → list (Playwright)

7. Audit + dokümantasyon + PR (1 gün)
   - ReconciliationBatchImported event
   - Kullanıcı kılavuzu (docs/user-guide/reconciliation-import.md)
   - PR + review hazırlığı

Toplam: 10 iş günü. Onaylıyor musun?
```

Eğer Claude Code bu formatta **gelmezse**, "lütfen §5 formatında mini-plan sun" diye geri istenmeli.

## 6. Onay Sonrası Claude Code'un Sırası

Timur onayladığında Claude Code her maddeyi sırayla yapacak ve her maddeden sonra commit atacak. Sprint sonunda tek PR açılacak.

## 7. Bloke Olursa Ne Yapar?

Claude Code blokelerde "durum + 3 seçenek + önerim" formatında sormalı. Örnek:

```
Durum: Multi-tenant RLS policy'si yeni tablolar için otomatik
mi uygulanıyor yoksa elle migration'a eklemem mi lazım?

Seçenekler:
1. Mevcut RLS trigger'ı öğren ve aynı pattern'i uygula
2. Yeni tablolar için explicit CREATE POLICY migration yaz
3. Mevcut policy'yi tüm tablolara genişleten wildcard yaklaşım

Önerim: #2. Sebebi: yeni tablolar farklı company_id kolonuna sahip
olabilir; wildcard yerine explicit güvenli.
```

## 8. Kabul Kriterleri (Sprint Review'da Timur'un Kontrol Listesi)

- [ ] Boş DB'de migration koşuyor, hata yok
- [ ] `admin@tag.local` ile `recon@tag.local` kullanıcısına batch upload yetkisi tanındı
- [ ] Sigorta şablonu gerçek dosya ile test edildi, tüm satırlar `SourceRow` olarak kaydedildi
- [ ] Otomotiv şablonu aynı şekilde test edildi
- [ ] 100 satırlık dosya < 5sn'de parse ediyor
- [ ] Aynı dosyayı iki kez yüklemek `DuplicateImportException` fırlatıyor
- [ ] Hatalı satır (boş zorunlu alan) batch'i düşürmüyor, diğer satırlar kaydediliyor
- [ ] SPA Batch Listesi sayfası AG-Grid ile çalışıyor, filtreleme + sıralama OK
- [ ] Upload sonrası sayfa otomatik yenileniyor (TanStack Query invalidation)
- [ ] RLS testi: farklı tenant kullanıcısı başka tenant'ın batch'lerini göremiyor
- [ ] Audit log'da `ReconciliationBatchImported` event'i var
- [ ] PR açıklamasında KVKK checklist tam
- [ ] CI yeşil, coverage %80+

## 9. Sprint Sonu Review Toplantı Ajandası

30 dk:
- (5 dk) Claude Code ne bitirdiğini özetler
- (10 dk) Demo: gerçek sigorta + otomotiv dosyası yükleme
- (5 dk) Test coverage + CI durumu
- (5 dk) Bloke olan / çözülmeyen açık sorular
- (5 dk) Sprint 2 hazırlık: PriceBook lookup devreye girecek, iskelet hazır mı?

## 10. Sprint 2 Hazırlığı

Sprint 1 bittiğinde Sprint 2 şu işleri kapsayacak:

- Case + Line otomatik oluşturma (parse sonrası)
- PriceBook lookup algoritması entegrasyonu
- Case listesi + detay UI (S4, S5, S6)
- State machine enforcement (UnderControl → PricingMatched geçişi)

Sprint 2 için ayrı bir prompt dosyası (`03_sprint2_claude_code_prompt.md`) Sprint 1 kapanışında hazırlanacak.
