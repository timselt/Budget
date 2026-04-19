# Tahsilat Raporu Excel'leri — Yapısal Analiz

- **Tarih:** 2026-04-19
- **Kaynak:** `Tahsilat Raporu Otomotiv Grubu.xlsx`, `Tahsilat Raporu Sigorta Grubu.xlsx`
- **Amaç:** Sistem tasarımına yapısal girdi sağlamak — veri modeli, KPI kataloğu, grup bazlı parametre ihtiyacı
- **Not:** Dosyalardaki tutarlar ve müşteri listeleri **örnek snapshot**'tır. Sistem kurulumu için önemli olan yapı, formüller, iş kuralları ve grup bazlı farklılıklardır. Rakamlar yalnızca test/validasyon için referans.

## 1. Dosya Anatomisi

Her iki dosya aynı kalıpla kurulmuş:

| Sayfa | Otomotiv | Sigorta | İşlevi |
|---|---|---|---|
| Ana dashboard | Yönetim Raporu (113x12) | Yönetim Raporu (113x11) | Formüllü özet + top10 + risk |
| Tümü / Toplam | Tümü (644x7) | Toplam (135x6) | Tüm fatura pivot çıktısı |
| Vadesi geçenler | Vadesi Geçenler (533x6) | Vadesi Geçenler (84x7) | Vadesi geçmiş fatura pivot çıktısı |
| Vadesi bekleyenler | Vadesi Bekleyenler (132x6) | Bekleyenler (50x5) | Vadesi henüz gelmemiş pivot çıktısı |
| Prompt | 24 satır | 26 satır | Claude'a raporu yeniden ürettiren brief |

Yani dosya bir "rapor" değil, içinde raporun nasıl yeniden üretileceğini anlatan prompt da barındıran yarı-otomatik bir paket. Bu, operasyonun hâlâ kırılgan olduğunu gösteriyor.

## 2. Kaynak Sayfaların Ham Yapısı

Tüm kaynak sayfalar aynı mantıkta:

- A sütunu "Satır Etiketleri" — Logo'dan pivot çıktısı
  - Başlık satırı: `1500xxxxxx / MÜŞTERİ TAM ÜNVANI`
  - Altındaki detay satırları: fatura numarası veya belge bazlı
- B: Ortalama İşlem Tarihi
- C: Ortalama Vade Tarihi
- D: Toplam Gün
- E: Toplam Tutar
- F (bazı sayfalarda): Hesap No

Kritik not: Tutar başlık satırında müşteri toplamını, detay satırında fatura tutarını taşıyor. Yani veri iki kırılımda aynı sayfaya girmiş.

## 3. Ölçek Büyüklüğü (Sadece Kapasite Referansı)

Aşağıdaki değerler mevcut snapshot dosyalardan alınmıştır ve **yalnızca sistem kapasitesini ve performans hedeflerini planlamak için** referans kabul edilmelidir. Rakamlar operasyon sürecinde sürekli değişir.

- Otomotiv tarafı: ~73 müşteri, ~110M ₺ mertebesinde toplam alacak, 600+ satır fatura pivot çıktısı
- Sigorta tarafı: ~27 müşteri, ~65M ₺ mertebesinde toplam alacak, 130+ satır fatura pivot çıktısı
- Grup bazlı risk dağılımları (düşük/orta/yüksek) Excel'de emoji ile görselleştirilmiş

Sistem için çıkarılacak asıl bilgi: **müşteri sayısı onlarla, belge sayısı binlerle ölçülür; bu boyutta performans sorunu yoktur, ancak grup bazlı parametre ve çoklu kullanıcı modeli zorunludur.**

## 4. Risk Kuralı Keşfi (ÖNEMLİ)

İki grupta **risk eşikleri farklı**. Bu, sistemde "grup bazlı parametre" olarak modellenmesi gereken bir kural.

### Otomotiv risk formülü (hücre H9)
```
=IF(D9=0,"🟢 DÜŞÜK",IF(I9>=90,"🔴 YÜKSEK",IF(I9>=10,"🟡 ORTA","🟢 DÜŞÜK")))
```
Yorum: `D` = vadesi geçen tutar, `I` = gecikme günü.
- Gecikme tutarı 0 → DÜŞÜK
- Gecikme günü ≥ 90 → YÜKSEK
- Gecikme günü 10–89 → ORTA
- Gecikme günü < 10 → DÜŞÜK

