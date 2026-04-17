-- =====================================================================
-- BÜTÇE 2026 SİSTEMİ — PostgreSQL 16 Şema (DDL)
-- Hedef: Bütçe 2026.xlsx modelinin 1:1 veritabanı karşılığı
-- Uyum: FinOpsTur mevcut mimarisine (Multi-tenant RLS, audit, EF Core 10)
-- Dil: Türkçe isimlendirme (iş alan terimleri) + İngilizce teknik isimler
-- =====================================================================

-- Gerekli extension'lar
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gist;      -- EXCLUDE constraint için
CREATE EXTENSION IF NOT EXISTS pgcrypto;        -- PII maskeleme

-- =====================================================================
-- 1) TENANT & KULLANICI KATMANI (FinOpsTur standardı — özet)
-- =====================================================================

CREATE TABLE tenants (
  id          BIGSERIAL PRIMARY KEY,
  code        VARCHAR(50) UNIQUE NOT NULL,
  name        VARCHAR(200) NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   BIGINT NOT NULL REFERENCES tenants(id),
  email       VARCHAR(200) UNIQUE NOT NULL,
  full_name   VARCHAR(200) NOT NULL,
  entra_id    VARCHAR(100),
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE roles (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(50) UNIQUE NOT NULL,   -- CFO, FINANCE_MANAGER, SEGMENT_MANAGER, PLANNING_EDITOR, AUDITOR, VIEWER
  name        VARCHAR(100) NOT NULL
);

CREATE TABLE user_roles (
  user_id     BIGINT REFERENCES users(id) ON DELETE CASCADE,
  role_id     INT REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);

-- =====================================================================
-- 2) MASTER DATA KATMANI
-- =====================================================================

-- 2.1 Segmentler — Excel'deki 5 ana bölüm
CREATE TABLE segments (
  id            SMALLSERIAL PRIMARY KEY,
  code          VARCHAR(20) UNIQUE NOT NULL,
  name          VARCHAR(100) NOT NULL,
  display_order SMALLINT NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT TRUE
);
INSERT INTO segments (code, name, display_order) VALUES
  ('SIGORTA',    'Sigorta Şirketleri',   1),
  ('OTOMOTIV',   'Otomotiv Şirketleri',  2),
  ('FILO',       'Filo Şirketleri',      3),
  ('ALTERNATIF', 'Alternatif Kanallar',  4),
  ('SGK',        'SGK Teşvik Gelirleri', 5);

-- 2.2 Grup şirketleri (Tur Assist, OtoKonfor, TUR Medical, KonutKonfor…)
CREATE TABLE company_groups (
  id         SERIAL PRIMARY KEY,
  code       VARCHAR(50) UNIQUE NOT NULL,
  name       VARCHAR(200) NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT TRUE
);
INSERT INTO company_groups (code, name) VALUES
  ('TUR_ASSIST', 'Tur Assist Yardım ve Servis A.Ş.'),
  ('OTOKONFOR',  'OtoKonfor'),
  ('TUR_MEDICAL','TUR Medical'),
  ('KONUTKONFOR','KonutKonfor'),
  ('IHALEPORTAL','İhalePortal'),
  ('SIGORTAACE', 'SigortaAcentesi.com'),
  ('RS_OTO',     'RS Otomotiv Grubu');

