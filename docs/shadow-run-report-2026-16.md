# Shadow Run Raporu — 2026-16 (Hafta 1)

> **F8 Shadow Run açılış haftası.** İlk staging deploy sonrası muhasebe ekibi bu dosyayı Excel vs sistem karşılaştırmasıyla doldurur. Zero-variance hedefi: 2 consecutive hafta. Bu hafta tamamlanınca `docs/shadow-run-report-2026-17.md` template'ten kopyalanır.

**Hafta:** 1 / 2+ (kümülatif zero-variance sayacı)
**Tarih aralığı:** 2026-04-13 → 2026-04-19 (ISO hafta 16)
**Katılımcılar:** muhasebe ekibi + Timur
**Sistem sürümü (commit SHA):** _ilk staging deploy sonrası commit hash buraya_
**Önceki hafta farkı:** — (ilk hafta)

---

## 0. Ön-koşul Kontrolü

- [ ] İlk staging deploy başarılı (GitHub Actions `deploy-staging` job yeşil)
- [ ] `prod-smoke.sh` 3 assertion geçti (/health/live, /health/ready, /hangfire 401)
- [ ] `seq-ingest-check.sh` geçti (staging'de opsiyonel, production'da zorunlu)
- [ ] Muhasebe seansı kararları prod'a akıtıldı (Madde 1–4, bkz. `docs/accounting-session-decisions-2026-04-17.md`)
- [ ] SGK Teşvik müşteri kaydı oluşturuldu (`customer_code = 'SGK-TESVIK'`)
- [ ] Master data init (müşteriler + segmentler + expense categories) tamamlandı

**Kontrol listesi tamamlanmadan karşılaştırma noktalarına geçmeyin.**

---

## 1. Karşılaştırma Noktaları

Her madde için Excel ve sistem çıktıları yan yana. Tolerans: tutar ±0,01 TL, oran ±0,0001.

| # | Metrik | Excel Değeri | Sistem Değeri | Fark | Durum |
|---|---|---|---|---|---|
| 1 | Toplam Gelir | | | | [ ] Eşleşti [ ] Fark |
| 2 | Toplam Hasar | | | | [ ] Eşleşti [ ] Fark |
| 3 | Loss Ratio | | | | [ ] Eşleşti [ ] Fark |
| 4 | Holding Giderleri (GENERAL altında) | | | | [ ] Eşleşti [ ] Fark |
| 5 | Amortisman (TECHNICAL altında) | | | | [ ] Eşleşti [ ] Fark |
| 6 | SGK Teşvik toplam (tek satır, tahakkuk) | | | | [ ] Eşleşti [ ] Fark |
| 7 | Teknik Marj | | | | [ ] Eşleşti [ ] Fark |
| 8 | EBITDA | | | | [ ] Eşleşti [ ] Fark |
| 9 | Konsantrasyon — Top 1 müşteri payı | | | | [ ] Eşleşti [ ] Fark |
| 10 | Konsantrasyon uyarı/kritik (%30/%50 eşiği) | | | | [ ] Eşleşti [ ] Fark |

---

## 2. Tespit Edilen Farklar

_(Her fark için ayrı alt-başlık. İlk hafta beklenen: birkaç küçük fark — master data init / round-trip kontrolü)._

### Fark #__ — [kısa başlık]

- **Beklenen (Excel):** ____
- **Gözlenen (Sistem):** ____
- **Tolerans dışı mı?** [ ] Evet [ ] Hayır (ölçüm hatası)
- **Root cause hipotezi:** ____
- **Aksiyon:** [ ] GitHub issue açıldı (#___) [ ] Patch deploy edildi (commit ___) [ ] Bir sonraki haftaya ertelendi

---

## 3. Operasyonel Notlar

- **API p95 latency (Seq):** ____ ms (hedef <500 ms)
- **Hangfire job'ları:** [ ] Hepsi yeşil [ ] Başarısız: ____
  - `audit-partition-maintenance` son çalışma: ____
  - `tcmb-fx-sync` son çalışma: ____
- **Audit log hacmi:** ____ satır (shadow kullanıcı activity'si)
- **`/health/ready` son 7 gün:** ____ % uptime
- **SGK Teşvik kaydı:** [ ] Oluşturuldu (`customer_code = 'SGK-TESVIK'`) [ ] Henüz yok

---

## 4. Sonuç

- [ ] **Sıfır fark** — kümülatif 1/2 hafta (bir sonraki hafta da sıfır olursa F9)
- [ ] **Tolerans içi fark, nedeni açıklandı** — bir sonraki haftaya devam, counter **sıfırlanmaz**
- [ ] **Tolerans dışı fark** — patch + yeniden shadow run; counter **sıfırlanır** (0/2)
- [ ] **Excel otorite, sistem hold** — ciddi sorun, prod deploy geri alındı

**F9'a kalan:** 2 hafta zero-variance (ilk hafta sonucuna göre güncellenir)

---

## 5. Ek

- **Excel dump:** SharePoint `/FinOps/ShadowRun/2026-16-excel.xlsx`
- **Sistem dump:** prod `/api/v1/reports/budget/excel?versionId=X` çıktısı → `docs/shadow-run/2026-16-system.xlsx` (commit'e eklenmez, sadece paylaşım)
- **PR referansı:** patch deploy yapıldıysa PR linki (`#___`)

---

## 6. İmza

- [ ] Muhasebe müdürü onay: ______________________ (tarih: ____)
- [ ] Timur onay: ______________________ (tarih: ____)
