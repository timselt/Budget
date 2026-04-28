# Geliştirme Önerileri Listesi

İş tarafından gelen, henüz plan/ADR/PR'a dönüşmemiş operasyonel iyileştirme fikirleri buraya tarih sırasıyla eklenir. Her madde test/kullanım sırasında yakalanan bir "bu iş çok sürüyor / çok manuel" gözleminden gelir.

Test/kullanım oturumu bitince madde başlığı altında **Karar** bölümü açılır; orada hangi yöntemin seçildiği, önceliği, ve eğer plan'a/ADR'ye dönüştüyse referansı yazılır.

---

## 2026-04-27 — Toplu sözleşme oluşturma / yenileme

**Kaynak:** `admin@tag.local` test oturumu. Kullanıcı, Sompo Sigorta için tek bir Yol Yardım sözleşmesini Sözleşmeler ekranından manuel oluşturduktan sonra ölçeğin pratik olmadığını söyledi.

**Problem:**

- Pilot kapsamda 89 müşteri var, müşteri başına ortalama ~20 ürün/SKU varyantı düşünülüyor. Bu da yıllık bütçe başlangıcında **~1.780 sözleşme** demek.
- Mevcut akış: müşteri seç → Sözleşmeler → Yeni Sözleşme → ürün seç → tarih, fiyat, segment doldur → kaydet. Her sözleşme için ortalama 30–60 saniye girilse bile **toplam 15–30 saat manuel veri girişi**.
- Bu yük, bütçe dönemine başlamadan önce takvimde net bir tıkanıklık yaratır; muhasebe/operasyon ekibi bu işin yapılmasını sürekli erteler ya da Excel'de paralel takip ederek sistemin tek-doğru-kaynak iddiasını boşa çıkarır.

**İş bağlamı:**

- Sözleşmelerin büyük bölümü **dönem yenilemesi** — geçen yıl aynı müşteriye aynı ürün satılmıştı, yalnızca tarih + fiyat değişiyor. "Sıfırdan oluşturma" yalnızca yeni müşteri/yeni ürün senaryosunda geçerli.
- Aynı segment içinde (örn. tüm Sigorta müşterileri) tipik bir ürün seti tekrar ediyor — Yol Yardım, İkame Araç vb. Çok az müşteri tüm 4 ürünün dışında özel bir ürün alıyor.
- Fiyatın kendisi sözleşmeden bağımsız olarak **fiyat listesi (price book)** ile zaten yönetilebiliyor (ADR-0014); yani toplu üretimde fiyatı sözleşmeye gömmek yerine fiyat listesine bağlamak, manuel yükü azaltabilir.

**Aday yöntemler (sıralama önerisi: en hızlı kazanım → en kapsamlı):**

1. **Geçen dönemden kopyalama (clone)**
   "2026 sözleşmelerini 2027'ye kopyala" tek butonu. Tüm aktif sözleşmeler yeni döneme klonlanır; tarihler kaydırılır; fiyatlar (a) eski sözleşmeden, (b) güncel fiyat listesinden, ya da (c) %X enflasyon zammı uygulanmış olarak gelir. Operatör sadece **istisnaları** düzeltir.
   *Kazanım:* ~%80 sözleşme tek tıkla biter.

2. **Excel ile toplu içe aktarma**
   Müşterilerde zaten görülen "Excel'den İçe Aktar" butonunun benzeri sözleşmelerde. Şablon: müşteri kodu, ürün kodu, başlangıç, bitiş, birim fiyat (opsiyonel, yoksa price book), segment kodu. Validasyon: müşteri/ürün var mı, tarih çakışması var mı, kontrat kodu üretilebilir mi.
   *Kazanım:* yeni müşteri/yeni ürün dalgaları için ekstra hız; muhasebe ekibinin alıştığı Excel ergonomisi.

3. **Müşteri kartından çoklu ürün atama**
   Müşteri detay modal'ında "Bu müşteriye uygulanacak ürünleri seç" çoklu seçim alanı. Seçilen her ürün için arka planda otomatik sözleşme açılır; varsayılan tarih = aktif bütçe dönemi, varsayılan fiyat = fiyat listesinden.
   *Kazanım:* yeni müşteri eklenirken sözleşme adımı ayrı bir ekrana gitmeye gerek kalmıyor.

