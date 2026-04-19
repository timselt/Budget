# Mutabakat, Faturalama ve Tahsilat Yönetimi

Bu doküman, bütçe sisteminin üzerine eklenecek yeni operasyon modülünün iş akışını açıklar. Amaç, bugün Excel dosyaları ve dış yazışmalarla yürüyen mutabakat, faturalama hazırlığı ve tahsilat takibini sistem içine taşımaktır.

## Kısa Özet

Bu modülün başlangıç noktası muhasebe değildir.

Süreç, `Müşteri Deneyim / Mutabakat Ekibi` tarafından yürütülen mutabakat operasyonu ile başlar. Muhasebe ancak müşteri ile netleşen kayıtlar sonrasında devreye girer. Excel ile yürütülen alacak, vade ve tahsilat raporları ise bu operasyonların sonraki aşamasını temsil eder.

## Temel Süreç

1. Kaynak veri gelir
2. Mutabakat ekibi kontrol eder
3. Müşteri ile netleştirilir
4. Muhasebeye fatura talimatı iletilir
5. Fatura kesilir
6. Açık alacak ve vade takibi başlar
7. Tahsilat yapılır
8. Yönetim raporları üretilir

## İki Ayrı Operasyon Akışı

### Sigorta

Sigorta şirketleri ilgili ayda ürettikleri poliçelere ait listeleri mutabakat ekibine gönderir.

Mutabakat ekibi:

- listeyi kontrol eder
- ilgili poliçelerde dahil edilen asistans paketlerini doğrular
- sözleşmede tanımlı fiyatları kontrol eder
- hangi kontrattan hangi üründen kaç adet fatura kesileceğini netleştirir
- müşteri ile mutabakat sağlar
- netleşen kayıtları muhasebeye iletir

Muhasebeye iletilen bilgi seti en az şu alanları içermelidir:

- müşteri
- dönem
- kontrat
- ürün
- adet
- birim fiyat
- toplam tutar

### Otomotiv

Otomotiv akışında ilk veri operasyon yönetim sistemi olan TARS'tan gelir. Veri Power BI üzerinden alınır.

Mutabakat ekibi:

- ilgili şirkete ait kullanım listesini alır
- hangi hizmetten kaç kullanım oluştuğunu tespit eder
- sözleşmedeki hizmet bedelleri ile eşler
- faturalanacak adet ve tutarı belirler
- müşteri onayına gönderir
- onay sonrası muhasebeye iletir

## Muhasebe Sonrası Süreç

Müşteri ile netleşen ve muhasebeye iletilen kayıtlar artık fatura sonrası yaşama geçer:

1. Muhasebe faturayı keser
2. Açık alacak oluşur
3. Vade izlenir
4. Tahsilat yapılır
5. Geciken, bekleyen ve kapanan alacaklar raporlanır

Bu aşamada bugün Excel ile takip edilen raporlar devreye girer.

## Excel Raporlarının Rolü

İncelenen tahsilat raporları, özellikle fatura sonrası yönetim görünümü için güçlü bir başlangıç sağlar. Bu raporların öne çıkan güçlü yönleri:

- toplam alacak özeti
- vadesi geçen / vadesi bekleyen ayrımı
- müşteri bazlı pay analizi
- risk seviyesi
- ortalama gecikme günü
- top 10 geciken ve yaklaşan müşteri listeleri

Ancak bu Excel yapısı tek başına süreç yönetimi sağlamaz. Şu bilgiler sistem dışında kalır:

- satır hangi mutabakat dosyasından geldi
- müşteri ne zaman onay verdi
- hangi satır muhasebeye iletildi
- fatura hangi kayıt için kesildi
- tahsilat hangi belgeyi kapattı

Bu yüzden sistem tasarımı iki katmanlı düşünülmelidir:

- `Mutabakat ve Faturalama Hazırlık`
- `Fatura Sonrası Tahsilat ve Raporlama`

## Önerilen Modül Yapısı

### 1. Mutabakat Yönetimi

- kaynak veri import
- sigorta ve otomotiv için ayrı çalışma alanı
- sözleşme ve fiyat eşleştirme
- müşteri onayı
- muhasebeye aktarım

### 2. Faturalama Takibi

- muhasebeye gönderilen kayıtlar
- kesilen faturalar
- kesilmeyi bekleyenler
- fatura tarihi ve vadesi

### 3. Tahsilat Yönetimi

- açık alacaklar
- vadesi geçenler
- vadesi bekleyenler
- kısmi tahsilatlar
- kapanan alacaklar

### 4. Yönetim Raporları

- toplam alacak
- gecikme oranı
- riskli müşteriler
- grup bazlı özet
- top 10 listeler

## Çekirdek Ekranlar

- `Mutabakat Ana Sayfa`
- `Sigorta Mutabakatı`
- `Otomotiv Mutabakatı`
- `Müşteri Onay Bekleyenler`
- `Muhasebeye Gönderilecekler`
- `Kesilen Faturalar`
- `Açık Alacaklar`
- `Tahsilat Yönetim Raporu`

## Çekirdek Veri Nesneleri

### Mutabakat tarafı

- `ReconciliationBatch`
- `ReconciliationSourceRow`
- `ReconciliationCase`
- `ReconciliationLine`
- `ReconciliationDecision`
- `AccountingInstruction`

### Fatura ve tahsilat tarafı

- `IssuedInvoice`
- `ReceivableItem`
- `CollectionTransaction`
- `AgingSnapshot`

## Önerilen Statüler

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

## MVP Yaklaşımı

İlk sürümün hedefi tam entegrasyon değil, operasyonun sistemleşmesidir.

İlk sürümde önerilen sınır:

- dosya tabanlı import ile başlamak
- sigorta ve otomotiv için ayrı mutabakat akışı kurmak
- müşteri onay ve muhasebe aktarım izini tutmak
- faturalaşma sonrası açık alacak görünümünü vermek
- Excel'deki ana yönetim KPI'larını dashboard'a taşımak

Sonraki fazlara bırakılabilir:

- doğrudan Logo entegrasyonu
- TARS / Power BI canlı entegrasyonu
- otomatik mail / hatırlatma orkestrasyonu
- gelişmiş dispute ve workflow otomasyonu

## Tasarım İlkeleri

- Kullanıcı sistemin neyi yönettiğini ilk bakışta anlamalı
- Sigorta ve otomotiv aynı menü altında ama ayrı iş akışı olarak görünmeli
- Teknik terimler UI'da sade kullanıcı diline çevrilmeli
- Süreç sahibi her aşamada belli olmalı
- Raporlar operasyonun sonucu olmalı, operasyonun yerine geçmemeli

## Doküman İlişkisi

- Uygulama planı: [`docs/plans/2026-04-19-reconciliation-billing-collections-plan.md`](/Users/timurselcukturan/Uygulamalar/Budget/docs/plans/2026-04-19-reconciliation-billing-collections-plan.md)
- Mevcut bütçe akışı: [`docs/BUDGET_WORKFLOW.md`](/Users/timurselcukturan/Uygulamalar/Budget/docs/BUDGET_WORKFLOW.md)
- Mimari kararlar: [`docs/architecture.md`](/Users/timurselcukturan/Uygulamalar/Budget/docs/architecture.md)