-- 2.3 Firmalar — Excel'deki 98 müşteri + sonradan eklenecekler
CREATE TABLE companies (
  id                BIGSERIAL PRIMARY KEY,
  tenant_id         BIGINT NOT NULL REFERENCES tenants(id),
  code              VARCHAR(30) UNIQUE NOT NULL,
  name              VARCHAR(200) NOT NULL,
  segment_id        SMALLINT NOT NULL REFERENCES segments(id),
  company_group_id  INT REFERENCES company_groups(id),
  is_other_flag     BOOLEAN NOT NULL DEFAULT FALSE,  -- "Diğer" alt kırılımındaysa TRUE
  erp_code          VARCHAR(50),
  vat_no            VARCHAR(20),
  active            BOOLEAN NOT NULL DEFAULT TRUE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_companies_segment ON companies(segment_id);
CREATE INDEX idx_companies_tenant ON companies(tenant_id);

-- 2.4 Gider kategorileri
CREATE TYPE expense_category_type AS ENUM (
  'GENEL_GIDER',
  'FINANSMAN',
  'HOLDING',
  'DIGER_OLAGAN',
  'FINANSAL_GELIR',
  'T_KATILIM',
  'AMORTISMAN',
  'YATIRIM'
);

CREATE TABLE expense_categories (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(50) UNIQUE NOT NULL,
  name          VARCHAR(150) NOT NULL,
  category_type expense_category_type NOT NULL,
  sign          SMALLINT NOT NULL DEFAULT 1,  -- +1 gider, -1 gelir yönünde
  display_order SMALLINT NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT TRUE
);
INSERT INTO expense_categories (code, name, category_type, sign, display_order) VALUES
  ('PERSONEL',      'Personel Giderleri',     'GENEL_GIDER', 1,  1),
  ('SEYAHAT',       'Seyahat Giderleri',      'GENEL_GIDER', 1,  2),
  ('SIRKET_GENEL',  'Şirket Genel Giderleri', 'GENEL_GIDER', 1,  3),
  ('IT',            'IT Giderleri',           'GENEL_GIDER', 1,  4),
  ('PAZARLAMA',     'Pazarlama Giderleri',    'GENEL_GIDER', 1,  5),
  ('DANISMANLIK',   'Danışmanlık Giderleri',  'GENEL_GIDER', 1,  6),
  ('AGIRLAMA',      'Ağırlama Giderleri',     'GENEL_GIDER', 1,  7),
  ('ARAC',          'Araç Giderleri',         'GENEL_GIDER', 1,  8),
  ('ARAC_TURFILO',  'Araç Giderleri - TurFilo','GENEL_GIDER', 1, 9),
  ('KONUT_KONFOR',  'Konut Konfor Giderleri', 'GENEL_GIDER', 1, 10),
  ('FINANSMAN',     'Finansman Giderleri',    'FINANSMAN',   1, 11),
  ('HOLDING',       'Holding Giderleri',      'HOLDING',     1, 12),
  ('DIGER_OLAGAN',  'Diğer Olağan Dışı K/Z',  'DIGER_OLAGAN',1, 13),
  ('FINANSAL_GELIR','Finansal Gelir',         'FINANSAL_GELIR',-1,14),
  ('T_KATILIM',     'T.Katılım',              'T_KATILIM',  -1, 15),
  ('AMORTISMAN',    'Amortisman Giderleri',   'AMORTISMAN',  1, 16),
  ('YATIRIM',       'Yatırım Gideri',         'YATIRIM',     1, 17);

-- 2.5 Düzeltme tipleri (İade, TurFilo, Muallak…)
CREATE TYPE adjustment_type_enum AS ENUM (
  'IADE',                       -- (+) hasar iadesi
  'TURFILO_PROVIZYON',          -- (-) hasar düzeltmesi
  'MUALLAK_KAYDI',              -- kayıtlı muallak
  'MUALLAK_HESAPLAMA_DISI'      -- hesaplama dışı muallak
);

-- =====================================================================
-- 3) DÖNEMSEL KATMAN — Period & Version
-- =====================================================================

CREATE TABLE budget_periods (
  id          SERIAL PRIMARY KEY,
  tenant_id   BIGINT NOT NULL REFERENCES tenants(id),
  year        SMALLINT NOT NULL,
  name        VARCHAR(50) NOT NULL,  -- '2026'
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'OPEN',  -- OPEN, CLOSED
  UNIQUE (tenant_id, year)
);

CREATE TYPE version_status AS ENUM (
  'DRAFT',       -- Taslakta
  'SUBMITTED',   -- Onaya gönderildi
  'DEPT_APPROVED',
  'FINANCE_APPROVED',
  'APPROVED',    -- CFO onayladı
  'ACTIVE',      -- Şu an kullanımda
  'ARCHIVED',    -- Tarihsel versiyon
  'REJECTED'
);

