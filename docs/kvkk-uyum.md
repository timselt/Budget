# KVKK Uyum Dokümanı — FinOps Tur

> **Durum:** F6 başlangıç stub. Hukuk tarafıyla gözden geçirilmeden prod'da referans olarak kullanılmaz. Güncelleme F7+ "Legal Review" fazında.

## Veri Envanteri

| Veri Kategorisi | Tablo / Sütun | Hassasiyet | Kaynak |
|---|---|---|---|
| Kullanıcı kimlik | `asp_net_users.email`, `user_name`, `display_name` | PII | OpenIddict kayıt |
| Kullanıcı yetki | `asp_net_user_roles`, `user_companies` | İş rolü | IdentitySeeder / admin |
| Oturum | Access/refresh token (localStorage) | Token (ADR-0011 F8+'da httpOnly cookie'ye geçer) | OpenIddict |
| Müşteri bilgisi | `customers.name`, `code`, `segment_id` | Ticari | Excel import / master data |
| Finansal veri | `budget_entries`, `actual_entries`, `expense_entries`, `fx_rates` | Ticari / şirket sırrı | Kullanıcı girişi + TCMB |
| Denetim kaydı | `audit_logs` (7 yıl, aylık partition) | Hukuki zorunluluk | AuditLogger — her auth olayı, import, CRUD |
| İstek IP | `audit_logs.ip_address` | PII (KVKK kişisel veri) | TenantResolutionMiddleware |

## İşlenme Dayanağı

- **Meşru menfaat** (KVKK m.5/2/f): `audit_logs.ip_address` güvenlik olayı analizi için ham tutulur; Seq log'larında PiiMaskingEnricher ile maskelenir (ADR-0007 §2.4).
- **Açık rıza** — kullanıcı kayıt formunda alınır; `asp_net_users.consent_given_at` sütunu eklenmesi önerilir (F7+).
- **Hukuki yükümlülük** — audit_logs 7 yıl retention (`AuditPartitionMaintenanceJob` KVKK m.7 silme + finansal kanunlar saklama).

## Teknik Tedbirler

- **Şifreleme:**
  - Disk: Railway managed Postgres (at-rest encryption)
  - Transit: HTTPS zorunlu (Production'da `disableTransportSecurity=false`)
  - Şifre hash: ASP.NET Identity (PBKDF2, Identity default)
- **Erişim kontrolü:**
  - Multi-tenant RLS (PostgreSQL `FORCE ROW LEVEL SECURITY`)
  - Role-based (`Admin`, `Cfo`, `FinanceManager`, `DepartmentHead`, `Viewer`)
  - OpenIddict access token 30 dk, refresh token 14 gün
- **Log hijyeni (ADR-0007 §2.4):** Seq'e giden log'larda `Email` → `u***@domain`, `IpAddress` → `x.x.x.***` mask; `audit_logs` tablosunda ham kalır (meşru menfaat).
- **Exception redaction (ADR-0008 §2.5):** Connection string + cert path + filesystem path HTTP response'larda + Log.Fatal'da `[REDACTED]`.

## Veri Sahibi Hakları (KVKK m.11)

Kullanıcı portal self-servis F7+'da planlanmıştır. Şu anda manuel süreç:

- **Bilgi isteme** (m.11/1-a): DPO'ya e-posta → `SELECT * FROM asp_net_users WHERE email = ?` + ilgili `audit_logs` + `user_companies`
- **Silme** (m.11/1-e): Admin `DELETE FROM asp_net_users` + cascade; `audit_logs` kayıtları **silinmez** (hukuki zorunluluk, 7 yıl) ancak `user_id` anonimize edilebilir
- **Düzeltme** (m.11/1-d): Admin panel üzerinden user profile update

## Saklama Süreleri

| Veri | Süre | Mekanizma |
|---|---|---|
| `audit_logs` | 84 ay (7 yıl) | `AuditPartitionMaintenanceJob` aylık DETACH + DROP |
| Kullanıcı hesabı | Aktif + istek üzerine silme | ASP.NET Identity |
| Kullanıcı silinse de audit | 7 yıl | Partition retention |
| `fx_rates` | Sınırsız (tarihsel kur) | N/A |
| Seq structured log | 90 gün (Seq retention) | Seq config |
| PostgreSQL backup | 30 gün (Railway managed) | Railway default |

## DPIA — Riske Maruz Kalan Veri

| Risk | Etki | Önlem |
|---|---|---|
| localStorage token + XSS | Token teft, hesap ele geçirme | CSP (F7+), ADR-0011 PKCE migration (F8+) |
| Cross-tenant veri sızıntısı | Yüksek | RLS FORCE + `budget_app` NOBYPASSRLS + 13 integration test |
| Audit log bypass | Hukuki risk (7 yıl retention zorunluluğu) | DB role seviyesinde INSERT-only grant; DELETE yetkisi yok |
| Excel import DoS | Service hizmet aksaması | Tenant stream limit 10 MB / 50k satır + `RequestSizeLimit` |
| TCMB silent failure | Yanlış FX → yanlış TRY tutarlar | `HttpRequestException` + `InvalidOperationException` fırlatma + Polly retry + Seq alert (ADR-0006 §Bilinen Tuzak #3) |

## TODO — F7+ Hukuk Gözden Geçirme

- [ ] Açık rıza metni + consent tracking kolonu
- [ ] Veri sahibi self-servis portal (KVKK m.11 otomasyonu)
- [ ] VERBIS kaydı (Veri Sorumluları Sicil Bilgi Sistemi)
- [ ] DPO (Data Protection Officer) görevlendirme
- [ ] Bulut sağlayıcı (Railway) yurt dışı transfer analizi → Frankfurt region (AB) KVKK için yeterli
- [ ] OWASP ZAP baseline + remediation sonuçları
