using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BudgetTracker.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBudgetDomainEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "budget_approvals",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    version_id = table.Column<int>(type: "integer", nullable: false),
                    stage = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    stage_order = table.Column<int>(type: "integer", nullable: false),
                    approver_id = table.Column<int>(type: "integer", nullable: true),
                    decision = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    comment = table.Column<string>(type: "text", nullable: true),
                    decided_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
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
                    table.PrimaryKey("pk_budget_approvals", x => x.id);
                    table.ForeignKey(
                        name: "fk_budget_approvals_budget_versions_version_id",
                        column: x => x.version_id,
                        principalTable: "budget_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_budget_approvals_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "customers",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    segment_id = table.Column<int>(type: "integer", nullable: false),
                    start_date = table.Column<DateOnly>(type: "date", nullable: true),
                    end_date = table.Column<DateOnly>(type: "date", nullable: true),
                    source_sheet = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("pk_customers", x => x.id);
                    table.ForeignKey(
                        name: "fk_customers_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_customers_segments_segment_id",
                        column: x => x.segment_id,
                        principalTable: "segments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "expense_entries",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    version_id = table.Column<int>(type: "integer", nullable: true),
                    budget_year_id = table.Column<int>(type: "integer", nullable: false),
                    category_id = table.Column<int>(type: "integer", nullable: false),
                    month = table.Column<int>(type: "integer", nullable: false),
                    entry_type = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    amount_original = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    currency_code = table.Column<string>(type: "character(3)", fixedLength: true, maxLength: 3, nullable: false),
                    amount_try_fixed = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    amount_try_spot = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("pk_expense_entries", x => x.id);
                    table.ForeignKey(
                        name: "fk_expense_entries_budget_versions_version_id",
                        column: x => x.version_id,
                        principalTable: "budget_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_expense_entries_budget_years_budget_year_id",
                        column: x => x.budget_year_id,
                        principalTable: "budget_years",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_expense_entries_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_expense_entries_currencies_currency_code",
                        column: x => x.currency_code,
                        principalTable: "currencies",
                        principalColumn: "code",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_expense_entries_expense_categories_category_id",
                        column: x => x.category_id,
                        principalTable: "expense_categories",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "special_items",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    version_id = table.Column<int>(type: "integer", nullable: true),
                    budget_year_id = table.Column<int>(type: "integer", nullable: false),
                    item_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    month = table.Column<int>(type: "integer", nullable: true),
                    amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    currency_code = table.Column<string>(type: "character(3)", fixedLength: true, maxLength: 3, nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("pk_special_items", x => x.id);
                    table.ForeignKey(
                        name: "fk_special_items_budget_versions_version_id",
                        column: x => x.version_id,
                        principalTable: "budget_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_special_items_budget_years_budget_year_id",
                        column: x => x.budget_year_id,
                        principalTable: "budget_years",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_special_items_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_special_items_currencies_currency_code",
                        column: x => x.currency_code,
                        principalTable: "currencies",
                        principalColumn: "code",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "user_segments",
                columns: table => new
                {
                    user_id = table.Column<int>(type: "integer", nullable: false),
                    segment_id = table.Column<int>(type: "integer", nullable: false),
                    can_edit = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_user_segments", x => new { x.user_id, x.segment_id });
                    table.ForeignKey(
                        name: "fk_user_segments_asp_net_users_user_id",
                        column: x => x.user_id,
                        principalTable: "AspNetUsers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_user_segments_segments_segment_id",
                        column: x => x.segment_id,
                        principalTable: "segments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "actual_entries",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    budget_year_id = table.Column<int>(type: "integer", nullable: false),
                    customer_id = table.Column<int>(type: "integer", nullable: false),
                    month = table.Column<int>(type: "integer", nullable: false),
                    entry_type = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    amount_original = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    currency_code = table.Column<string>(type: "character(3)", fixedLength: true, maxLength: 3, nullable: false),
                    amount_try_fixed = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    amount_try_spot = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    source = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    synced_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
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
                    table.PrimaryKey("pk_actual_entries", x => x.id);
                    table.ForeignKey(
                        name: "fk_actual_entries_budget_years_budget_year_id",
                        column: x => x.budget_year_id,
                        principalTable: "budget_years",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_actual_entries_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_actual_entries_currencies_currency_code",
                        column: x => x.currency_code,
                        principalTable: "currencies",
                        principalColumn: "code",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_actual_entries_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "budget_entries",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    version_id = table.Column<int>(type: "integer", nullable: false),
                    customer_id = table.Column<int>(type: "integer", nullable: false),
                    month = table.Column<int>(type: "integer", nullable: false),
                    entry_type = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    amount_original = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    currency_code = table.Column<string>(type: "character(3)", fixedLength: true, maxLength: 3, nullable: false),
                    amount_try_fixed = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    amount_try_spot = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("pk_budget_entries", x => x.id);
                    table.ForeignKey(
                        name: "fk_budget_entries_budget_versions_version_id",
                        column: x => x.version_id,
                        principalTable: "budget_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_budget_entries_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_budget_entries_currencies_currency_code",
                        column: x => x.currency_code,
                        principalTable: "currencies",
                        principalColumn: "code",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_budget_entries_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_actual_entries_budget_year_id",
                table: "actual_entries",
                column: "budget_year_id");

            migrationBuilder.CreateIndex(
                name: "ix_actual_entries_company_id_budget_year_id_customer_id_month",
                table: "actual_entries",
                columns: new[] { "company_id", "budget_year_id", "customer_id", "month" });

            migrationBuilder.CreateIndex(
                name: "ix_actual_entries_company_id_budget_year_id_customer_id_month_",
                table: "actual_entries",
                columns: new[] { "company_id", "budget_year_id", "customer_id", "month", "entry_type" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_actual_entries_currency_code",
                table: "actual_entries",
                column: "currency_code");

            migrationBuilder.CreateIndex(
                name: "ix_actual_entries_customer_id",
                table: "actual_entries",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "ix_budget_approvals_company_id",
                table: "budget_approvals",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "ix_budget_approvals_version_id_stage_order",
                table: "budget_approvals",
                columns: new[] { "version_id", "stage_order" });

            migrationBuilder.CreateIndex(
                name: "ix_budget_entries_company_id_version_id_customer_id_month",
                table: "budget_entries",
                columns: new[] { "company_id", "version_id", "customer_id", "month" });

            migrationBuilder.CreateIndex(
                name: "ix_budget_entries_currency_code",
                table: "budget_entries",
                column: "currency_code");

            migrationBuilder.CreateIndex(
                name: "ix_budget_entries_customer_id",
                table: "budget_entries",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "ix_budget_entries_version_id_customer_id_month_entry_type",
                table: "budget_entries",
                columns: new[] { "version_id", "customer_id", "month", "entry_type" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_customers_company_id_code",
                table: "customers",
                columns: new[] { "company_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_customers_segment_id",
                table: "customers",
                column: "segment_id");

            migrationBuilder.CreateIndex(
                name: "ix_expense_entries_budget_year_id",
                table: "expense_entries",
                column: "budget_year_id");

            migrationBuilder.CreateIndex(
                name: "ix_expense_entries_category_id",
                table: "expense_entries",
                column: "category_id");

            migrationBuilder.CreateIndex(
                name: "ix_expense_entries_company_id_budget_year_id_category_id_month",
                table: "expense_entries",
                columns: new[] { "company_id", "budget_year_id", "category_id", "month" });

            migrationBuilder.CreateIndex(
                name: "ix_expense_entries_currency_code",
                table: "expense_entries",
                column: "currency_code");

            migrationBuilder.CreateIndex(
                name: "ix_expense_entries_version_id",
                table: "expense_entries",
                column: "version_id");

            migrationBuilder.CreateIndex(
                name: "ix_special_items_budget_year_id",
                table: "special_items",
                column: "budget_year_id");

            migrationBuilder.CreateIndex(
                name: "ix_special_items_company_id",
                table: "special_items",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "ix_special_items_currency_code",
                table: "special_items",
                column: "currency_code");

            migrationBuilder.CreateIndex(
                name: "ix_special_items_version_id",
                table: "special_items",
                column: "version_id");

            migrationBuilder.CreateIndex(
                name: "ix_user_segments_segment_id",
                table: "user_segments",
                column: "segment_id");

            // CHECK constraints
            migrationBuilder.Sql("""
                ALTER TABLE budget_entries ADD CONSTRAINT chk_budget_entries_month CHECK (month BETWEEN 1 AND 12);
                ALTER TABLE budget_entries ADD CONSTRAINT chk_budget_entries_entry_type CHECK (entry_type IN ('REVENUE', 'CLAIM'));
                ALTER TABLE actual_entries ADD CONSTRAINT chk_actual_entries_month CHECK (month BETWEEN 1 AND 12);
                ALTER TABLE actual_entries ADD CONSTRAINT chk_actual_entries_entry_type CHECK (entry_type IN ('REVENUE', 'CLAIM'));
                ALTER TABLE actual_entries ADD CONSTRAINT chk_actual_entries_source CHECK (source IN ('MANUAL', 'ERP_SYNC', 'IMPORT'));
                ALTER TABLE expense_entries ADD CONSTRAINT chk_expense_entries_month CHECK (month BETWEEN 1 AND 12);
                ALTER TABLE expense_entries ADD CONSTRAINT chk_expense_entries_entry_type CHECK (entry_type IN ('BUDGET', 'ACTUAL'));
                ALTER TABLE special_items ADD CONSTRAINT chk_special_items_month CHECK (month IS NULL OR month BETWEEN 1 AND 12);
                ALTER TABLE special_items ADD CONSTRAINT chk_special_items_item_type CHECK (item_type IN ('MUALLAK_HASAR', 'DEMO_FILO', 'FINANSAL_GELIR', 'T_KATILIM', 'AMORTISMAN'));
                ALTER TABLE budget_approvals ADD CONSTRAINT chk_budget_approvals_stage CHECK (stage IN ('DEPT_HEAD', 'FINANCE', 'CFO'));
                ALTER TABLE budget_approvals ADD CONSTRAINT chk_budget_approvals_decision CHECK (decision IN ('PENDING', 'APPROVED', 'REJECTED'));
                """);

            // RLS policies
            migrationBuilder.Sql("""
                ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
                ALTER TABLE customers FORCE ROW LEVEL SECURITY;
                CREATE POLICY tenant_isolation ON customers
                    USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::INT);

                ALTER TABLE budget_entries ENABLE ROW LEVEL SECURITY;
                ALTER TABLE budget_entries FORCE ROW LEVEL SECURITY;
                CREATE POLICY tenant_isolation ON budget_entries
                    USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::INT);

                ALTER TABLE actual_entries ENABLE ROW LEVEL SECURITY;
                ALTER TABLE actual_entries FORCE ROW LEVEL SECURITY;
                CREATE POLICY tenant_isolation ON actual_entries
                    USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::INT);

                ALTER TABLE expense_entries ENABLE ROW LEVEL SECURITY;
                ALTER TABLE expense_entries FORCE ROW LEVEL SECURITY;
                CREATE POLICY tenant_isolation ON expense_entries
                    USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::INT);

                ALTER TABLE special_items ENABLE ROW LEVEL SECURITY;
                ALTER TABLE special_items FORCE ROW LEVEL SECURITY;
                CREATE POLICY tenant_isolation ON special_items
                    USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::INT);

                ALTER TABLE budget_approvals ENABLE ROW LEVEL SECURITY;
                ALTER TABLE budget_approvals FORCE ROW LEVEL SECURITY;
                CREATE POLICY tenant_isolation ON budget_approvals
                    USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::INT);
                """);

            // GRANTs to budget_app role
            migrationBuilder.Sql("""
                GRANT SELECT, INSERT, UPDATE, DELETE ON customers TO budget_app;
                GRANT SELECT, INSERT, UPDATE, DELETE ON budget_entries TO budget_app;
                GRANT SELECT, INSERT, UPDATE, DELETE ON actual_entries TO budget_app;
                GRANT SELECT, INSERT, UPDATE, DELETE ON expense_entries TO budget_app;
                GRANT SELECT, INSERT, UPDATE, DELETE ON special_items TO budget_app;
                GRANT SELECT, INSERT, UPDATE, DELETE ON budget_approvals TO budget_app;
                GRANT SELECT, INSERT, UPDATE, DELETE ON user_segments TO budget_app;
                GRANT USAGE, SELECT ON SEQUENCE customers_id_seq TO budget_app;
                GRANT USAGE, SELECT ON SEQUENCE budget_entries_id_seq TO budget_app;
                GRANT USAGE, SELECT ON SEQUENCE actual_entries_id_seq TO budget_app;
                GRANT USAGE, SELECT ON SEQUENCE expense_entries_id_seq TO budget_app;
                GRANT USAGE, SELECT ON SEQUENCE special_items_id_seq TO budget_app;
                GRANT USAGE, SELECT ON SEQUENCE budget_approvals_id_seq TO budget_app;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "actual_entries");

            migrationBuilder.DropTable(
                name: "budget_approvals");

            migrationBuilder.DropTable(
                name: "budget_entries");

            migrationBuilder.DropTable(
                name: "expense_entries");

            migrationBuilder.DropTable(
                name: "special_items");

            migrationBuilder.DropTable(
                name: "user_segments");

            migrationBuilder.DropTable(
                name: "customers");
        }
    }
}