### Sigorta risk formülü (hücre H10)
```
=IF(D10=0,"🟢 DÜŞÜK",IF(I10>=90,"🔴 YÜKSEK",IF(I10>=30,"🟡 ORTA","🟢 DÜŞÜK")))
```
Yorum: Aynı mantık, **ama ORTA eşiği 30 gün**.
- Gecikme günü 30–89 → ORTA (otomotivde 10 gün)

### Sistemde Gereken
`RiskRuleSet` entity'si:
- `group_code`: OTOMOTIV | SIGORTA (ileride genişler)
- `low_threshold_days`: 0 (default)
- `medium_threshold_days`: Otomotiv=10, Sigorta=30
- `high_threshold_days`: 90
- `effective_from`, `effective_to`
- Audit: kim değiştirdi, hangi dönemden itibaren geçerli

Parametre olmazsa iki grup için iki ayrı kod yolu yazmak zorunda kalınır.

## 5. KPI Formülleri (Yeniden Kullanılabilir)

### Müşteri bazlı çekirdek metrikler
| KPI | Formül (Excel) | Sistem karşılığı |
|---|---|---|
| Toplam alacak | `SUMIF(Tümü!A:A, customerId&"*", Tümü!E:E)` | `SUM(receivable.amount WHERE customer_id=? AND status<>Collected)` |
| Vadesi geçen | `SUMIF('Vadesi Geçenler'!A:A, customerId&"*", 'Vadesi Geçenler'!E:E)` | `SUM(receivable.amount WHERE due_date < today AND status<>Collected)` |
| Vadesi bekleyen | `SUMIF(Bekleyenler!A:A, customerId&"*", Bekleyenler!E:E)` | `SUM(receivable.amount WHERE due_date >= today AND status<>Collected)` |
| Gecikme oranı | `IF(total=0, 0, overdue/total)` | `overdue / total` (total=0 ise 0) |
| Müşteri payı | `total / grand_total` | Aynı |
| Ortalama gecikme günü | `AVERAGEIFS(gün, müşteri_no, id, gün, "<>")` | `AVG(today - due_date) WHERE due_date<today` |
| Maksimum gecikme günü | `TODAY() - MAXIFS(vade, müşteri_no, id, vade, ">0")` | `MAX(today - due_date)` |

### Portföy dağılımı
- **Top 10 Vadesi Geçen:** `LARGE(overdue_col, N)` + `INDEX/MATCH` ile müşteri adı
- **Top 10 Vadesi Bekleyen:** Aynı mantık, bekleyen kolonundan
- **Yoğunlaşma:** İlk 3 / İlk 5 / İlk 10 müşterinin toplam içindeki payı
- **Risk dağılım:** `COUNTIFS(risk_col, "YÜKSEK|ORTA|DÜŞÜK")`

## 6. Eşleştirme Probleminin İpucu (Dokümantasyon Bulgusu)

Sigorta Prompt sayfasında açık uyarı var:

> Kaynak sayfalardaki müşteri ünvanları tam ad (örn: "MAPFRE SİGORTA ANONİM ŞİRKETİ") ama Yönetim Raporu'ndaki kısa ad ("MAPFRE SİGORTA A.Ş.") ile birebir eşleşmez. Bu yüzden SUMIF'te B sütunu DEĞİL, J sütunundaki müşteri numarası (1500xxxxxx) kullanılmalıdır.

Sistemde bu sorun yaşanmaması için:
- **Müşteri kimliği olarak Logo müşteri numarası birincil anahtar** olmalı (sistem içinde `external_customer_id` olarak saklanır)
- Müşteri adları sadece gösterim amaçlı (`display_name`, `legal_name` ayrı alanlar)
- İç arama: müşteri numarası üzerinden
- UI gösterim: kısa ad

## 7. İki Grup Arasındaki İnce Farklar

