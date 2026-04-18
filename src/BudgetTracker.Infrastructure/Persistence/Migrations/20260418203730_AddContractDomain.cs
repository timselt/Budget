using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BudgetTracker.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddContractDomain : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ADR-0014 — Contract domain.
            // Dev/prod-öncesi durumda customer_products tablosu boş olduğu için
            // drop güvenli. Üretim deployment'ında veri varsa buradaki drop
            // yerine atomic rename + backfill script'i kullanılmalı
            // (ayrı bir ADR). Bu migration greenfield varsayar.
            migrationBuilder.DropTable(
                name: "customer_products");

            migrationBuilder.AddColumn<int>(
                name: "short_id",
                table: "customers",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "contract_id",
                table: "budget_entries",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "contracts",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    customer_id = table.Column<int>(type: "integer", nullable: false),
                    product_id = table.Column<int>(type: "integer", nullable: false),
                    unit_price_try = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    start_date = table.Column<DateOnly>(type: "date", nullable: true),
                    end_date = table.Column<DateOnly>(type: "date", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    business_line = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    sales_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    product_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    vehicle_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    contract_form = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    contract_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    payment_frequency = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    adjustment_clause = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    contract_kind = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    service_area = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    version = table.Column<int>(type: "integer", nullable: false),
                    contract_code = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    revision_count = table.Column<int>(type: "integer", nullable: false),
                    customer_short_id = table.Column<int>(type: "integer", nullable: false),
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
                    table.PrimaryKey("pk_contracts", x => x.id);
                    table.ForeignKey(
                        name: "fk_contracts_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_contracts_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_contracts_products_product_id",
                        column: x => x.product_id,
                        principalTable: "products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_customers_company_id_short_id",
                table: "customers",
                columns: new[] { "company_id", "short_id" },
                unique: true,
                filter: "deleted_at IS NULL AND short_id > 0");

            migrationBuilder.CreateIndex(
                name: "ix_budget_entries_contract_id",
                table: "budget_entries",
                column: "contract_id");

            migrationBuilder.CreateIndex(
                name: "ix_contracts_company_id_contract_code",
                table: "contracts",
                columns: new[] { "company_id", "contract_code" },
                unique: true,
                filter: "deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "ix_contracts_company_id_customer_id_product_id_start_date",
                table: "contracts",
                columns: new[] { "company_id", "customer_id", "product_id", "start_date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_contracts_customer_id_is_active",
                table: "contracts",
                columns: new[] { "customer_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "ix_contracts_product_id_is_active",
                table: "contracts",
                columns: new[] { "product_id", "is_active" });

            migrationBuilder.AddForeignKey(
                name: "fk_budget_entries_contracts_contract_id",
                table: "budget_entries",
                column: "contract_id",
                principalTable: "contracts",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            // Seed: 2025-2030 bütçe yılları. Idempotent — tekrar çalıştırılsa
            // ON CONFLICT DO NOTHING ile çakışma atlanır.
            migrationBuilder.Sql("""
                INSERT INTO budget_years (company_id, year, is_locked, created_at)
                SELECT c.id, y.year, FALSE, NOW()
                FROM companies c, (VALUES (2025),(2026),(2027),(2028),(2029),(2030)) AS y(year)
                WHERE c.code = 'TAG'
                ON CONFLICT DO NOTHING;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_budget_entries_contracts_contract_id",
                table: "budget_entries");

            migrationBuilder.DropTable(
                name: "contracts");

            migrationBuilder.DropIndex(
                name: "ix_customers_company_id_short_id",
                table: "customers");

            migrationBuilder.DropIndex(
                name: "ix_budget_entries_contract_id",
                table: "budget_entries");

            migrationBuilder.DropColumn(
                name: "short_id",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "contract_id",
                table: "budget_entries");

            migrationBuilder.CreateTable(
                name: "customer_products",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    company_id = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    customer_id = table.Column<int>(type: "integer", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    end_date = table.Column<DateOnly>(type: "date", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    product_id = table.Column<int>(type: "integer", nullable: false),
                    start_date = table.Column<DateOnly>(type: "date", nullable: true),
                    unit_price_try = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    updated_by_user_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_customer_products", x => x.id);
                    table.ForeignKey(
                        name: "fk_customer_products_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_customer_products_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_customer_products_products_product_id",
                        column: x => x.product_id,
                        principalTable: "products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_customer_products_company_id_customer_id_product_id_start_d",
                table: "customer_products",
                columns: new[] { "company_id", "customer_id", "product_id", "start_date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_customer_products_customer_id_is_active",
                table: "customer_products",
                columns: new[] { "customer_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "ix_customer_products_product_id_is_active",
                table: "customer_products",
                columns: new[] { "product_id", "is_active" });
        }
    }
}