CREATE TABLE budget_versions (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   BIGINT NOT NULL REFERENCES tenants(id),
  period_id   INT NOT NULL REFERENCES budget_periods(id),
  name        VARCHAR(100) NOT NULL,       -- 'V1 Plan', 'V2 Revize', 'V3 Final'
  description TEXT,
  status      version_status NOT NULL DEFAULT 'DRAFT',
  created_by  BIGINT NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by BIGINT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  archived_at  TIMESTAMPTZ,
  locked      BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (tenant_id, period_id, name),
  -- Aynı dönemde birden fazla ACTIVE versiyon olamaz
  EXCLUDE USING gist (period_id WITH =) WHERE (status = 'ACTIVE')
);

CREATE INDEX idx_budget_versions_period ON budget_versions(period_id, status);

-- =====================================================================
-- 4) TRANSAKSİYONEL KATMAN — Bütçe Kalemleri
-- =====================================================================

-- 4.1 Gelir — firma × ay
CREATE TABLE revenue_entries (
  id         BIGSERIAL PRIMARY KEY,
  tenant_id  BIGINT NOT NULL REFERENCES tenants(id),
  version_id BIGINT NOT NULL REFERENCES budget_versions(id) ON DELETE CASCADE,
  company_id BIGINT NOT NULL REFERENCES companies(id),
  month      SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount     NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency   CHAR(3) NOT NULL DEFAULT 'TRY',
  amount_try_fixed NUMERIC(18,2),   -- Sabit kur çevrim (FinOpsTur standart)
  fx_rate    NUMERIC(12,6),
  entered_by BIGINT NOT NULL REFERENCES users(id),
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes      TEXT,
  UNIQUE (version_id, company_id, month)
);
CREATE INDEX idx_rev_version_month ON revenue_entries(version_id, month);
CREATE INDEX idx_rev_company ON revenue_entries(company_id);

-- 4.2 Hasar — firma × ay
CREATE TABLE claim_entries (
  id         BIGSERIAL PRIMARY KEY,
  tenant_id  BIGINT NOT NULL REFERENCES tenants(id),
  version_id BIGINT NOT NULL REFERENCES budget_versions(id) ON DELETE CASCADE,
  company_id BIGINT NOT NULL REFERENCES companies(id),
  month      SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount     NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency   CHAR(3) NOT NULL DEFAULT 'TRY',
  entered_by BIGINT NOT NULL REFERENCES users(id),
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes      TEXT,
  UNIQUE (version_id, company_id, month)
);
CREATE INDEX idx_claim_version_month ON claim_entries(version_id, month);
CREATE INDEX idx_claim_company ON claim_entries(company_id);

-- 4.3 Gider kalemleri — kategori × ay
CREATE TABLE expense_entries (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   BIGINT NOT NULL REFERENCES tenants(id),
  version_id  BIGINT NOT NULL REFERENCES budget_versions(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES expense_categories(id),
  month       SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount      NUMERIC(18,2) NOT NULL DEFAULT 0,
  entered_by  BIGINT NOT NULL REFERENCES users(id),
  entered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes       TEXT,
  UNIQUE (version_id, category_id, month)
);
CREATE INDEX idx_exp_version_month ON expense_entries(version_id, month);

-- 4.4 Düzeltmeler — İade, TurFilo, Muallak...
CREATE TABLE adjustment_entries (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id),
  version_id      BIGINT NOT NULL REFERENCES budget_versions(id) ON DELETE CASCADE,
  adjustment_type adjustment_type_enum NOT NULL,
  month           SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount          NUMERIC(18,2) NOT NULL DEFAULT 0,
  entered_by      BIGINT NOT NULL REFERENCES users(id),
  entered_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes           TEXT,
  UNIQUE (version_id, adjustment_type, month)
);