4. **Segment-bazlı varsayılan ürün profili**
   "Sigorta segmenti varsayılanları: Yol Yardım, İkame Araç, Konut" gibi bir profil tanımı. Yeni müşteri segmente atanınca ürünleri otomatik öner; operatör onay verir. Sapmalar (örn. "bu sigorta şirketi Konut almıyor") tek tek kaldırılır.
   *Kazanım:* tipik %90 senaryoda hiç manuel ürün seçimi yok.

**Yan etkiler / dikkat:**

- Fiyat listesi (price book) tarafının yeterince olgun olması gerekiyor — yoksa kopyalama/toplu üretim eski fiyatla giderek **yanlış bütçe** üretebilir. Bu işin önkoşulu fiyat listesi yönetiminin önce sağlamlaşması.
- Otomatik üretilen sözleşmelerin "Aktif" mi yoksa "Taslak" mı doğacağı karar gerektiriyor. Taslak ise muhasebe inceleyip onaylar; Aktif ise hatalı toplu girişler doğrudan bütçeyi etkiler. Konservatif tercih: **toplu üretilen tüm sözleşmeler Taslak doğar**.
- Klonlama senaryosunda kontrat kodu (ADR-0014, 14-segment) yeniden üretilmeli; aynı kodu tutmak versiyonlamayı bozar. "V1 → V2" akışı ya da yeni bir ChangeType (örn. `RENEWAL`) gerekebilir.

**Karar:** _(Test oturumu bitince muhasebe + ürün ile birlikte konuşulacak. O zamana kadar açık.)_

---

## 2026-04-27 — Bütçe Planlama > Versiyonlar ekranındaki buton karmaşası

**Kaynak:** Aynı test oturumu. Kullanıcı "yeni versiyon, yeni yıl, yeni taslak — hangisine basacağım, sayfa karışık" dedi.

**Problem:**

Sayfada aynı anda üç farklı "yeni" butonu görünüyor:

- **Yeni Yıl** (sağ üst, ikincil) — yepyeni bir mali yıl ekler
- **Yeni Versiyon** (sağ üst, kırmızı birincil)
- **+ Yeni Taslak** (boş state'in ortasında, kırmızı birincil)

İlk kullanıcı için **"Yeni Versiyon" ile "Yeni Taslak"**'ın farkı net değil. Aslında ikisi aynı kapıya çıkıyor (her ikisi de DRAFT versiyon oluşturuyor); fark sadece UI konumu — biri sayfanın üstünde her zaman görünüyor, diğeri yıl boşsa empty state CTA'sı olarak ortada beliriyor.

**İş bağlamı:**

İlk taslak oluşturma yılda 1 defa yapılan bir iş. Onun için sürekli görünen bir buton (Yeni Versiyon) gerekli değil; tersine, **boş state CTA'sı (Yeni Taslak) yeterince konuşkan**. Tecrübeli kullanıcılar için bile "yeni versiyon mu, yeni taslak mı" tereddüdü test sırasında ölçtüğümüz duraklama saniyelerini biriktirir.

**Aday yöntemler:**

1. **Empty state ile sürekli buton'u tek butonda birleştir.** Sayfa boşken büyük "Yeni Taslak" göster; en az bir versiyon varsa onun üstünde küçük "+ Yeni Versiyon" çık. Aynı anda ikisini gösterme.
2. **"Yeni Yıl"'ı ayrı bir alt-aksiyon menüsüne taşı.** Yılda bir basılan bir buton, sürekli görünür alanda yer kaplamasın — örn. yıl listesinin altında veya ⋯ menüsünde.
3. **Adım adım wizard.** İlk taslak oluşturma için kısa bir form: "Hangi yıl? → Versiyon adı? → Senaryo? → Tamam." Bu, ilk-defa-kullananın "şimdi ne yapmam gerek" hissini ortadan kaldırır.

**Karar:** _(Test sonrası konuşulacak.)_
