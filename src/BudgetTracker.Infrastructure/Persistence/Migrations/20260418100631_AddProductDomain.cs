using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BudgetTracker.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProductDomain : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_budget_entries_version_id_customer_id_month_entry_type",
                table: "budget_entries");

            migrationBuilder.DropIndex(
                name: "ix_actual_entries_company_id_budget_year_id_customer_id_month_",
                table: "actual_entries");

            migrationBuilder.AddColumn<int>(
                name: "product_id",
                table: "budget_entries",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "product_id",
                table: "actual_entries",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "product_categories",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    display_order = table.Column<int>(type: "integer", nullable: false),
                    segment_id = table.Column<int>(type: "integer", nullable: true),
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
                    table.PrimaryKey("pk_product_categories", x => x.id);
                    table.ForeignKey(
                        name: "fk_product_categories_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_product_categories_segments_segment_id",
                        column: x => x.segment_id,
                        principalTable: "segments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "products",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    product_category_id = table.Column<int>(type: "integer", nullable: false),
                    code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    coverage_terms_json = table.Column<string>(type: "jsonb", nullable: true),
                    default_currency_code = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: true),
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
                    table.PrimaryKey("pk_products", x => x.id);
                    table.ForeignKey(
                        name: "fk_products_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_products_product_categories_product_category_id",
                        column: x => x.product_category_id,
                        principalTable: "product_categories",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "customer_products",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    customer_id = table.Column<int>(type: "integer", nullable: false),
                    product_id = table.Column<int>(type: "integer", nullable: false),
                    commission_rate = table.Column<decimal>(type: "numeric(6,3)", nullable: true),
                    unit_price_try = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    start_date = table.Column<DateOnly>(type: "date", nullable: true),
                    end_date = table.Column<DateOnly>(type: "date", nullable: true),
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
                name: "ix_budget_entries_product_id_month",
                table: "budget_entries",
                columns: new[] { "product_id", "month" });

            migrationBuilder.CreateIndex(
                name: "ix_budget_entries_version_id_customer_id_product_id_month_entr",
                table: "budget_entries",
                columns: new[] { "version_id", "customer_id", "product_id", "month", "entry_type" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_actual_entries_company_id_budget_year_id_customer_id_produc",
                table: "actual_entries",
                columns: new[] { "company_id", "budget_year_id", "customer_id", "product_id", "month", "entry_type" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_actual_entries_product_id_month",
                table: "actual_entries",
                columns: new[] { "product_id", "month" });

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

            migrationBuilder.CreateIndex(
                name: "ix_product_categories_company_id_code",
                table: "product_categories",
                columns: new[] { "company_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_product_categories_company_id_is_active",
                table: "product_categories",
                columns: new[] { "company_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "ix_product_categories_segment_id",
                table: "product_categories",
                column: "segment_id");

            migrationBuilder.CreateIndex(
                name: "ix_products_company_id_code",
                table: "products",
                columns: new[] { "company_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_products_product_category_id_is_active",
                table: "products",
                columns: new[] { "product_category_id", "is_active" });

            migrationBuilder.AddForeignKey(
                name: "fk_actual_entries_products_product_id",
                table: "actual_entries",
                column: "product_id",
                principalTable: "products",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_budget_entries_products_product_id",
                table: "budget_entries",
                column: "product_id",
                principalTable: "products",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            // RLS + FORCE RLS + tenant_isolation policy for new tables
            // (matches pattern from AddBudgetDomainEntities migration).
            migrationBuilder.Sql("""
                ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
                ALTER TABLE product_categories FORCE ROW LEVEL SECURITY;
                CREATE POLICY tenant_isolation ON product_categories
                    USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::INT);

                ALTER TABLE products ENABLE ROW LEVEL SECURITY;
                ALTER TABLE products FORCE ROW LEVEL SECURITY;
                CREATE POLICY tenant_isolation ON products
                    USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::INT);

                ALTER TABLE customer_products ENABLE ROW LEVEL SECURITY;
                ALTER TABLE customer_products FORCE ROW LEVEL SECURITY;
                CREATE POLICY tenant_isolation ON customer_products
                    USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::INT);
                """);

            // GRANTs to budget_app role
            migrationBuilder.Sql("""
                GRANT SELECT, INSERT, UPDATE, DELETE ON product_categories TO budget_app;
                GRANT SELECT, INSERT, UPDATE, DELETE ON products TO budget_app;
                GRANT SELECT, INSERT, UPDATE, DELETE ON customer_products TO budget_app;
                GRANT USAGE, SELECT ON SEQUENCE product_categories_id_seq TO budget_app;
                GRANT USAGE, SELECT ON SEQUENCE products_id_seq TO budget_app;
                GRANT USAGE, SELECT ON SEQUENCE customer_products_id_seq TO budget_app;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP POLICY IF EXISTS tenant_isolation ON customer_products;
                DROP POLICY IF EXISTS tenant_isolation ON products;
                DROP POLICY IF EXISTS tenant_isolation ON product_categories;
                """);

            migrationBuilder.DropForeignKey(
                name: "fk_actual_entries_products_product_id",
                table: "actual_entries");

            migrationBuilder.DropForeignKey(
                name: "fk_budget_entries_products_product_id",
                table: "budget_entries");

            migrationBuilder.DropTable(
                name: "customer_products");

            migrationBuilder.DropTable(
                name: "products");

            migrationBuilder.DropTable(
                name: "product_categories");

            migrationBuilder.DropIndex(
                name: "ix_budget_entries_product_id_month",
                table: "budget_entries");

            migrationBuilder.DropIndex(
                name: "ix_budget_entries_version_id_customer_id_product_id_month_entr",
                table: "budget_entries");

            migrationBuilder.DropIndex(
                name: "ix_actual_entries_company_id_budget_year_id_customer_id_produc",
                table: "actual_entries");

            migrationBuilder.DropIndex(
                name: "ix_actual_entries_product_id_month",
                table: "actual_entries");

            migrationBuilder.DropColumn(
                name: "product_id",
                table: "budget_entries");

            migrationBuilder.DropColumn(
                name: "product_id",
                table: "actual_entries");

            migrationBuilder.CreateIndex(
                name: "ix_budget_entries_version_id_customer_id_month_entry_type",
                table: "budget_entries",
                columns: new[] { "version_id", "customer_id", "month", "entry_type" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_actual_entries_company_id_budget_year_id_customer_id_month_",
                table: "actual_entries",
                columns: new[] { "company_id", "budget_year_id", "customer_id", "month", "entry_type" },
                unique: true);
        }
    }
}
