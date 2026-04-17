# Runbook — FinOps Tur Production Operations

> **Durum:** F6 başlangıç stub. F8+ güvenlik hardening + incident response fazında detaylandırılacak.

## Hızlı Referans

| Sorun | İlk Adım | Detay |
|---|---|---|
| API 503 döner | `/health/ready` kontrolü | Aşağıda "Health Check Diagnostik" |
| Hangfire job'lar çalışmıyor | `/hangfire` dashboard (Admin rolü) | "Recurring Jobs" bölümü |
| Audit partition INSERT hatası | `AuditPartitionMaintenanceJob` durumu | "Audit Partition Maintenance" |
| TCMB kur senkronizasyonu atlanmış | Seq `job_context=hangfire` filtreleyin | "TCMB Retry Mantığı" |
| SPA login başarısız | OIDC X509 cert yüklü mü? | `infra/release/README.md` §3 |
| Import 409 döner | Eşzamanlı import | "Advisory Lock Semantiği" |
| PDF oluşturma fail | QuestPDF font register + license | `QuestPdfFontBootstrap` |

## Health Check Diagnostik

- `/health/live` — süreç canlılığı; 200 = API süreci çalışıyor (DB'yi sorgulamaz)
- `/health/ready` — hazır olma; `postgres` (DbContextCheck) + `hangfire-storage` (IMonitoringApi ping) kontrolü

### 503 "postgres" unhealthy

```bash
# Docker ortamında
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml logs postgres | tail -50

# Railway ortamında
railway logs --service postgres --tail 50
```

### 503 "hangfire-storage" unhealthy

Hangfire tabloları (`hangfire.*` schema) migrate edilmemiş olabilir. API ilk startta schema'yı kendi otomatik oluşturur (`UsePostgreSqlStorage` default `PrepareSchemaIfNecessary = true`).

## Audit Partition Maintenance

- **Cron:** Her ayın 1'i 02:00 Europe/Istanbul.
- **İş:** +3 ay partition CREATE IF NOT EXISTS + 84 ay+ partition DETACH + DROP.
- **Manuel tetikleme:** `/hangfire` → Recurring Jobs → `audit-partition-maintenance` → "Trigger now".
- **Partition eksikse:** Manual SQL tetikleme örneği (superuser bağlantısı):
  ```sql
  CREATE TABLE IF NOT EXISTS audit_logs_2027_01 PARTITION OF audit_logs
      FOR VALUES FROM ('2027-01-01 00:00:00+00') TO ('2027-02-01 00:00:00+00');
  GRANT INSERT, SELECT ON audit_logs_2027_01 TO budget_app;
  ```

## TCMB Retry Mantığı

- **Cron:** İş günleri 15:45 Europe/Istanbul.
- **Polly:** 3 retry exponential backoff, yalnız `HttpRequestException` retryable.
- **Fallback:** Tüm retry'lar tükenirse önceki iş günü kuru çekilir (hafta sonu atlanır).
- **Manuel senkronizasyon:** `POST /api/v1/fx/rates/sync?date=YYYY-MM-DD` (Finance rolü) — hata verirse upstream TCMB durumu kontrol edin.

## Advisory Lock Semantiği

- `pg_try_advisory_xact_lock` transaction scope'lu; commit/rollback'te otomatik serbest kalır — manuel unlock yok.
- HTTP 409 "Bu şirket için zaten bir yükleme devam ediyor" → başka bir tenant session aynı `(company_id, resource)` için aktif commit çalıştırıyor.
- Lock 5 dakikadan fazla sürerse olası deadlock/çökmüş session:
  ```sql
  -- Aktif advisory lock'ları listele
  SELECT locktype, database, classid, objid, objsubid, pid, granted
  FROM pg_locks
  WHERE locktype = 'advisory';

  -- Sorunlu PID'i terminate et (son çare)
  SELECT pg_terminate_backend(<pid>);
  ```

## Rollback (< 3 dk hedef)

1. Railway dashboard → Service → Deployments → önceki stable deployment → "Redeploy"
2. Migration geri alma **yapılmaz** — EF migration'lar additive; schema'ya dokunan rollback ayrı migration ile ileri sarılır
3. Client deploy'u ayrıdır; SPA sürümü ile API sürümü uyumsuzluk varsa SPA fallback (önceki build) yeterli

## Veri Kurtarma

- **audit_logs partition yanlışlıkla drop**: `AuditPartitionMaintenanceJob` `DETACH` + `DROP IF EXISTS` sırası kullanır; DETACH sonrası ayrı tablo olarak kısa süre erişilebilir. Postgres günlük backup (Railway managed) en son snapshot'tan restore.
- **BudgetEntry yanlışlıkla commit**: Import audit log'dan `IMPORT_COMMITTED` event + `NewValuesJson` inspect → etkilenen version arşivle, yeni version aç, onay akışı tekrar.
- **Cross-tenant veri karışması**: İmkansız (RLS FORCE + `budget_app` NOBYPASSRLS). Şüphe varsa: `SELECT * FROM pg_policies WHERE tablename IN (...)` + `SELECT rolname, rolbypassrls FROM pg_roles` doğrulayın.

## İletişim + Eskalasyon

| Konu | İletişim |
|---|---|
| Incident response | Şef mühendis (iş saati) / on-call (24/7) |
| Güvenlik vakası | Güvenlik ekibi + KVKK sorumlusu 72 saat içinde |
| Veri kurtarma | DBA + Railway support (backup restore için) |

## TODO — F7+

- [ ] Daha detaylı performance troubleshooting (p95 SLO + k6 sonuçları)
- [ ] DB restore pratik adımları (son backup'tan point-in-time)
- [ ] Seq dashboard + alert kurulumu (memory, disk, p95)
- [ ] OWASP ZAP baseline sonuçları + remediation playbook
