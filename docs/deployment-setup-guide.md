# Deployment Setup Guide — Railway + GitHub Actions

> **Amaç:** Sıfırdan Railway projesi açmaktan ilk staging deploy'a kadar her adım. F7 altyapısı (`railway.toml` + `.github/workflows/deploy.yml`) hazır; bu rehber Railway/GitHub tarafında kalan manuel adımları dokümante ediyor. Tahmini süre: **45-60 dakika**.

---

## Adım 1 — Railway Hesabı + Project

1. https://railway.app adresinden GitHub ile giriş yap.
2. Sol üst "New Project" → "Deploy from GitHub repo" → `timselt/Budget` seç.
3. Railway otomatik olarak `railway.toml` dosyasını okur, 2 servis (api + web) tespit eder.
4. Proje adı: `finopstur` (önerilen).

## Adım 2 — Environments

Railway sağ üst menü → Environments → 3 environment oluştur:

- `dev` — her `develop` push'unda otomatik deploy
- `staging` — her `main` push'unda otomatik deploy
- `production` — manuel approval ile (GitHub environment gate)

## Adım 3 — Managed Postgres Add-on

Her environment için **ayrı** Postgres:

1. Proje dashboard'unda + → "Database" → "Add PostgreSQL"
2. Version: **16**
3. Region: **eu-central** (Frankfurt — KVKK için zorunlu)
4. Tekrar et: staging + production (dev opsiyonel; dev'de paylaşabilirsiniz)

Railway otomatik `DATABASE_URL` variable'ını inject eder.

## Adım 4 — Environment Variables

Her environment için dashboard → Variables:

```bash
# Connection (Postgres add-on'dan otomatik)
ConnectionStrings__Default=${{Postgres.DATABASE_URL}}

# ASP.NET
ASPNETCORE_ENVIRONMENT=Staging         # veya Production

# OpenIddict sertifikaları (Adım 6'da oluşturulur)
OpenIddict__Certificates__Encryption__Path=/etc/secrets/openiddict-encryption.pfx
OpenIddict__Certificates__Encryption__Password=<generate_random>
OpenIddict__Certificates__Signing__Path=/etc/secrets/openiddict-signing.pfx
OpenIddict__Certificates__Signing__Password=<generate_random>

# OpenIddict prod client (Adım 7'de seed edilir)
OpenIddict__ProdClient__RedirectUri=https://staging.finopstur.com/auth/callback
OpenIddict__ProdClient__PostLogoutRedirectUri=https://staging.finopstur.com/

# budget_app rol şifresi (Adım 5'te rotate edilir)
BUDGET_APP_DB_PASSWORD=<generate_random>

# Serilog + Seq
Serilog__WriteTo__0__Name=Console
Serilog__WriteTo__1__Name=Seq
Serilog__WriteTo__1__Args__serverUrl=https://<your-seq>.datalust.co
Serilog__WriteTo__1__Args__apiKey=<from_seq_cloud>

# TCMB retry
Tcmb__Sync__MaxRetryAttempts=3
Tcmb__Sync__InitialRetryDelay=00:00:02
```

> **Üretim sırları:** `openssl rand -base64 32` ile güçlü rastgele şifreler üret. Bu dokümana kayıt **etme**.

## Adım 5 — OpenIddict Sertifikaları

Local makinede bir kereye mahsus (detay: `infra/release/README.md` §3):

```bash
# Encryption cert
openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 \
  -keyout openiddict-encryption.key \
  -out openiddict-encryption.crt \
  -subj "/CN=FinOps Tur Encryption"
openssl pkcs12 -export \
  -inkey openiddict-encryption.key \
  -in    openiddict-encryption.crt \
  -out   openiddict-encryption.pfx \
  -password pass:<AYNI_PASSWORD_ENV_VAR_ILE>

# Signing cert
openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 \
  -keyout openiddict-signing.key \
  -out openiddict-signing.crt \
  -subj "/CN=FinOps Tur Signing"
openssl pkcs12 -export \
  -inkey openiddict-signing.key \
  -in    openiddict-signing.crt \
  -out   openiddict-signing.pfx \
  -password pass:<AYNI_PASSWORD_ENV_VAR_ILE>
```

Railway dashboard → api servisi → Volumes → "Add Volume" → mount path `/etc/secrets/` → 2 PFX dosyasını yükle.

## Adım 6 — Seq Cloud

1. https://datalust.co → Cloud Seq → Sign up (ilk ay ücretsiz).
2. Yeni environment "FinOps Tur Staging" oluştur.
3. API key: Settings → API Keys → "Ingest only" permission.
4. Server URL + API key'i Adım 4'teki Railway env variables'a koy.

## Adım 7 — Production OIDC SPA Client Seed

İlk deploy'dan hemen sonra bir kereye mahsus:

```bash
# Railway CLI kurulumu
npm i -g @railway/cli
railway login

# Project seç
railway link

# Seed komutu (staging ortamında)
railway run --service api --environment staging \
  dotnet BudgetTracker.Api.dll --seed-prod-oidc-client
```

`ProductionOidcClientSeeder` mevcut client'ı kontrol eder, yoksa oluşturur. Idempotent.

## Adım 7.5 — Bootstrap Admin Kullanıcı Seed

`AccountController.Register` Admin policy ile korunur → ilk Admin kullanıcı başka yoldan yaratılmalı. `--seed-bootstrap-admin` CLI flag'i tam bu boşluğu doldurur.

```bash
# Staging için
railway run --service api --environment staging \
  --env BOOTSTRAP_ADMIN_EMAIL=admin@finopstur.com \
  --env BOOTSTRAP_ADMIN_PASSWORD="$(openssl rand -base64 24)" \
  dotnet BudgetTracker.Api.dll --seed-bootstrap-admin
```

Oluşan şifreyi **güvenli bir yere kaydedin** (1Password/Bitwarden) — ilk SPA login için gereklidir. Oturum açtıktan sonra `/master-data` üzerinden kendi hesabınızı + diğer kullanıcıları oluşturabilirsiniz.

**Idempotent:** E-mail'de zaten kullanıcı varsa komut no-op döner.

**Detay:** `infra/release/README.md` §1b.

## Adım 8 — GitHub Secrets

Repo → Settings → Secrets and variables → Actions → New repository secret:

```
RAILWAY_TOKEN                     # railway login --tokens
STAGING_CONN_STRING_SUPERUSER     # postgres://postgres:***@...  (Railway dashboard)
STAGING_BUDGET_APP_PASSWORD       # Adım 4 ile aynı
PROD_CONN_STRING_SUPERUSER        # production postgres superuser
PROD_BUDGET_APP_PASSWORD          # production budget_app rolü
PROD_SEQ_URL                      # https://<prod-seq>.datalust.co
PROD_SEQ_API_KEY                  # Seq Cloud prod environment API key
```

## Adım 9 — GitHub Environments

Repo → Settings → Environments → New environment:

- **`dev`** — no protection rules
- **`staging`** — no protection rules
- **`production`** — "Required reviewers" = **1** (Timur veya CFO). "Wait timer" opsiyonel (örn. 5 dk).

## Adım 10 — İlk Staging Deploy Tetikleme

Bu noktadan sonra otomatik. `main` branch'e herhangi bir push (veya bu rehberin PR merge'ü) staging deploy'unu tetikler.

