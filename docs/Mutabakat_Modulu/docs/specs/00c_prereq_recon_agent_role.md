# Önkoşul Spec #3 — ReconAgent Rolü ve RBAC Genişletmesi

- **Tarih:** 2026-04-19
- **Durum:** Hazır, uygulanmayı bekliyor
- **Bağlı olduğu:** [`01_phase1_domain_model.md`](./01_phase1_domain_model.md) §11 (RBAC matrisi)
- **Amaç:** Mutabakat ekibinin yetki kapsamını mevcut rol hiyerarşisine deterministik olarak eklemek, yanlışlıkla Finance/CFO yetkileriyle karışmasını engellemek.

## 1. Mevcut Rol Hiyerarşisi

Mevcut sistemde (bütçe modülü) 5 rol var:

| Rol | Kapsam |
|---|---|
| `Admin` | Tüm yetkiler, konfigürasyon, kullanıcı yönetimi |
| `Cfo` | Versiyon onayı, bütçe kilitleme |
| `FinanceManager` | Bütçe hazırlık, versiyon submit |
| `DepartmentHead` | Kendi departmanı için bütçe giriş |
| `Viewer` | Salt okunur |

## 2. Yeni Rol — ReconAgent

### 2.1 Tanım

Müşteri Deneyim / Mutabakat Ekibi üyelerinin kullanacağı rol. Kapsam:

- Sigorta ve otomotiv mutabakatı oluşturmak, düzenlemek
- Line seviyesinde dispute işlemek
- Müşteriye mutabakat gönderimini tetiklemek
- Muhasebeye aktarım talebini oluşturmak (**ama muhasebeye göndermek/onaylamak yetkisi yok**)

### 2.2 Rol Konumu

```
Admin
  └─ Cfo
       └─ FinanceManager
            └─ ReconAgent (YENİ)
                 └─ DepartmentHead
                      └─ Viewer
```

Not: `ReconAgent` mali etkili onay yetkisine sahip değil. Muhasebeye export `FinanceManager` veya üstü onayı ile yapılır. Bu, görev ayrılığı (segregation of duties) için kritik.

## 3. Yetki Matrisi (Mutabakat Modülü)

| Aksiyon | Admin | Cfo | FinanceManager | ReconAgent | DeptHead | Viewer |
|---|---|---|---|---|---|---|
| Batch import | ✓ | — | ✓ | ✓ | — | — |
| Batch sil (Draft) | ✓ | — | ✓ | ✓ | — | — |
| Case sahipliği üstlen | ✓ | — | ✓ | ✓ | — | — |
| Line düzenle / fiyat güncelle | ✓ | — | ✓ | ✓ | — | — |
| Müşteriye gönder | ✓ | ✓ | ✓ | ✓ | — | — |
| Müşteri cevabı kaydet | ✓ | ✓ | ✓ | ✓ | — | — |
| Muhasebeye export | ✓ | ✓ | ✓ | — | — | — |
| Muhasebeye ACK kaydet | ✓ | ✓ | ✓ | — | — | — |
| Risk kuralı değiştir | ✓ | ✓ | — | — | — | — |
| Contract / PriceBook onayı | ✓ | ✓ | — | — | — | — |
| PriceBook kalem girişi (Draft) | ✓ | — | ✓ | ✓ | — | — |
| Raporları görüntüle | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Sadece kendi tenant'ı | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## 4. Policy Tanımları (OpenIddict / ASP.NET Authorization)

Mevcut proje `Authorization Policy` pattern'i kullanıyor. Yeni policy'ler:

```csharp
// Reconciliation module policies
options.AddPolicy("Reconciliation.Import",        p => p.RequireRole("Admin", "FinanceManager", "ReconAgent"));
options.AddPolicy("Reconciliation.Manage",        p => p.RequireRole("Admin", "FinanceManager", "ReconAgent"));
options.AddPolicy("Reconciliation.SendToCustomer", p => p.RequireRole("Admin", "Cfo", "FinanceManager", "ReconAgent"));
options.AddPolicy("Reconciliation.ExportAccounting", p => p.RequireRole("Admin", "Cfo", "FinanceManager"));
options.AddPolicy("Reconciliation.AckAccounting", p => p.RequireRole("Admin", "Cfo", "FinanceManager"));
options.AddPolicy("Reconciliation.ConfigRisk",    p => p.RequireRole("Admin", "Cfo"));
options.AddPolicy("Reconciliation.ViewReports",   p => p.RequireAuthenticatedUser()); // tüm roller

// PriceBook policies
options.AddPolicy("PriceBook.Edit",     p => p.RequireRole("Admin", "FinanceManager", "ReconAgent"));
options.AddPolicy("PriceBook.Approve",  p => p.RequireRole("Admin", "Cfo"));
```

