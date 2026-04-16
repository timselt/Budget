# Tahsilat Modulu Entegrasyonu + Sovereign Ledger Design System

**Tarih:** 2026-04-16
**Durum:** Onaylandi
**Kararlar:** Tek musteri tablosu, tum uygulama tasarim gecisi, ayri CollectionImportService, Tailwind + CSS custom properties

---

## 1. Veri Modeli

### Customer entity genisletmesi
- `accountNo` (string, nullable) — muhasebe hesap numarasi (1500xxxxxx)
- `fullTitle` (string, nullable) — tam ticari unvan

### Yeni entity: ImportPeriod
- id, companyId, segmentId
- importDate, fileName, periodLabel
- totalAmount, overdueAmount, pendingAmount
- status (PROCESSING / COMPLETED / FAILED)

### Yeni entity: CollectionInvoice
- id, companyId, periodId, customerId
- invoiceNo, transactionDate, dueDate
- daysDiff, amount, note
- status (OVERDUE / PENDING / PAID)

### Iliskiler
- Segment (1) -> Customer (N) — mevcut
- Customer (1) -> CollectionInvoice (N)
- ImportPeriod (1) -> CollectionInvoice (N)
- ImportPeriod (N) -> Segment (1)

---

## 2. Backend Servisleri

| Servis | Sorumluluk |
|--------|-----------|
| CollectionImportService | Excel parse (1500xxx hiyerarsisi), musteri eslestirme, fatura kayit |
| CollectionCalculationService | KPI hesaplama: gecikme orani, risk seviyesi, konsantrasyon, aging |
| CollectionQueryService | Dashboard/rapor sorgulari, segment/musteri filtreleme |

### API Endpoints
- POST /api/v1/collections/import — Excel yukleme
- GET /api/v1/collections/dashboard/consolidated — Konsolide KPI
- GET /api/v1/collections/dashboard/segment/{segmentId} — Segment dashboard
- GET /api/v1/collections/customers/{id}/invoices — Musteri fatura detay
- GET /api/v1/collections/periods — Import donemleri listesi
- GET /api/v1/collections/top-overdue?n=10 — Top N vadesi gecen

---

## 3. Frontend Sayfalari

| Sayfa | Yol | Icerik |
|-------|-----|--------|
| Konsolide Dashboard | /tahsilat | 4 KPI karti + segment karsilastirma + risk dagilimi + Top 10 |
| Segment Dashboard | /tahsilat/segment/:id | Yonetim Raporu tablosu (AG-Grid) + ozet + Top 10 panelleri |
| Musteri Detay | /customers/:id | Mevcut sayfaya tahsilat tabi eklenir |
| Veri Yukleme | /tahsilat/import | Drag-drop upload + segment secimi + dogrulama raporu |

---

## 4. Sovereign Ledger Design System

### Tokenlar
```css
:root {
  --sl-surface: #f7f9fb;
  --sl-surface-low: #f2f4f6;
  --sl-surface-lowest: #ffffff;
  --sl-surface-high: #e8ebef;
  --sl-on-surface: #191c1e;
  --sl-on-surface-variant: #42474f;
  --sl-primary: #00355f;
  --sl-primary-container: #0f4c81;
  --sl-on-primary: #ffffff;
  --sl-error: #ba1a1a;
  --sl-error-container: #ffdad6;
  --sl-tertiary: #003b35;
  --sl-on-tertiary-container: #5eccbe;
  --sl-outline-variant: #c2c7d1;
  --font-display: 'Manrope', sans-serif;
  --font-body: 'Inter', sans-serif;
  --sl-ghost-border: rgba(194, 199, 209, 0.15);
  --sl-glass-bg: rgba(255, 255, 255, 0.85);
  --sl-glass-blur: blur(12px);
  --sl-shadow-ambient: 0 12px 32px -4px rgba(25, 28, 30, 0.08);
}
```

### Kurallar
- No-line: border yerine background shift + spacing
- Glassmorphism: modal/dropdown icin blur + opacity
- Tonal layering: shadow yerine renk kontrasti
- Typography: Manrope (basliklar), Inter (veri/body)
- Ghost border: outline-variant %15 opacity (sadece erisilebilirlik icin)
- Radius: md (0.375rem), lg (0.5rem), full (9999px)

### Guncellenecek componentlar
- ChartCard, KpiCard, Sidebar, AppLayout
- Tablolar, Butonlar, Inputlar, Modal/dropdown
- Status chipleri

---

## 5. Uygulama Sirasi

| Faz | Icerik | Bagimlilik |
|-----|--------|-----------|
| F1 | Design tokens + font yukleme + Tailwind config | — |
| F2 | Base componentlari guncelle (Button, Input, Card, Table, Sidebar, Layout) | F1 |
| F3 | Mevcut butce sayfalarini yeni tasarima gecir | F2 |
| F4 | Backend: Entityler + migration + CollectionImportService | — |
| F5 | Backend: CollectionCalculationService + API endpoints | F4 |
| F6 | Frontend: Tahsilat sayfalari (Konsolide, Segment, Import) | F2, F5 |
| F7 | Musteri detay sayfasina tahsilat tabi | F5 |

F1-F3 (tasarim) ve F4-F5 (backend) paralel calisabilir.