Manuel tetikleme:

```bash
# GitHub UI üzerinden
# → Actions → Deploy → Run workflow → branch=main, target=staging

# veya CLI
gh workflow run deploy.yml -f target=staging
```

## Adım 11 — Deploy Sonrası Master Data Doğrulama

Deploy yeşil olduktan sonra muhasebe ekibinin manuel doğrulayacağı maddeler:

- **SGK Teşvik müşteri kaydı:** Muhasebe ekibi prod SPA'sında `/master-data` → Customers → "Yeni Müşteri" → `code=SGK-TESVIK`, `name=SGK Teşvik (Şirket Geneli)`, `segment=SGK_TESVIK`.
- **Master data init:** Müşteri + segment + expense kategori tamamlanmış mı? (seed migration `20260421_01_seed_pilot_customers` ile 89 müşteri otomatik gelir; ek müşteri varsa muhasebe ekler.)

---

## Troubleshooting

### Staging deploy fail

1. GitHub Actions → Deploy → failing job → logs aç.
2. Migration step fail ise `STAGING_CONN_STRING_SUPERUSER` yanlış ya da Postgres add-on henüz provision değil.
3. `rotate-db-password.sh` fail ise `STAGING_BUDGET_APP_PASSWORD` env'de yok ya da `budget_app` rolü mevcut değil (ilk migration `budget_app` rolünü yaratır — migration'ın önce geçmesi lazım).
4. Smoke test fail ise `prod-smoke.sh` output'unda hangi assertion düştü bakın (`/health/ready` 503 → Postgres connection, `/hangfire` 200 → auth filter bind edilmemiş).

### Rollback (<3 dakika)

Railway dashboard → service → Deployments → önceki stable revision → "Redeploy". EF migration additive olduğundan DB rollback gerekmez.

### Seq ingest broken

`seq-ingest-check.sh` fail ederse:
1. Seq Cloud dashboard'da event count kontrol.
2. `PROD_SEQ_API_KEY` ingest-only permission mi? Write permission yoksa API key reddedilir.
3. `Serilog__WriteTo__1__Args__serverUrl` trailing slash sorunu? `https://xxx.datalust.co` (sonu /api ya da /ingest olmamalı — sink kendi endpoint'ini ekler).

---

## Sonraki: Canlıya Geçiş

Deploy yeşil + master data doğrulaması tamamlandıktan sonra muhasebe ekibi sistem üzerinde çalışmaya başlayabilir. Cutover modeli: eski Excel akışından yeni sisteme doğrudan geçiş (shadow run paralel dönemi iptal edildi, 2026-04-21).