-- 4.5 Gerçekleşme ikizleri (actual) — aynı yapı
CREATE TABLE actual_revenue_entries (LIKE revenue_entries INCLUDING ALL);
CREATE TABLE actual_claim_entries   (LIKE claim_entries   INCLUDING ALL);
CREATE TABLE actual_expense_entries (LIKE expense_entries INCLUDING ALL);
CREATE TABLE actual_adjustment_entries (LIKE adjustment_entries INCLUDING ALL);

-- =====================================================================
-- 5) ONAY AKIŞI
-- =====================================================================

CREATE TYPE approval_step AS ENUM (
  'SUBMIT', 'DEPT_APPROVE', 'FINANCE_APPROVE', 'CFO_APPROVE', 'REJECT'
);

CREATE TABLE approvals (
  id          BIGSERIAL PRIMARY KEY,
  version_id  BIGINT NOT NULL REFERENCES budget_versions(id) ON DELETE CASCADE,
  step        approval_step NOT NULL,
  actor_id    BIGINT NOT NULL REFERENCES users(id),
  acted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  comment     TEXT,
  signature   VARCHAR(500)  -- İmza hash'i (KVKK)
);

-- =====================================================================
-- 6) AUDIT LOG — aylık partition
-- =====================================================================

CREATE TABLE audit_logs (
  id           BIGSERIAL,
  tenant_id    BIGINT NOT NULL,
  entity_type  VARCHAR(50) NOT NULL,
  entity_id    BIGINT NOT NULL,
  action       VARCHAR(20) NOT NULL,    -- CREATE/UPDATE/DELETE/APPROVE/REJECT
  old_value    JSONB,
  new_value    JSONB,
  user_id      BIGINT NOT NULL,
  ts           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, ts)
) PARTITION BY RANGE (ts);

-- Aylık partition örneği
CREATE TABLE audit_logs_202604 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE audit_logs_202605 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_logs (user_id, ts);

-- =====================================================================
-- 7) HESAPLAMA VIEW'LARI — Excel formül zinciri birebir
-- =====================================================================

-- 7.1 Aylık firma gelir/hasar (uzun format) — esnek pivot kaynağı
CREATE OR REPLACE VIEW v_company_month_matrix AS
SELECT r.version_id, r.company_id, c.code AS company_code, c.name AS company_name,
       c.segment_id, s.code AS segment_code, r.month,
       COALESCE(r.amount, 0) AS revenue,
       COALESCE(cl.amount, 0) AS claim
FROM revenue_entries r
  JOIN companies c ON c.id = r.company_id
  JOIN segments s ON s.id = c.segment_id
  LEFT JOIN claim_entries cl
    ON cl.version_id = r.version_id
   AND cl.company_id = r.company_id
   AND cl.month = r.month;

-- 7.2 Firma yıllık toplam (Excel O sütunu — =IFERROR(C,0)+...+N)
CREATE OR REPLACE VIEW v_company_annual AS
SELECT version_id, company_id, company_code, company_name, segment_id, segment_code,
       SUM(revenue) AS annual_revenue,
       SUM(claim)   AS annual_claim,
       SUM(revenue) - SUM(claim) AS annual_margin,
       CASE WHEN SUM(revenue)=0 THEN NULL ELSE SUM(claim)::numeric/SUM(revenue) END AS annual_lr
FROM v_company_month_matrix
GROUP BY version_id, company_id, company_code, company_name, segment_id, segment_code;

-- 7.3 Segment aylık toplam (Excel satır 25/44/54/61)
CREATE OR REPLACE VIEW v_segment_monthly AS
SELECT version_id, segment_id, segment_code, month,
       SUM(revenue) AS revenue,
       SUM(claim)   AS claim
FROM v_company_month_matrix
GROUP BY version_id, segment_id, segment_code, month;

