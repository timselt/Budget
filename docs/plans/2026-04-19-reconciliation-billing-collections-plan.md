# Mutabakat, Faturalama ve Tahsilat Yönetimi — Uygulama Planı

- **Tarih:** 2026-04-19
- **Durum:** Taslak plan
- **Sahip:** Timur Selçuk Turan
- **Bağlam:** Bütçe sistemi üzerine yeni operasyon modülü
- **Referans:** [`../RECONCILIATION_BILLING_COLLECTIONS.md`](../RECONCILIATION_BILLING_COLLECTIONS.md)

## Amaç

Müşteri Deneyim / Mutabakat Ekibi tarafından yürütülen mutabakat operasyonunu sistemleştirmek; müşteri onayı sonrası muhasebeye aktarımı izlenebilir hale getirmek; ardından faturaların, açık alacakların, vade takibinin ve tahsilat raporlarının aynı platform içinde yönetilmesini sağlamak.

Bu modül sadece bir "tahsilat raporu" üretmeyecek. Uçtan uca hedef süreç:

1. Kaynak veriyi içeri al
2. Mutabakat satırlarını oluştur
3. Müşteri ile netleştir
4. Muhasebeye fatura talimatı gönder
5. Fatura kesimini ve vadesini izle
6. Tahsilatı takip et
7. Yönetim raporlarını üret

## Neden Ayrı Modül?

Mevcut Excel'ler değerli bir yönetim raporu sağlıyor ama süreç yönetmiyor. Özellikle şu sorular dosya dışında kalıyor:

- Hangi müşteri için hangi satırlar mutabakat bekliyor?
- Satır müşteri tarafından onaylandı mı, itiraz edildi mi?
- Muhasebeye hangi ürün, adet ve tutar iletildi?
- Fatura kesildi mi?
- Açık alacak hangi yaşam döngüsünde?

Bu plan, Excel'in güçlü raporlama mantığını koruyup operasyonel izi sisteme taşır.

## İş Akışı Özeti

### 1. Sigorta

1. Sigorta şirketi ilgili aya ait poliçe listesini gönderir.
2. Mutabakat ekibi listeyi içeri alır.
3. Poliçelerdeki asistans paketleri ve sözleşme fiyatları kontrol edilir.
4. Faturalanacak kontrat, ürün, adet ve tutar hesaplanır.
5. Liste müşteri ile netleştirilir.
6. Onaylanan satırlar muhasebeye iletilir.
7. Muhasebe faturayı keser.
8. Sonraki aşamada açık alacak ve tahsilat takibi başlar.

### 2. Otomotiv

1. İlk veri TARS operasyon sisteminden Power BI üzerinden alınır.
2. Mutabakat ekibi kullanım listelerini içeri alır.
3. İlgili şirkete hangi hizmetten kaç kullanım oluştuğu tespit edilir.
4. Sözleşmedeki hizmet fiyatlarıyla fatura tutarı hesaplanır.
5. Liste müşteri onayına gönderilir.
6. Onay sonrası muhasebeye aktarılır.
7. Muhasebe faturayı keser.
8. Sonraki aşamada açık alacak ve tahsilat takibi başlar.

## Çekirdek Modüller

### Modül 1 — Mutabakat Yönetimi

Kapsam:

- Kaynak veri içe aktarma
- Sigorta ve otomotiv için ayrı çalışma alanı
- Sözleşme, ürün ve fiyat eşleme
- Müşteri onayı
- Muhasebeye aktarım paketi

### Modül 2 — Faturalama Takibi

Kapsam:

- Muhasebeye gönderilen satırlar
- Kesilen faturalar
- Fatura numarası, tarihi, vade tarihi
- Fatura kesilmeyen bekleyen kayıtlar

### Modül 3 — Tahsilat Yönetimi

Kapsam:

- Açık alacak havuzu
- Vadesi bekleyenler
- Vadesi geçenler
- Kısmi tahsilat
- Kapanan alacaklar

### Modül 4 — Yönetim Raporları

Kapsam:

- Toplam alacak
- Vadesi geçen
- Vadesi bekleyen
- Riskli müşteriler
- Top 10 geciken
- Grup bazlı özetler

## Ekran Backlog'u

### P1 — MVP

- `Mutabakat Ana Sayfa`
  Bugün yapılacaklar, bekleyen müşteri onayları, muhasebeye aktarılacak net satırlar
- `Sigorta Mutabakatı`
  Poliçe listesi import, paket/fiyat kontrolü, müşteri bazlı satır netleştirme
- `Otomotiv Mutabakatı`
  TARS/Power BI verisi import, hizmet kullanım ve fiyat kontrolü
- `Müşteri Onay Bekleyenler`
  Gönderilen, bekleyen, itirazlı kayıtlar
- `Muhasebeye Gönderilecekler`
  Onaylanmış satırların muhasebe talimatına dönüşmesi
- `Kesilen Faturalar`
  Fatura no, tarih, vade, durum
- `Açık Alacaklar`
  Açık, kısmi tahsil, kapanan kayıtlar
