# Bütçe Yönetim Akışı

Bu doküman, sistemde bütçenin nasıl oluşturulduğunu, onaylandığını ve revize edildiğini kullanıcı gözüyle özetler.

## Temel Model

Sistem üç ana kavram üzerinden çalışır:

- `Bütçe Yılı`: Çalışılan mali yıl
- `Versiyon`: Aynı yıl için oluşturulan bütçe sürümü
- `Durum`: Bir versiyonun onay sürecindeki yeri

## Güncel Durumlar

Versiyon yaşam döngüsü:

`Draft -> PendingFinance -> PendingCfo -> Active`

Ek durumlar:

- `Rejected`: Düzeltme için geri çevrilmiş versiyon
- `Archived`: Kullanımdan kaldırılmış eski aktif versiyon

## Rol Bazlı Akış

### FinanceManager

- Yeni bütçe yılı açar
- Yeni taslak versiyon oluşturur
- Taslak üzerinde veri girişini ve düzenlemeyi yapar
- Taslağı finans onayına gönderir
- Gerekirse versiyonu reddeder veya arşivler
- Aktif versiyondan yeni revizyon taslağı açar

### Cfo

- Finans kontrolünden geçen versiyonu onaylar
- Onayla birlikte versiyonu yürürlüğe alır (`Active`)

### Viewer

- Sonuçları ve aktif bütçeyi görüntüler
- Düzenleme ve onay işlemi yapmaz

## Operasyonel Kullanım Sırası

1. `Bütçe Dönemleri / Versiyonları` ekranında ilgili yıl seçilir veya yeni yıl oluşturulur.
2. O yıl için yeni bir taslak versiyon açılır.
3. `Bütçe Planlama`, `Gider Girişi`, `Gerçekleşen`, `Özel Kalemler` gibi ekranlarda çalışma yapılır.
4. Gerekirse hızlı işlemler kullanılır:
   - Geçen yılın aktif bütçesinden kopyala
   - Yüzdesel büyüt / küçült
5. Taslak tamamlanınca onaya gönderilir.
6. Finans onayı sonrası CFO onayı alınır.
7. CFO onayıyla versiyon aktif olur.
8. Yeni bir değişiklik ihtiyacında aktif versiyondan revizyon taslağı açılır.

## Önemli Kurallar

- Sadece `Draft` ve `Rejected` versiyonlar düzenlenebilir.
- `PendingFinance`, `PendingCfo`, `Active` ve `Archived` versiyonlarda veri girişi yapılamaz.
- Aynı yıl için aynı anda tek aktif versiyon bulunur.
- Aktif versiyondan yeni revizyon açıldığında çalışma yeni taslak üzerinden devam eder.
- Kaynak yıldan kopyalama işlemleri yalnızca ilgili yılın `Active` versiyonunu baz alır.

## Ekranların Kullanım Amacı

- `Bütçe Dönemleri / Versiyonları`
  Yıl açma, versiyon oluşturma, onaya gönderme, onaylama, reddetme, arşivleme
- `Bütçe Planlama`
  Gelir ve hasar bütçesi üzerinde çalışma
- `Gider Girişi`
  Opex kalemlerini taslak versiyon üzerinde yönetme
- `Approvals`
  Onay bekleyen ve sonuçlanmış versiyonları topluca izleme

## Kullanıcı İçin Kısa Ezber

- Çalışılacak yer: `Draft`
- Bekleyen kontrol: `PendingFinance`
- Son karar: `PendingCfo`
- Canlı bütçe: `Active`
- Düzeltilecek sürüm: `Rejected`
- Eski sürüm: `Archived`