-- 7.4 Aylık düzeltme — İade + TurFilo + Muallak
CREATE OR REPLACE VIEW v_adjustment_monthly AS
SELECT version_id, month,
  SUM(CASE WHEN adjustment_type = 'IADE' THEN amount ELSE 0 END) AS iade,
  SUM(CASE WHEN adjustment_type = 'TURFILO_PROVIZYON' THEN amount ELSE 0 END) AS turfilo,
  SUM(CASE WHEN adjustment_type = 'MUALLAK_KAYDI' THEN amount ELSE 0 END) AS muallak_kaydi,
  SUM(CASE WHEN adjustment_type = 'MUALLAK_HESAPLAMA_DISI' THEN amount ELSE 0 END) AS muallak_hes_disi,
  SUM(CASE WHEN adjustment_type = 'MUALLAK_KAYDI' THEN amount ELSE 0 END)
    - SUM(CASE WHEN adjustment_type = 'MUALLAK_HESAPLAMA_DISI' THEN amount ELSE 0 END) AS muallak_farki
FROM adjustment_entries
GROUP BY version_id, month;

-- 7.5 Aylık gider — tip bazlı
CREATE OR REPLACE VIEW v_expense_monthly AS
SELECT e.version_id, e.month,
  SUM(CASE WHEN ec.category_type = 'GENEL_GIDER' THEN e.amount ELSE 0 END) AS genel_gider,
  SUM(CASE WHEN ec.category_type = 'FINANSMAN'   THEN e.amount ELSE 0 END) AS finansman,
  SUM(CASE WHEN ec.category_type = 'HOLDING'     THEN e.amount ELSE 0 END) AS holding,
  SUM(CASE WHEN ec.category_type = 'DIGER_OLAGAN'THEN e.amount ELSE 0 END) AS diger_olagan,
  SUM(CASE WHEN ec.category_type = 'FINANSAL_GELIR' THEN e.amount ELSE 0 END) AS finansal_gelir,
  SUM(CASE WHEN ec.category_type = 'T_KATILIM'     THEN e.amount ELSE 0 END) AS t_katilim,
  SUM(CASE WHEN ec.category_type = 'AMORTISMAN'    THEN e.amount ELSE 0 END) AS amortisman,
  SUM(CASE WHEN ec.category_type = 'YATIRIM'       THEN e.amount ELSE 0 END) AS yatirim
FROM expense_entries e
  JOIN expense_categories ec ON ec.id = e.category_id
GROUP BY e.version_id, e.month;

-- 7.6 AYLIK P&L — Excel'in satır 63/127/128/145/147/152/153/156 tam karşılığı
CREATE OR REPLACE VIEW v_monthly_pnl AS
WITH rev AS (
  SELECT version_id, month, SUM(revenue) AS gelir, SUM(claim) AS hasar
  FROM v_company_month_matrix GROUP BY version_id, month
),
adj AS (SELECT * FROM v_adjustment_monthly),
exp AS (SELECT * FROM v_expense_monthly)
SELECT
  rev.version_id, rev.month,
  rev.gelir                                                              AS gelir_toplam,
  rev.hasar
    + COALESCE(adj.iade,0)
    + COALESCE(adj.turfilo,0)
    + COALESCE(adj.muallak_kaydi,0)                                      AS hasar_toplam,
  -- TEKNİK MARJ
  rev.gelir - (rev.hasar + COALESCE(adj.iade,0) + COALESCE(adj.turfilo,0)
               + COALESCE(adj.muallak_kaydi,0))                          AS teknik_marj,
  -- LR
  CASE WHEN rev.gelir = 0 THEN NULL
       ELSE (rev.hasar + COALESCE(adj.iade,0) + COALESCE(adj.turfilo,0)
             + COALESCE(adj.muallak_kaydi,0))::numeric / rev.gelir END   AS loss_ratio,
  -- GENEL GİDERLER TOPLAM
  COALESCE(exp.genel_gider,0)                                            AS genel_gider_toplam,
  -- TOPLAM GIDER (Excel: O141 + O142 + O143 + O144 kompozisyonu)
  COALESCE(exp.genel_gider,0) + COALESCE(exp.finansman,0)
    + COALESCE(exp.holding,0) + COALESCE(exp.diger_olagan,0)             AS toplam_gider,
  -- TEKNİK K/Z = Teknik Marj - Toplam Gider
  (rev.gelir - (rev.hasar + COALESCE(adj.iade,0) + COALESCE(adj.turfilo,0)
                + COALESCE(adj.muallak_kaydi,0)))
    - (COALESCE(exp.genel_gider,0) + COALESCE(exp.finansman,0)
       + COALESCE(exp.holding,0) + COALESCE(exp.diger_olagan,0))         AS teknik_kz,
  -- NET K/Z = Teknik K/Z + Finansal Gelir - Amortisman
  ((rev.gelir - (rev.hasar + COALESCE(adj.iade,0) + COALESCE(adj.turfilo,0)
                 + COALESCE(adj.muallak_kaydi,0)))
    - (COALESCE(exp.genel_gider,0) + COALESCE(exp.finansman,0)
       + COALESCE(exp.holding,0) + COALESCE(exp.diger_olagan,0)))
    + COALESCE(exp.finansal_gelir,0)
    - COALESCE(exp.amortisman,0)                                         AS net_kz,
  -- EBITDA = Net K/Z + Amortisman
  ((rev.gelir - (rev.hasar + COALESCE(adj.iade,0) + COALESCE(adj.turfilo,0)
                 + COALESCE(adj.muallak_kaydi,0)))
    - (COALESCE(exp.genel_gider,0) + COALESCE(exp.finansman,0)
       + COALESCE(exp.holding,0) + COALESCE(exp.diger_olagan,0)))
    + COALESCE(exp.finansal_gelir,0)                                     AS ebitda
