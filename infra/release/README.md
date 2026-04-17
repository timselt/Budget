# FinOps Tur — Production Release Runbook

Bu dizin her prod release'de elle veya CI üzerinden çalıştırılan operasyonel adımları içerir. F1 (Operasyonel Kapanış) + F7 (Production Deploy) kapsamında üretilen scriptler şunlardır.

## 0. F7 Otomatik Deploy Akışı (CI'dan)

`.github/workflows/deploy.yml` her push'ta ilgili environment'a deploy eder:

- `develop` → **dev** (auto deploy)
- `main` → **staging** (auto deploy) → **production** (manual approval gate)

CI sırası her environment için:
1. Checkout + Railway CLI
2. `dotnet ef database update` (staging + prod, migration delta'sı varsa)
3. `rotate-db-password.sh` — `budget_app` rolü her deploy'da yeni secret alır (idempotent)
4. `railway up --service api` + `railway up --service web`
5. `prod-smoke.sh <url>` — /health/live + /health/ready + /hangfire 401 gate
6. `seq-ingest-check.sh` (sadece production) — son 2 dakika içinde Seq'e event geldi mi

Manuel tetikleme: GitHub Actions → "Deploy" workflow → Run workflow → target = dev | staging | production.

**Gerekli GitHub secrets:**
- `RAILWAY_TOKEN`
- `STAGING_CONN_STRING_SUPERUSER`, `STAGING_BUDGET_APP_PASSWORD`
- `PROD_CONN_STRING_SUPERUSER`, `PROD_BUDGET_APP_PASSWORD`
- `PROD_SEQ_URL`, `PROD_SEQ_API_KEY`

**Gerekli GitHub environments:** `dev`, `staging`, `production`. `production` environment'ında "Required reviewers" = 1 (manuel approval gate).

## 1. budget_app DB şifre rotasyonu — `rotate-db-password.sh`

## 1. budget_app DB şifre rotasyonu — `rotate-db-password.sh`

**Neden:** `InitialSchema` migration'ı `budget_app` rolünü sabit dev şifresiyle oluşturur (`budget_app_dev_password`). Her production release'de bu şifre Railway secret'ından gelen değerle değiştirilir.

**Çalıştırma:**

```bash
# Railway shell veya GitHub Actions "release" job'u içinde:
export DATABASE_URL='postgres://postgres:...@host:5432/finopstur'
export BUDGET_APP_DB_PASSWORD='<Railway secret>'
./infra/release/rotate-db-password.sh
```

**Sonrası:** API process'inin `ConnectionStrings:Default` değerini aynı şifreyle çalıştığından emin olun. Railway env-var'ını güncelledikten sonra servisi yeniden deploy edin.

**Idempotent:** `ALTER ROLE ... PASSWORD` defalarca çalıştırılabilir.

## 2. Üretim OIDC SPA client seed — `--seed-prod-oidc-client`

**Neden:** Dev ortamı `IdentitySeeder` üzerinden `budget-tracker-dev` client'ını otomatik seed eder. Production SPA için ayrı bir client (`budget-tracker-spa`) bir kereye mahsus seed edilir.

**Gerekli env-var'lar (Railway):**

| Değişken | Örnek |
|---|---|
| `OpenIddict__ProdClient__RedirectUri` | `https://app.finopstur.com/auth/callback` |
| `OpenIddict__ProdClient__PostLogoutRedirectUri` | `https://app.finopstur.com/` |

**Çalıştırma (Railway CLI):**

```bash
railway run -- dotnet BudgetTracker.Api.dll --seed-prod-oidc-client
```

Komut tek seferlik çalışır, client'ı oluşturur (zaten varsa atlar) ve process'i `exit 0` ile sonlandırır. Normal servis ayrıca başlatılır (bu script HTTP pipeline başlatmaz).

**Idempotent:** `FindByClientIdAsync` ile önce bakılır; aynı `ClientId` mevcutsa yeni kayıt oluşturulmaz.

## 3. X509 sertifika dağıtımı (OpenIddict production)

**Neden:** Dev ortamı `AddDevelopmentEncryptionCertificate()` + `AddDevelopmentSigningCertificate()` ile her restart'ta yeni efemer sertifika üretir. Production'da bu kabul edilemez — restart token invalidation'a yol açar. Kalıcı X509 sertifikaları Railway volume mount üzerinden yüklenir.

**Config şeması (`appsettings.Production.json` veya Railway env):**

```jsonc
{
  "OpenIddict": {
    "Certificates": {
      "Encryption": {
        "Path": "/etc/secrets/openiddict-encryption.pfx",
        "Password": "<Railway env-var>"
      },
      "Signing": {
        "Path": "/etc/secrets/openiddict-signing.pfx",
        "Password": "<Railway env-var>"
      }
    }
  }
}
```

`ProductionCertificateLoader` build başında bu değerleri okur — dosya yoksa veya şifre boşsa uygulama başlatma reddedilir.

**Sertifika üretimi (tek seferlik, yerelde):**

```bash
# Encryption cert (AES key wrap)
openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 \
  -keyout openiddict-encryption.key \
  -out openiddict-encryption.crt \
  -subj "/CN=FinOps Tur Encryption"
openssl pkcs12 -export \
  -inkey openiddict-encryption.key \
  -in    openiddict-encryption.crt \
  -out   openiddict-encryption.pfx

# Signing cert (RSA signature)
openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 \
  -keyout openiddict-signing.key \
  -out openiddict-signing.crt \
  -subj "/CN=FinOps Tur Signing"
openssl pkcs12 -export \
  -inkey openiddict-signing.key \
  -in    openiddict-signing.crt \
  -out   openiddict-signing.pfx
```

PFX dosyaları Railway volume'e mount edilir. Yerel makinede şifresiz tutulmaz.

## 4. Release sıralaması (önerilen)

1. Schema migration: `dotnet ef database update` (normalde CI deploy'da otomatik)
2. `rotate-db-password.sh` — ilk prod deploy'dan hemen sonra
3. `--seed-prod-oidc-client` — tek kere, ilk release'de
4. Sertifikalar mount edildikten sonra servis başlat
5. Hangfire recurring job kaydı `HangfireRecurringJobs.Register(...)` ile otomatik

> Release sırası bozulursa `/hangfire` veya Seq log'larında "TCMB sync failed" + "OpenIddict certificate not found" uyarıları çıkar. Bunlar post-mortem olarak tespit edilip sırayla kapatılmalıdır.