| Öğe | Otomotiv | Sigorta |
|---|---|---|
| Kaynak sayfa adı | "Tümü" | "Toplam" |
| Bekleyen sayfa adı | "Vadesi Bekleyenler" | "Bekleyenler" |
| Müşteri No kolonu | F sütununda mevcut | G sütununa formülle türetiliyor |
| Hyperlink kullanımı | Müşteri adı düz metin | Müşteri adı HYPERLINK ile ilgili Toplam satırına gider |
| ORTA risk eşiği | 10 gün | 30 gün |
| Müşteri sayısı | 73 | 27 |
| Başlık yazıları | TR (büyük harf) | TR (emoji + başlık) |

Sistem tasarımında bu farkların hepsi: **"grup bazlı konfigürasyon"** olmalı — kod değil parametre. Aksi halde iki akış iki kod yoluna dönüşür.

## 8. Güçlü Yönler (Sistemde Korunmalı)

- **Üstte özet, altta detay** düzeni: yönetici için bilinçli tasarım
- **Emoji + renk** ile risk seviyesi görselleştirme — dashboard'a birebir taşınabilir
- **Top 10 + yoğunlaşma + risk dağılımı** ayrımı: doğru KPI mimarisi
- **Grup bazlı ayrı dosya**: sigorta/otomotiv operasyonunun gerçekten farklı yönetilmesi gerektiğini kabul etmiş — sistem bunu koruyor

## 9. Zayıf Yönler (Sistem Çözmek Zorunda)

- **Pivot çıktısı yapıştırma** → kolon kayması / başlık değişimi / tarih format farkı = rapor bozulur
- **Formül bağımlılığı:** sayfa adı bir kere değişirse zincir kırılır
- **`_xlfn.MAXIFS`** (Sigorta'da görülen) eski Excel sürümlerinde çalışmaz
- **Bir hata loglanmaz:** veri yanlış girildiğinde yönetici fark etmez
- **Tarihsel izlenebilirlik yok:** aynı müşterinin bir önceki dönem durumu ne idi — dosyadan görülmüyor
- **İş akışı izi yok:** mutabakat / müşteri onayı / muhasebe aktarımı / fatura kesimi bu dosyada yok
- **Çoklu kullanıcı desteği yok:** Excel tek kullanıcı, modül çok kullanıcı + rol gerektirir
- **Audit/KVKK:** kim ne zaman değiştirdi takip edilmiyor

## 10. Sisteme Taşıma İçin Doğrudan Öneriler

1. **Import şablonu:** Logo'dan 3 ayrı CSV değil, tek pivot çıktısı alıp sistem içinde 3 alt listeye (Tümü / Vadesi Geçen / Vadesi Bekleyen) otomatik ayır.
2. **Müşteri eşlemesi:** İlk import'ta bilinmeyen müşteri numarası → "yeni müşteri kaydı öner" akışı (Logo müşteri kodu birincil anahtar).
3. **Yaşlandırma hesabı:** Bekleyen/Geçen ayrımı her zaman `today` parametresi ile yeniden hesaplanabilir olmalı (snapshot + canlı görünüm ayrımı).
4. **Risk kuralı entity'si:** Sabit formül yerine yönetici panelinden ayarlanır eşik değerleri.
5. **Dashboard widget'ları:**
   - KPI kartları (4 büyük rakam)
   - Müşteri tablosu + sıralama + filtre
   - Top 10 geciken
   - Top 10 bekleyen
   - Yoğunlaşma analizi
   - Risk dağılım pasta grafiği
6. **PDF/Excel export:** Aynı dashboard'un tek tuşla yönetici paketine dönüşmesi.

## 11. Sonuç

Bu Excel'ler "kötü bir workaround" değil; operasyonun gerçek ihtiyacını belgeleyen bir MVP analiz dokümanı. Sistem tasarımında bu dosyalar:

- **Veri modeli** için referans (hangi alanlar lazım)
- **KPI kataloğu** için referans (hangi metrikler gösterilecek)
- **Grup bazlı farklılık** için referans (parametrik yönetim gerekiyor)
- **Kullanıcı deneyimi** için referans (üst özet + alt detay + renk kodu)

olmalı. Ama sistem **iş akışı katmanını** (mutabakat → onay → muhasebe → fatura → tahsilat) mutlaka eklemeli; Excel'de bu kısım hiç yok.
