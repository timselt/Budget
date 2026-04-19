# Mutabakat, Faturalama ve Tahsilat Yönetimi — Modül Paketi

Bu klasör, bütçe sisteminin üzerine eklenecek yeni operasyon modülünün **tüm tasarım paketini** içerir. Claude Code / geliştirici ekibinin doğrudan referans alarak kodlamaya başlayabileceği şekilde hazırlandı.

## Paket İçeriği

```
Mutabakat_Modulu/
├── README.md                                      # Bu dosya — paketin kullanım kılavuzu
├── docs/
│   ├── RECONCILIATION_BILLING_COLLECTIONS.md      # İş akışı dokümantasyonu (yönetici okuması)
│   ├── BACKLOG.md                                 # Ürün backlog (ekran / entity / epik / sprint)
│   ├── plans/
│   │   └── 2026-04-19-reconciliation-billing-collections-plan.md   # Üst seviye plan
│   └── specs/
│       ├── 00a_prereq_customer_external_ref.md   # Önkoşul #1 — Customer alan genişletme
│       ├── 00b_prereq_pricebook.md               # Önkoşul #2 — Contract + PriceBook altyapısı
│       ├── 00c_prereq_recon_agent_role.md        # Önkoşul #3 — ReconAgent rolü + RBAC
│       ├── 01_phase1_domain_model.md             # Faz 1 teknik spec (developer brief)
│       ├── 02_sprint1_claude_code_prompt.md      # Sprint 1 Claude Code executable prompt
│       └── 03_parallel_prereq_orchestration.md   # 3 önkoşul paralel yürütme kılavuzu
└── analysis/
    └── EXCEL_ANALYSIS.md                          # Mevcut Tahsilat Excel'lerinin yapısal analizi
```

## Hangi Dosya Neye Hizmet Eder?

| Dosya | Hedef okuyucu | Amaç |
|---|---|---|
| `docs/RECONCILIATION_BILLING_COLLECTIONS.md` | Yönetim, ürün sahibi | Modülün ne iş yaptığını iş akışı diliyle anlat |
| `docs/plans/2026-04-19-...plan.md` | Proje yönetimi | Faz, kapsam, teslim sıralaması |
| `docs/specs/01_phase1_domain_model.md` | Geliştirici, mimari | Faz 1 için entity, statü, API, import şablonları |
| `docs/BACKLOG.md` | Ürün ekibi, sprint planlama | Ekran ve epik bazlı iş kırılımı |
| `analysis/EXCEL_ANALYSIS.md` | Tüm ekip | Mevcut Excel'in yapısal girdisi — sistem neye referans aldı |

## Süreç Özeti (Üç Cümlede)

1. **Mutabakat muhasebeden önce başlar.** Müşteri Deneyim / Mutabakat Ekibi, sigorta akışında poliçe listelerini veya otomotiv akışında TARS / Power BI kullanım verilerini alır, sözleşme fiyatlarıyla eşleştirir, müşteri ile netleştirir.
2. **Müşteri onayı sonrası muhasebeye aktarım** sistem içinde kayıtlı şekilde yapılır. Muhasebe ancak bu noktadan sonra devreye girer.
3. **Fatura sonrası yaşam** (açık alacak, yaşlandırma, tahsilat, yönetim raporu) aynı modülün sonraki fazlarında çözülür. Bugünkü Tahsilat Excel'leri bu fazın referansıdır.

## Faz Özeti

| Faz | Kapsam | Süre tahmini |
|---|---|---|
| **1 — Mutabakat MVP** | Import → Case → Line → Müşteri onayı → Muhasebe export | 6-8 hafta |
| **2 — Faturalama** | Kesilen fatura kaydı, açık alacak havuzu, vade motoru | 4-6 hafta |
| **3 — Tahsilat + Raporlar** | Tahsilat hareketi, kısmi allocation, yönetim dashboard'u | 6-8 hafta |

## Mevcut Bütçe Sistemine Nasıl Bağlanır?

- Aynı kullanıcı, şirket ve yetkilendirme çatısını kullanır (OpenIddict / Entra ID).
- Multi-tenant: her tabloda `company_id` + RLS (Day-1 kuralı).
- Audit: mevcut partition-based `audit_log` şemasına ek event tipleri.
- Raporlama: aynı ClosedXML + QuestPDF altyapısı.
- Frontend: aynı React 19 + TanStack Query + AG-Grid iskeleti.

## Uygulama Sırası

### Adım 1 — Önkoşullar (3 paralel Claude Code oturumu, ~1.5 hafta)

Orkestrasyon kılavuzu: [`03_parallel_prereq_orchestration.md`](./docs/specs/03_parallel_prereq_orchestration.md) — 3 hazır prompt, branch/merge stratejisi, Timur checklist.

| Spec | Efor (paralel) | Çıktı |
|---|---|---|
| [`00a_prereq_customer_external_ref.md`](./docs/specs/00a_prereq_customer_external_ref.md) | 2.5 gün | Customer alan genişletme + lookup endpoint |
| [`00b_prereq_pricebook.md`](./docs/specs/00b_prereq_pricebook.md) | ~7 gün | Contract + PriceBook + lookup + seed |
| [`00c_prereq_recon_agent_role.md`](./docs/specs/00c_prereq_recon_agent_role.md) | 3.5 gün | ReconAgent rolü + 9 policy |

Merge sırası zorunlu: **00a → 00b → 00c**.
Ek: Sözleşme fiyat seed verisi (3-5 pilot sigorta + 3-5 otomotiv).

### Adım 2 — Sprint 1 (2 hafta, Claude Code ile)

[`02_sprint1_claude_code_prompt.md`](./docs/specs/02_sprint1_claude_code_prompt.md) dosyasındaki prompt'u Claude Code'a ver. Çıktı: 8 entity + migration + import parser + batch listesi UI.

### Adım 3 — Sonraki sprint'ler

Sprint 2-4 plan detayı [`BACKLOG.md §9`](./docs/BACKLOG.md) içinde.

## Claude Code / Agent ile Nasıl Kullanılır?

Her geliştirme oturumunda Claude'a şu komutu verin:

```
Bağlam: FinOps Tur projesine Mutabakat, Faturalama ve Tahsilat Yönetimi modülü ekliyoruz.

Referans dosyalar:
- Mutabakat_Modulu/docs/RECONCILIATION_BILLING_COLLECTIONS.md  (iş akışı)
- Mutabakat_Modulu/docs/plans/2026-04-19-...plan.md             (plan)
- Mutabakat_Modulu/docs/specs/01_phase1_domain_model.md         (teknik spec)
- Mutabakat_Modulu/docs/BACKLOG.md                              (backlog)
- Mutabakat_Modulu/analysis/EXCEL_ANALYSIS.md                   (yapısal analiz)

Görev: <sprint ve epik adı>

Kurallar:
1. Önce ilgili referansları oku.
2. 3-7 maddelik mini-plan sun, onayımı bekle.
3. CLAUDE.md'deki Day-1 prensiplerine uy (multi-tenant, audit, RLS).
4. Her PR'da unit + integration test dahil.
5. State machine geçişleri için unit test zorunlu.
6. Migration'ları geri alınabilir (down) yaz.

Başla.
```

## Versiyon

- **Paket:** v1.0
- **Tarih:** 2026-04-19
- **Sahip:** Timur Selçuk Turan
- **Ürün sahibi (iş tarafı):** Müşteri Deneyim / Mutabakat Ekibi Yöneticisi
- **Teknik sahip:** FinOps Tur teknik lideri
