using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BudgetTracker.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ============================================================
            // Postgres extensions (S2 — master spec §3.1)
            // ============================================================
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS pgcrypto;");
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS btree_gist;");

            // ============================================================
            // Application role (non-superuser) for RLS enforcement
            // Tests and runtime app must connect as this role; superuser bypasses RLS.
            // ============================================================
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'budget_app') THEN
                        CREATE ROLE budget_app LOGIN PASSWORD 'budget_app_dev_password' NOSUPERUSER NOBYPASSRLS;
                    END IF;
                END $$;
            ");

            migrationBuilder.CreateTable(
                name: "audit_logs",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    company_id = table.Column<int>(type: "integer", nullable: true),
                    user_id = table.Column<int>(type: "integer", nullable: true),
                    entity_name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    entity_key = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    action = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    old_values_json = table.Column<string>(type: "jsonb", nullable: true),
                    new_values_json = table.Column<string>(type: "jsonb", nullable: true),
                    correlation_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    ip_address = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_audit_logs", x => new { x.id, x.created_at });
                });

            migrationBuilder.CreateTable(
                name: "companies",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    code = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    base_currency_code = table.Column<string>(type: "character(3)", fixedLength: true, maxLength: 3, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    updated_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_companies", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "currencies",
                columns: table => new
                {
                    code = table.Column<string>(type: "character(3)", fixedLength: true, maxLength: 3, nullable: false),
                    name = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    symbol = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    decimal_places = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_currencies", x => x.code);
                });

            migrationBuilder.CreateTable(
                name: "budget_years",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    year = table.Column<int>(type: "integer", nullable: false),
                    is_locked = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    updated_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    company_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_budget_years", x => x.id);
                    table.ForeignKey(
                        name: "fk_budget_years_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "expense_categories",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    code = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    classification = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    display_order = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    updated_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    company_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_expense_categories", x => x.id);
                    table.ForeignKey(
                        name: "fk_expense_categories_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "segments",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    code = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    display_order = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    updated_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    company_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_segments", x => x.id);
                    table.ForeignKey(
                        name: "fk_segments_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "fx_rates",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    currency_code = table.Column<string>(type: "character(3)", fixedLength: true, maxLength: 3, nullable: false),
                    rate_date = table.Column<DateOnly>(type: "date", nullable: false),
                    rate_value = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    source = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    is_year_start_fixed = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    updated_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_fx_rates", x => x.id);
                    table.ForeignKey(
                        name: "fk_fx_rates_currencies_currency_code",
                        column: x => x.currency_code,
                        principalTable: "currencies",
                        principalColumn: "code",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "budget_versions",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    budget_year_id = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    rejection_reason = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: true),
                    submitted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    submitted_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    dept_approved_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    dept_approved_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    finance_approved_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    finance_approved_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    cfo_approved_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    cfo_approved_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    activated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    activated_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    updated_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    company_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_budget_versions", x => x.id);
                    table.ForeignKey(
                        name: "fk_budget_versions_budget_years_budget_year_id",
                        column: x => x.budget_year_id,
                        principalTable: "budget_years",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_budget_versions_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_budget_versions_budget_year_id",
                table: "budget_versions",
                column: "budget_year_id");

            migrationBuilder.CreateIndex(
                name: "ix_budget_versions_company_id",
                table: "budget_versions",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "ix_budget_years_company_id_year",
                table: "budget_years",
                columns: new[] { "company_id", "year" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_companies_code",
                table: "companies",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_expense_categories_company_id_code",
                table: "expense_categories",
                columns: new[] { "company_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_fx_rates_currency_code_rate_date_is_year_start_fixed",
                table: "fx_rates",
                columns: new[] { "currency_code", "rate_date", "is_year_start_fixed" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_segments_company_id_code",
                table: "segments",
                columns: new[] { "company_id", "code" },
                unique: true);

            // ============================================================
            // CHECK constraints — defense-in-depth for enum string columns
            // ============================================================
            migrationBuilder.Sql(@"
                ALTER TABLE expense_categories
                    ADD CONSTRAINT ck_expense_categories_classification
                    CHECK (classification IN ('TECHNICAL','GENERAL','FINANCIAL','EXTRAORDINARY'));
            ");

            migrationBuilder.Sql(@"
                ALTER TABLE budget_versions
                    ADD CONSTRAINT ck_budget_versions_status
                    CHECK (status IN ('DRAFT','SUBMITTED','DEPT_APPROVED','FINANCE_APPROVED','CFO_APPROVED','ACTIVE','ARCHIVED','REJECTED'));
            ");

            migrationBuilder.Sql(@"
                ALTER TABLE fx_rates
                    ADD CONSTRAINT ck_fx_rates_source
                    CHECK (source IN ('TCMB','MANUAL','ECB'));
            ");

            migrationBuilder.Sql(@"
                ALTER TABLE fx_rates
                    ADD CONSTRAINT ck_fx_rates_rate_value_positive
                    CHECK (rate_value > 0);
            ");

            // ============================================================
            // EXCLUDE constraint — only one ACTIVE version per company+year
            // ============================================================
            migrationBuilder.Sql(@"
                ALTER TABLE budget_versions
                    ADD CONSTRAINT ex_budget_versions_single_active
                    EXCLUDE USING gist (
                        company_id WITH =,
                        budget_year_id WITH =
                    )
                    WHERE (is_active = TRUE);
            ");

            // ============================================================
            // Audit log: drop EF-managed table, recreate as PARTITION BY RANGE.
            // EF still has the logical schema in its model snapshot for queries/inserts;
            // the physical table is owned entirely by SQL with monthly partitions.
            // ============================================================
            migrationBuilder.Sql("DROP TABLE audit_logs;");

            migrationBuilder.Sql(@"
                CREATE TABLE audit_logs (
                    id              BIGINT GENERATED BY DEFAULT AS IDENTITY,
                    created_at      TIMESTAMPTZ NOT NULL,
                    company_id      INT NULL,
                    user_id         INT NULL,
                    entity_name     VARCHAR(128) NOT NULL,
                    entity_key      VARCHAR(128) NOT NULL,
                    action          VARCHAR(32) NOT NULL,
                    old_values_json JSONB NULL,
                    new_values_json JSONB NULL,
                    correlation_id  VARCHAR(64) NULL,
                    ip_address      VARCHAR(64) NULL,
                    PRIMARY KEY (id, created_at)
                ) PARTITION BY RANGE (created_at);
            ");

            // Initial partitions: current month (2026-04) + next month (2026-05)
            migrationBuilder.Sql(@"
                CREATE TABLE audit_logs_2026_04 PARTITION OF audit_logs
                    FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-05-01 00:00:00+00');
            ");
            migrationBuilder.Sql(@"
                CREATE TABLE audit_logs_2026_05 PARTITION OF audit_logs
                    FOR VALUES FROM ('2026-05-01 00:00:00+00') TO ('2026-06-01 00:00:00+00');
            ");
            migrationBuilder.Sql(@"
                CREATE INDEX ix_audit_logs_company_created
                    ON audit_logs (company_id, created_at DESC);
            ");
            migrationBuilder.Sql(@"
                CREATE INDEX ix_audit_logs_entity
                    ON audit_logs (entity_name, entity_key, created_at DESC);
            ");

            // ============================================================
            // Row Level Security — tenant isolation (Day-1)
            // Policies use current_setting('app.current_company_id', true) so that
            // sessions without the GUC see no rows (default-deny).
            // ============================================================
            string[] tenantTables = new[]
            {
                "segments",
                "expense_categories",
                "budget_years",
                "budget_versions"
            };

            foreach (var table in tenantTables)
            {
                migrationBuilder.Sql($"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;");
                migrationBuilder.Sql($"ALTER TABLE {table} FORCE ROW LEVEL SECURITY;");
                // NULLIF guards against empty GUC: when unset, current_setting('...', true)
                // returns '' (because of the missing_ok=true flag); NULLIF maps it to NULL,
                // and NULL :: INT comparison evaluates to UNKNOWN → row is hidden (default-deny).
                // Postgres planner can reorder AND clauses, so we must NOT rely on short-circuit
                // evaluation of an explicit "<> ''" guard before the cast.
                migrationBuilder.Sql($@"
                    CREATE POLICY tenant_isolation ON {table}
                        USING (
                            company_id = NULLIF(current_setting('app.current_company_id', true), '')::INT
                        )
                        WITH CHECK (
                            company_id = NULLIF(current_setting('app.current_company_id', true), '')::INT
                        );
                ");
            }

            // ============================================================
            // GRANTs — application role gets DML on all domain tables.
            // audit_logs is INSERT-only at the role level (defense-in-depth).
            // companies, currencies, fx_rates: SELECT for everyone, INSERT/UPDATE for app.
            // ============================================================
            migrationBuilder.Sql(@"
                GRANT USAGE ON SCHEMA public TO budget_app;
                GRANT SELECT, INSERT, UPDATE, DELETE ON
                    companies, currencies, fx_rates,
                    segments, expense_categories,
                    budget_years, budget_versions
                TO budget_app;
                GRANT INSERT, SELECT ON audit_logs TO budget_app;
                GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO budget_app;
            ");

            // ============================================================
            // Seed data — master spec §3.2 SEED DATA
            // ============================================================
            migrationBuilder.Sql(@"
                INSERT INTO currencies (code, name, symbol, decimal_places) VALUES
                    ('TRY', 'Türk Lirası', '₺', 2),
                    ('USD', 'US Dollar',   '$', 2),
                    ('EUR', 'Euro',        '€', 2);
            ");

            migrationBuilder.Sql(@"
                INSERT INTO companies (code, name, base_currency_code, created_at)
                VALUES ('TAG', 'Tur Assist Group', 'TRY', NOW());
            ");

            migrationBuilder.Sql(@"
                INSERT INTO segments (company_id, code, name, display_order, is_active, created_at)
                SELECT id, v.code, v.name, v.display_order, TRUE, NOW()
                FROM companies, (VALUES
                    ('SIGORTA',     'Sigorta',         1),
                    ('OTOMOTIV',    'Otomotiv',        2),
                    ('FILO',        'Filo Yönetimi',   3),
                    ('ALTERNATIF',  'Alternatif',      4),
                    ('SGK_TESVIK',  'SGK Teşvik',      5)
                ) AS v(code, name, display_order)
                WHERE companies.code = 'TAG';
            ");

            // 9 expense categories with classification (master spec §3.2 + ui-ux design doc)
            // NOTE: HOLDING marked GENERAL pending accounting team validation (sprint open question #1)
            migrationBuilder.Sql(@"
                INSERT INTO expense_categories (company_id, code, name, classification, display_order, is_active, created_at)
                SELECT id, v.code, v.name, v.classification, v.display_order, TRUE, NOW()
                FROM companies, (VALUES
                    ('PERSONEL',        'Personel Giderleri',         'TECHNICAL',     1),
                    ('SIRKET_GENEL',    'Şirket Genel Giderleri',     'GENERAL',       2),
                    ('IT',              'IT Giderleri',               'GENERAL',       3),
                    ('ARAC',            'Araç Giderleri',             'TECHNICAL',     4),
                    ('FINANSMAN',       'Finansman Giderleri',        'FINANCIAL',     5),
                    ('HOLDING',         'Holding Giderleri',          'GENERAL',       6),
                    ('DIGER',           'Diğer Giderler',             'EXTRAORDINARY', 7),
                    ('FINANSAL_GELIR',  'Finansal Gelirler',          'FINANCIAL',     8),
                    ('AMORTISMAN',      'Amortisman',                 'TECHNICAL',     9)
                ) AS v(code, name, classification, display_order)
                WHERE companies.code = 'TAG';
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "audit_logs");

            migrationBuilder.DropTable(
                name: "budget_versions");

            migrationBuilder.DropTable(
                name: "expense_categories");

            migrationBuilder.DropTable(
                name: "fx_rates");

            migrationBuilder.DropTable(
                name: "segments");

            migrationBuilder.DropTable(
                name: "budget_years");

            migrationBuilder.DropTable(
                name: "currencies");

            migrationBuilder.DropTable(
                name: "companies");
        }
    }
}