Controller'larda kullanım:
```csharp
[Authorize(Policy = "Reconciliation.ExportAccounting")]
[HttpPost("instructions/{id}/export")]
public async Task<IActionResult> Export(Guid id) { ... }
```

## 5. Görev Ayrılığı Kontrolleri

Aşağıdaki kural iş katmanında (domain service) zorunlu:

- **Aynı kullanıcı bir case'i müşteriye gönderip aynı zamanda muhasebeye export edemez** (eğer `ReconAgent` rolündeyse zaten yapamaz; `FinanceManager` ise iki farklı kullanıcı gerekir).
- **Aynı kullanıcı PriceBook oluşturup onaylayamaz.**
- **ReconAgent kendi case'inin muhasebe exportu için Finance'a bildirim gönderebilir ama kendisi export edemez.**

Bu kurallar integration test ile doğrulanır.

## 6. Seed Kullanıcılar

`Development` ortamı için yeni test kullanıcısı:

| E-posta | Rol | Şifre |
|---|---|---|
| `recon@tag.local` | ReconAgent | `Devpass!2026` |

Staging/production için: mevcut `IdentitySeeder` bootstrap akışından geçer; ilk ReconAgent Admin tarafından davet edilir.

## 7. Audit Event Tipleri

Yeni audit event'leri (mevcut `audit_log` partition tablosuna yazılır):

- `RoleAssigned` — kullanıcı rolü değiştirildiğinde (mevcut event'i kullan)
- `ReconcilationCaseOwnershipChanged`
- `ReconcilationSentToCustomer`
- `ReconcilationCustomerResponseReceived`
- `AccountingInstructionExported`
- `AccountingInstructionAcked`
- `PriceBookApproved`
- `RiskRuleChanged`

Her event'te: `actor_user_id`, `actor_role`, `tenant_id`, `entity_id`, `timestamp`, `context_json`.

## 8. UI Değişiklikleri

- **User Edit** ekranında rol listesine `ReconAgent` eklenir.
- Rol kısa açıklaması: "Mutabakat ekibi — sigorta ve otomotiv mutabakat süreçlerini yürütür."
- Admin panelinde rol izin matrisi okunabilir (policy listesi + açıklama).

## 9. Test Kriterleri

### Unit
- Policy evaluation: ReconAgent ExportAccounting policy'sini geçemiyor
- Policy evaluation: FinanceManager hem SendToCustomer hem ExportAccounting geçiyor

### Integration
- ReconAgent kullanıcı `POST /instructions/{id}/export` çağırırsa **403 Forbidden** alıyor
- FinanceManager aynı çağrıyı başarıyla yapıyor
- Görev ayrılığı: Aynı kullanıcı PriceBook oluşturup onaylamaya çalışırsa domain exception fırlatılır

### UAT
- Mutabakat ekibi üyesi kendi hesabıyla mutabakatı baştan sona taşıyabiliyor ama muhasebe butonu gri görünüyor

## 10. Kabul Kriterleri

- [ ] `ReconAgent` rolü seed edildi
- [ ] 9 yeni authorization policy tanımlandı
- [ ] Tüm Reconciliation/PriceBook controller'larında policy attribute'ları mevcut
- [ ] Görev ayrılığı kuralları domain service'te zorlanıyor
- [ ] Integration test: rol bazlı 403 senaryoları geçti
- [ ] Audit event tipleri kayıtlı
- [ ] Admin panelinde rol açıklaması görünüyor
- [ ] Dev seed: `recon@tag.local` kullanıcısı çalışıyor

## 11. Tahmini Efor

| İş | Efor |
|---|---|
| Rol + policy tanımları | 0.5 gün |
| Controller attribute güncellemeleri | 0.5 gün |
| Görev ayrılığı domain servisleri | 1 gün |
| Integration test (403 senaryoları) | 0.5 gün |
| UI rol seçim entegrasyonu | 0.5 gün |
| Seed + dokümantasyon | 0.5 gün |
| **Toplam** | **3.5 gün** |

## 12. KVKK Notu

- Rol ataması → audit log'a yazılıyor (mevcut)
- ReconAgent kullanıcıları müşteri listelerini görür → KVKK aydınlatma metninde "müşteri deneyim ekibi erişimi" kapsamı geçerli
- Muhasebeye export dosyası → e-posta eki olarak gönderilmemeli; sistem içinde indirilebilir link (Faz 1'de link, Faz 2'de direkt API). Ek e-posta gönderimi yapılırsa KVKK log zorunlu.
