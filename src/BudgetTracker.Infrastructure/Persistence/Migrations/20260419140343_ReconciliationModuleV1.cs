using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BudgetTracker.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ReconciliationModuleV1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "reconciliation_batches",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    flow = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    period_code = table.Column<string>(type: "character(7)", fixedLength: true, maxLength: 7, nullable: false),
                    source_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    source_file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    source_file_hash = table.Column<string>(type: "character(64)", fixedLength: true, maxLength: 64, nullable: false),
                    row_count = table.Column<int>(type: "integer", nullable: false),
                    imported_by_user_id = table.Column<int>(type: "integer", nullable: false),
                    imported_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
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
                    table.PrimaryKey("pk_reconciliation_batches", x => x.id);
                    table.ForeignKey(
                        name: "fk_reconciliation_batches_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "reconciliation_cases",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    flow = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    period_code = table.Column<string>(type: "character(7)", fixedLength: true, maxLength: 7, nullable: false),
                    customer_id = table.Column<int>(type: "integer", nullable: false),
                    contract_id = table.Column<int>(type: "integer", nullable: true),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    owner_user_id = table.Column<int>(type: "integer", nullable: false),
                    opened_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    sent_to_customer_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    customer_response_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    sent_to_accounting_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    total_amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    currency_code = table.Column<string>(type: "character(3)", fixedLength: true, maxLength: 3, nullable: false),
                    notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
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
                    table.PrimaryKey("pk_reconciliation_cases", x => x.id);
                    table.ForeignKey(
                        name: "fk_reconciliation_cases_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_reconciliation_cases_contracts_contract_id",
                        column: x => x.contract_id,
                        principalTable: "contracts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_reconciliation_cases_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "risk_rule_sets",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    flow = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    low_to_medium_days = table.Column<int>(type: "integer", nullable: false),
                    medium_to_high_days = table.Column<int>(type: "integer", nullable: false),
                    effective_from = table.Column<DateOnly>(type: "date", nullable: false),
                    effective_to = table.Column<DateOnly>(type: "date", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    updated_by_user_id = table.Column<int>(type: "integer", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_risk_rule_sets", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "reconciliation_source_rows",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    batch_id = table.Column<int>(type: "integer", nullable: false),
                    external_customer_ref = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    external_document_ref = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    raw_payload = table.Column<string>(type: "jsonb", nullable: false),
                    row_number = table.Column<int>(type: "integer", nullable: false),
                    parsed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    parse_status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    parse_errors = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    updated_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_reconciliation_source_rows", x => x.id);
                    table.ForeignKey(
                        name: "fk_reconciliation_source_rows_reconciliation_batches_batch_id",
                        column: x => x.batch_id,
                        principalTable: "reconciliation_batches",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "accounting_instructions",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    case_id = table.Column<int>(type: "integer", nullable: false),
                    customer_id = table.Column<int>(type: "integer", nullable: false),
                    period_code = table.Column<string>(type: "character(7)", fixedLength: true, maxLength: 7, nullable: false),
                    flow = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    lines_summary = table.Column<string>(type: "jsonb", nullable: false),
                    total_amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    currency_code = table.Column<string>(type: "character(3)", fixedLength: true, maxLength: 3, nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    exported_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    exported_format = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    external_ref = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
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
                    table.PrimaryKey("pk_accounting_instructions", x => x.id);
                    table.ForeignKey(
                        name: "fk_accounting_instructions_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_accounting_instructions_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_accounting_instructions_reconciliation_cases_case_id",
                        column: x => x.case_id,
                        principalTable: "reconciliation_cases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "reconciliation_lines",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    case_id = table.Column<int>(type: "integer", nullable: false),
                    source_row_id = table.Column<int>(type: "integer", nullable: false),
                    product_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    product_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    quantity = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    unit_price = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    currency_code = table.Column<string>(type: "character(3)", fixedLength: true, maxLength: 3, nullable: false),
                    price_source_ref = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    dispute_reason_code = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    dispute_note = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    updated_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_reconciliation_lines", x => x.id);
                    table.ForeignKey(
                        name: "fk_reconciliation_lines_reconciliation_cases_case_id",
                        column: x => x.case_id,
                        principalTable: "reconciliation_cases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_reconciliation_lines_reconciliation_source_rows_source_row_",
                        column: x => x.source_row_id,
                        principalTable: "reconciliation_source_rows",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "reconciliation_decisions",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    line_id = table.Column<int>(type: "integer", nullable: false),
                    decision_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    actor_user_id = table.Column<int>(type: "integer", nullable: false),
                    actor_role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    decided_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    note = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    evidence_file_ref = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    updated_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_reconciliation_decisions", x => x.id);
                    table.ForeignKey(
                        name: "fk_reconciliation_decisions_reconciliation_lines_line_id",
                        column: x => x.line_id,
                        principalTable: "reconciliation_lines",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_accounting_instructions_case_id",
                table: "accounting_instructions",
                column: "case_id");

            migrationBuilder.CreateIndex(
                name: "ix_accounting_instructions_company_id_period_code_flow",
                table: "accounting_instructions",
                columns: new[] { "company_id", "period_code", "flow" });

            migrationBuilder.CreateIndex(
                name: "ix_accounting_instructions_company_id_status",
                table: "accounting_instructions",
                columns: new[] { "company_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_accounting_instructions_customer_id",
                table: "accounting_instructions",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "ix_reconciliation_batches_company_id_flow_period_code_status",
                table: "reconciliation_batches",
                columns: new[] { "company_id", "flow", "period_code", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_reconciliation_batches_company_id_imported_at",
                table: "reconciliation_batches",
                columns: new[] { "company_id", "imported_at" });

            migrationBuilder.CreateIndex(
                name: "ix_reconciliation_batches_company_id_source_file_hash",
                table: "reconciliation_batches",
                columns: new[] { "company_id", "source_file_hash" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_reconciliation_cases_company_id_flow_period_code_customer_id",
                table: "reconciliation_cases",
                columns: new[] { "company_id", "flow", "period_code", "customer_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_reconciliation_cases_company_id_status",
                table: "reconciliation_cases",
                columns: new[] { "company_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_reconciliation_cases_contract_id",
                table: "reconciliation_cases",
                column: "contract_id");

            migrationBuilder.CreateIndex(
                name: "ix_reconciliation_cases_customer_id",
                table: "reconciliation_cases",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "ix_reconciliation_cases_owner_user_id",
                table: "reconciliation_cases",
                column: "owner_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_reconciliation_decisions_actor_user_id_decided_at",
                table: "reconciliation_decisions",
                columns: new[] { "actor_user_id", "decided_at" });

            migrationBuilder.CreateIndex(
                name: "ix_reconciliation_decisions_line_id_decided_at",
                table: "reconciliation_decisions",
                columns: new[] { "line_id", "decided_at" });

            migrationBuilder.CreateIndex(
                name: "ix_reconciliation_lines_case_id_status",
                table: "reconciliation_lines",
                columns: new[] { "case_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_reconciliation_lines_source_row_id",
                table: "reconciliation_lines",
                column: "source_row_id");

            migrationBuilder.CreateIndex(
                name: "ix_reconciliation_source_rows_batch_id_parse_status",
                table: "reconciliation_source_rows",
                columns: new[] { "batch_id", "parse_status" });

            migrationBuilder.CreateIndex(
                name: "ix_reconciliation_source_rows_batch_id_row_number",
                table: "reconciliation_source_rows",
                columns: new[] { "batch_id", "row_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_reconciliation_source_rows_external_customer_ref",
                table: "reconciliation_source_rows",
                column: "external_customer_ref");

            migrationBuilder.CreateIndex(
                name: "ix_risk_rule_sets_flow_effective_from",
                table: "risk_rule_sets",
                columns: new[] { "flow", "effective_from" });

            // Multi-tenant RLS — Day-1 prensibi (CLAUDE.md). Sadece company_id
            // taşıyan tablolarda; child tablolar (source_rows, lines, decisions)
            // FK cascade ile parent batch/case'in policy'sinden korunur.
            // risk_rule_sets global config — RLS yok.
            migrationBuilder.Sql("""
                ALTER TABLE reconciliation_batches ENABLE ROW LEVEL SECURITY;
                ALTER TABLE reconciliation_batches FORCE ROW LEVEL SECURITY;
                CREATE POLICY tenant_isolation ON reconciliation_batches
                    USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::INT);

                ALTER TABLE reconciliation_cases ENABLE ROW LEVEL SECURITY;
                ALTER TABLE reconciliation_cases FORCE ROW LEVEL SECURITY;
                CREATE POLICY tenant_isolation ON reconciliation_cases
                    USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::INT);

                ALTER TABLE accounting_instructions ENABLE ROW LEVEL SECURITY;
                ALTER TABLE accounting_instructions FORCE ROW LEVEL SECURITY;
                CREATE POLICY tenant_isolation ON accounting_instructions
                    USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::INT);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // RLS policy'leri tablo silinmeden önce drop edilir (defensive).
            migrationBuilder.Sql("""
                DROP POLICY IF EXISTS tenant_isolation ON accounting_instructions;
                DROP POLICY IF EXISTS tenant_isolation ON reconciliation_cases;
                DROP POLICY IF EXISTS tenant_isolation ON reconciliation_batches;
                """);

            migrationBuilder.DropTable(
                name: "accounting_instructions");

            migrationBuilder.DropTable(
                name: "reconciliation_decisions");

            migrationBuilder.DropTable(
                name: "risk_rule_sets");

            migrationBuilder.DropTable(
                name: "reconciliation_lines");

            migrationBuilder.DropTable(
                name: "reconciliation_cases");

            migrationBuilder.DropTable(
                name: "reconciliation_source_rows");

            migrationBuilder.DropTable(
                name: "reconciliation_batches");
        }
    }
}
