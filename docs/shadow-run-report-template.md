# Shadow Run Raporu — YYYY-WW

> **Kullanım:** Bu dosyayı `docs/shadow-run-report-YYYY-WW.md` olarak kopyalayın (örn. `2026-18.md` = 2026 yılı 18. hafta). Haftalık Excel vs sistem karşılaştırması sonrasında doldurulur. F8 kabul kriteri: **2 consecutive hafta zero-variance**.

**Hafta:** ____  
**Tarih aralığı:** ____  
**Katılımcılar:** muhasebe ekibi + Timur  
**Sistem sürümü (commit SHA):** ____  
**Önceki hafta farkı:** ____ (varsa)

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
| 10 | Konsantrasyon uyarı / kritik (%30 / %50 eşiği) | | | | [ ] Eşleşti [ ] Fark |

---

## 2. Tespit Edilen Farklar

_(Her fark için ayrı alt-başlık)_

### Fark #1 — [kısa başlık]

- **Beklenen (Excel):** ____
- **Gözlenen (Sistem):** ____
- **Tolerans dışı mı?** [ ] Evet [ ] Hayır (ölçüm hatası)
- **Root cause hipotezi:** ____
- **Aksiyon:** [ ] GitHub issue açıldı (#___) [ ] Patch deploy edildi (commit ___) [ ] Bir sonraki haftaya ertelendi

---

## 3. Operasyonel Notlar

- **API p95 latency (Seq):** ____ ms (hedef <500 ms)
- **Hangfire job'ları:** [ ] Hepsi yeşil [ ] Başarısız: ____
- **Audit log hacmi:** ____ satır (shadow kullanıcı activity'si)
- **`/health/ready` son 7 gün:** ____ % uptime

---

## 4. Sonuç

- [ ] **Sıfır fark** — F9 Excel Emekliliği ön koşulu sağlandı (kümülatif ___ haftadan ___ hafta)
- [ ] **Tolerans içi fark, nedeni açıklandı** — bir sonraki haftaya devam
- [ ] **Tolerans dışı fark** — patch + yeniden shadow run; counter sıfırlandı
- [ ] **Excel otorite** — sistemde ciddi sorun, prod hold

**F9'a kalan:** ____ hafta zero-variance

---

## 5. Eklenti

- **Excel dump:** `docs/shadow-run/YYYY-WW-excel.xlsx` (commit'e eklenmez, SharePoint'te)
- **Sistem dump:** `/reports/pnl?versionId=X&format=xlsx` çıktısı
- **PR referansı:** patch deploy yapıldıysa PR linki
