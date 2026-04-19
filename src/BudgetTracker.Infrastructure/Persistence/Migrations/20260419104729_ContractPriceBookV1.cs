using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BudgetTracker.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Mutabakat Önkoşul 00b — Contract genişletme + PriceBook altyapısı.
    /// Sprint paralel orkestrasyonunda "pricebook" branch'i (bkz.
    /// <c>docs/Mutabakat_Modulu/docs/specs/03_parallel_prereq_orchestration.md §2.1</c>).
    /// </summary>
    public partial class ContractPriceBookV1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // PriceBook EXCLUDE USING gist constraint için composite index desteği.
            // Postgres 16 contrib paketi ile dağıtılır; Railway'de zaten mevcut.
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS btree_gist;");

            migrationBuilder.AddColumn<string>(
                name: "contract_name",
                table: "contracts",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "currency_code",
                table: "contracts",
                type: "character(3)",
                fixedLength: true,
                maxLength: 3,
                nullable: false,
                defaultValue: "TRY");

            // Default 'Active' backfill değeri; aşağıdaki UPDATE cümleciği
            // mevcut is_active=false satırları 'Terminated'a çeker.
            migrationBuilder.AddColumn<string>(
                name: "status",
                table: "contracts",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Active");

            migrationBuilder.AddColumn<string>(
                name: "termination_reason",
                table: "contracts",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            // Geri uyum: mevcut is_active=false satırlarını Terminated'a çek.
            // Yeni insert'ler servis katmanından Status değeriyle gelir.
            migrationBuilder.Sql(
                "UPDATE contracts SET status = 'Terminated' WHERE is_active = FALSE;");

            migrationBuilder.CreateTable(
                name: "price_books",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    contract_id = table.Column<int>(type: "integer", nullable: false),
                    version_no = table.Column<int>(type: "integer", nullable: false),
                    effective_from = table.Column<DateOnly>(type: "date", nullable: false),
                    effective_to = table.Column<DateOnly>(type: "date", nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    approved_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    approved_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
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
                    table.PrimaryKey("pk_price_books", x => x.id);
                    table.ForeignKey(
                        name: "fk_price_books_companies_company_id",
                        column: x => x.company_id,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_price_books_contracts_contract_id",
                        column: x => x.contract_id,
                        principalTable: "contracts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "price_book_items",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    price_book_id = table.Column<int>(type: "integer", nullable: false),
                    product_code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    product_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    item_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    unit = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    unit_price = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    currency_code = table.Column<string>(type: "character(3)", fixedLength: true, maxLength: 3, nullable: false),
                    tax_rate = table.Column<decimal>(type: "numeric(5,2)", nullable: true),
                    min_quantity = table.Column<decimal>(type: "numeric(18,4)", nullable: true),
                    notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    updated_by_user_id = table.Column<int>(type: "integer", nullable: true),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    deleted_by_user_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_price_book_items", x => x.id);
                    table.ForeignKey(
                        name: "fk_price_book_items_price_books_price_book_id",
                        column: x => x.price_book_id,
                        principalTable: "price_books",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_contracts_company_id_status_customer_id",
                table: "contracts",
                columns: new[] { "company_id", "status", "customer_id" });

            migrationBuilder.CreateIndex(
                name: "ix_price_book_items_price_book_id_product_code",
                table: "price_book_items",
                columns: new[] { "price_book_id", "product_code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_price_books_company_id_status",
                table: "price_books",
                columns: new[] { "company_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_price_books_contract_id_status_effective_from",
                table: "price_books",
                columns: new[] { "contract_id", "status", "effective_from" });

            migrationBuilder.CreateIndex(
                name: "ix_price_books_contract_id_version_no",
                table: "price_books",
                columns: new[] { "contract_id", "version_no" },
                unique: true);

            // 00b §2.1 — "Bir Contract için aynı anda yalnızca bir Active PriceBook".
            // EXCLUDE USING gist: aynı contract_id ve Active durumda tarih aralığı
            // çakışması olan yeni satır atanamaz. COALESCE ile effective_to NULL
            // durumu 'infinity' kabul edilir (açık uçlu sürüm). Partial WHERE ile
            // sadece aktif ve silinmemiş satırlar kontrol edilir.
            migrationBuilder.Sql(@"
                ALTER TABLE price_books
                ADD CONSTRAINT ux_price_books_active_contract_range
                EXCLUDE USING gist (
                    contract_id WITH =,
                    daterange(effective_from, COALESCE(effective_to, 'infinity'::date), '[]') WITH &&
                )
                WHERE (status = 'Active' AND deleted_at IS NULL);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "ALTER TABLE price_books DROP CONSTRAINT IF EXISTS ux_price_books_active_contract_range;");

            migrationBuilder.DropTable(
                name: "price_book_items");

            migrationBuilder.DropTable(
                name: "price_books");

            migrationBuilder.DropIndex(
                name: "ix_contracts_company_id_status_customer_id",
                table: "contracts");

            migrationBuilder.DropColumn(
                name: "contract_name",
                table: "contracts");

            migrationBuilder.DropColumn(
                name: "currency_code",
                table: "contracts");

            migrationBuilder.DropColumn(
                name: "status",
                table: "contracts");

            migrationBuilder.DropColumn(
                name: "termination_reason",
                table: "contracts");

            // btree_gist extension diğer migration'larda da kullanılabilir;
            // güvenlik için DROP EXTENSION yapmıyoruz.
        }
    }
}