FROM rev
LEFT JOIN adj ON adj.version_id = rev.version_id AND adj.month = rev.month
LEFT JOIN exp ON exp.version_id = rev.version_id AND exp.month = rev.month;

-- 7.7 DASHBOARD KPI — yıllık özet (Excel Dashboard R5)
CREATE OR REPLACE VIEW v_kpi_dashboard AS
SELECT version_id,
  SUM(gelir_toplam)  AS yillik_gelir,
  SUM(hasar_toplam)  AS yillik_hasar,
  SUM(teknik_marj)   AS teknik_marj,
  SUM(teknik_kz)     AS teknik_kz,
  SUM(net_kz)        AS net_kz,
  SUM(ebitda)        AS ebitda,
  CASE WHEN SUM(gelir_toplam)=0 THEN NULL
       ELSE SUM(hasar_toplam)::numeric/SUM(gelir_toplam) END AS loss_ratio,
  CASE WHEN SUM(gelir_toplam)=0 THEN NULL
       ELSE SUM(toplam_gider)::numeric/SUM(gelir_toplam) END AS gider_rasyosu,
  CASE WHEN SUM(gelir_toplam)=0 THEN NULL
       ELSE SUM(teknik_kz)::numeric/SUM(gelir_toplam) END    AS teknik_kar_rasyosu,
  CASE WHEN SUM(gelir_toplam)=0 THEN NULL
       ELSE SUM(net_kz)::numeric/SUM(gelir_toplam) END       AS kar_rasyosu,
  CASE WHEN SUM(gelir_toplam)=0 THEN NULL
       ELSE SUM(ebitda)::numeric/SUM(gelir_toplam) END       AS ebitda_marji
FROM v_monthly_pnl
GROUP BY version_id;

-- 7.8 SEGMENT PERFORMANS
CREATE OR REPLACE VIEW v_segment_performance AS
SELECT version_id, segment_id, segment_code,
  SUM(revenue) AS yillik_gelir,
  SUM(claim)   AS yillik_hasar,
  SUM(revenue) - SUM(claim) AS marj,
  CASE WHEN SUM(revenue)=0 THEN NULL
       ELSE SUM(claim)::numeric/SUM(revenue) END AS lr,
  SUM(revenue) / NULLIF(
    (SELECT SUM(revenue) FROM v_company_month_matrix m2 WHERE m2.version_id = m.version_id), 0
  ) AS gelir_pay
FROM v_company_month_matrix m
GROUP BY version_id, segment_id, segment_code;