- `Tahsilat Yönetim Raporu`
  Excel'deki yönetici raporunun sistem sürümü

### P2

- `Mutabakat Kalem Detayı`
  Satır bazlı karşılaştırma, sözleşme maddesi, müşteri notları
- `İtiraz Yönetimi`
  İtiraz nedenleri, çözüm notları, tekrar gönderim
- `Tahsilat Hareketleri`
  Tahsil tarihleri ve ödeme kırılımları
- `Riskli Müşteriler`
  Gecikme, oran ve pay bazlı izleme

### P3

- Doğrudan entegrasyonlar
  Logo, Power BI, TARS API entegrasyonları
- Otomatik uyarılar
  Vade yaklaşanlar, uzun süre yanıt vermeyen müşteriler
- Yönetim PDF/Excel rapor paketleri

## Veri Modeli Taslağı

### Mutabakat tarafı

- `ReconciliationBatch`
  Kaynak yükleme paketi
- `ReconciliationSourceRow`
  Ham satır
- `ReconciliationCase`
  Müşteri + dönem + akış bazlı mutabakat dosyası
- `ReconciliationLine`
  Kontrat, ürün/hizmet, adet, birim fiyat, toplam
- `ReconciliationDecision`
  Kontrol, müşteri onayı, itiraz kararları
- `AccountingInstruction`
  Muhasebeye gönderilecek net satırlar

### Faturalama ve tahsilat tarafı

- `IssuedInvoice`
- `ReceivableItem`
- `CollectionTransaction`
- `AgingSnapshot`

## Statü Taslağı

### Mutabakat

- `Imported`
- `UnderControl`
- `PricingMatched`
- `SentToCustomer`
- `CustomerApproved`
- `CustomerDisputed`
- `ReadyForAccounting`
- `SentToAccounting`

### Fatura

- `AwaitingInvoice`
- `PartiallyInvoiced`
- `Invoiced`

### Tahsilat

- `Open`
- `NotDue`
- `Overdue`
- `PartiallyCollected`
- `Collected`
- `Disputed`
- `WrittenOff`

## Faz Planı

### Faz 1 — Mutabakat Yönetimi MVP

Hedef:

- Sigorta ve otomotiv akışlarının sisteme alınması
- Dosya import + önizleme
- Sözleşme fiyat eşleştirme
- Müşteri onay süreci
- Muhasebeye aktarım listesi

Teslim:

- 4 temel ekran
- Çekirdek entity'ler
- Temel statüler
- Audit izleri

### Faz 2 — Faturalama ve Açık Alacak Takibi

Hedef:

- Muhasebeye gönderilen satırların fatura durumunu izlemek
- Fatura sonrası açık alacak havuzunu kurmak
- Vade takibini başlatmak

Teslim:

- Fatura ekranları
- Açık alacak havuzu
- Yaşlandırma mantığı

### Faz 3 — Tahsilat ve Yönetim Raporları

Hedef:

- Tahsilat hareketleri
- Kısmi tahsilat
- Yönetim dashboard'u
- Excel rapor mantığının sistemleştirilmesi

Teslim:

- Tahsilat ekranları
- KPI kartları
- Grup bazlı raporlar

## MVP Sınırı

İlk sürümde hedef:

- Excel/CSV import destekli çalışmak
- Harici sistemlere doğrudan yazmamak
- Muhasebe aktarımını sistem içi kayıt ve dışa aktarılabilir paket olarak üretmek
- Tahsilat raporlarında yönetim için gerekli ana KPI'ları vermek

İlk sürümde ertelenebilir:

- Doğrudan Logo entegrasyonu
- Power BI canlı veri çekimi
- Tam otomatik e-posta/uyarı orkestrasyonu
- Gelişmiş dispute workflow

## Mimari Notlar

- Bu modül mevcut bütçe yapısıyla aynı kullanıcı, şirket ve yetkilendirme çatısını kullanmalı.
- Sigorta ve otomotiv aynı modül içinde olacak ama farklı iş akışı olarak modellenmeli.
- Teknik statüler backend'de kalabilir; UI'da kullanıcı diline çevrilmeli.
- Tahsilat raporları, mutabakat ve faturalaşma çıktılarının sonucu olmalı; bunların yerine geçmemeli.

## İlk Uygulama Adımı

Kodlamaya başlamadan önce şu sırayla ilerlemek en sağlıklısı:

1. Domain dili ve entity isimlerini netleştir
2. Sigorta ve otomotiv import şablonlarını tanımla
3. Mutabakat statü makinesini tasarla
4. Muhasebe aktarım paketinin veri sözleşmesini çıkar
5. Faz 1 ekranlarını wireframe/backlog seviyesinde kesinleştir

## Başarı Ölçütü

Bu modül başarılı sayılmalıysa kullanıcı artık Excel dışında şu akışı uçtan uca izleyebilmelidir:

- kaynak verinin gelişi
- müşteri ile mutabakat durumu
- muhasebeye giden net kayıt
- kesilen fatura
- açık alacak
- tahsilat sonucu