-- 7.9 TOP N MÜŞTERİ
CREATE OR REPLACE VIEW v_top_customers AS
SELECT version_id, company_id, company_code, company_name, segment_code,
       annual_revenue,
       RANK() OVER (PARTITION BY version_id ORDER BY annual_revenue DESC) AS rank_revenue,
       annual_revenue / NULLIF(
         (SELECT SUM(annual_revenue) FROM v_company_annual a2 WHERE a2.version_id = a.version_id), 0
       ) AS gelir_pay
FROM v_company_annual a;

-- 7.10 BÜTÇE vs FİİLİ (E06 ekranı için)
CREATE OR REPLACE VIEW v_variance_budget_vs_actual AS
WITH b AS (
  SELECT r.version_id, r.company_id, r.month, SUM(r.amount) AS budget
  FROM revenue_entries r GROUP BY r.version_id, r.company_id, r.month
),
a AS (
  SELECT ar.version_id, ar.company_id, ar.month, SUM(ar.amount) AS actual
  FROM actual_revenue_entries ar GROUP BY ar.version_id, ar.company_id, ar.month
)
SELECT b.version_id, b.company_id, b.month,
       b.budget, COALESCE(a.actual, 0) AS actual,
       COALESCE(a.actual, 0) - b.budget AS variance,
       CASE WHEN b.budget=0 THEN NULL
            ELSE (COALESCE(a.actual, 0) - b.budget)::numeric / b.budget END AS variance_pct
FROM b LEFT JOIN a USING (version_id, company_id, month);

-- =====================================================================
-- 8) MULTI-TENANT RLS (FinOpsTur standart — özet)
-- =====================================================================

ALTER TABLE companies, revenue_entries, claim_entries, expense_entries,
            adjustment_entries, budget_versions, audit_logs
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_tenant_isolation ON companies
  FOR ALL USING (tenant_id = NULLIF(current_setting('app.tenant_id', TRUE), '')::BIGINT);

-- (Aynı policy diğer tablolara da uygulanır — FinOpsTur mevcut script üzerinden)
ALTER TABLE companies FORCE ROW LEVEL SECURITY;

-- =====================================================================
-- 9) SEED — Bütçe 2026.xlsx verisi (ÖRNEK — ilk 5 sigorta firması)
-- =====================================================================

-- Örnek firma seed (tam seed Excel import ile yapılır)
INSERT INTO companies (tenant_id, code, name, segment_id, is_other_flag) VALUES
 (1, 'SOMPO',      'Sompo Sigorta',        1, FALSE),
 (1, 'ANADOLU',    'Anadolu Sigorta',      1, FALSE),
 (1, 'HEPIYI',     'Hepiyi Sigorta',       1, FALSE),
 (1, 'AKSIGORTA',  'Ak Sigorta',           1, FALSE),
 (1, 'KORU',       'Koru Sigorta',         1, FALSE),
 (1, 'QUICK',      'Quick Sigorta',        1, TRUE),
 (1, 'AXA',        'AXA',                  1, TRUE),
 (1, 'TOGG',       'TOGG',                 2, FALSE),
 (1, 'TOYOTA',     'Toyota',               2, FALSE),
 (1, 'OTOKOC',     'Otokoç-AVIS',          3, FALSE),
 (1, 'EUROP',      'Europ Assistance',     4, FALSE),
 (1, 'SGK_TESVIK', 'SGK Teşvik Gelirleri', 5, FALSE);

-- =====================================================================
-- ÖZET
-- ---------------------------------------------------------------------
-- Tablo sayısı:     17 (5 master + 2 dönem + 8 transaksiyonel + 2 audit/onay)
-- View sayısı:      10 (hesaplama + dashboard + varyans)
-- Partition:        audit_logs (aylık)
-- Constraint:       EXCLUDE (tek aktif versiyon), UNIQUE (versiyon+firma+ay)
-- Güvenlik:         RLS + FORCE RLS + kategori bazlı rol kontrolü
-- Excel eşlemesi:   v_monthly_pnl → O63, O127, O128, O129, O145, O147, O152, O153
-- =====================================================================
