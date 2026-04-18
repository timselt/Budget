using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BudgetTracker.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SeedInitialProductCategories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Initial product-category seed confirmed by Timur 2026-04-18:
            //   YOL_YARDIM, IKAME_ARAC, KONUT_ASISTANS, WARRANTY.
            // SegmentId intentionally NULL = valid across all customer segments.
            // Additional categories + products are managed from ProductsPage
            // (ADR-0013 §2.5 "dinamik yönetilebilir").
            //
            // Idempotent insert: ON CONFLICT (company_id, code) DO NOTHING so
            // the migration is safe to replay and won't fight with manually
            // inserted categories.
            migrationBuilder.Sql("""
                INSERT INTO product_categories
                    (company_id, code, name, description, display_order, is_active, created_at)
                SELECT c.id, v.code, v.name, v.description, v.display_order, TRUE, NOW()
                FROM companies c, (VALUES
                    ('YOL_YARDIM',     'Yol Yardım',      'Yol yardım, çekici, kurtarma teminatları', 1),
                    ('IKAME_ARAC',     'İkame Araç',      'İkame araç gün / değişim teminatları',     2),
                    ('KONUT_ASISTANS', 'Konut Asistans',  'Konut acil bakım ve onarım teminatları',   3),
                    ('WARRANTY',       'Warranty',        'Uzatılmış garanti ve OEM sonrası teminat', 4)
                ) AS v(code, name, description, display_order)
                WHERE c.code = 'TAG'
                ON CONFLICT (company_id, code) DO NOTHING;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Only remove the seed rows; user-created categories or edits are
            // preserved via the soft-delete filter (deleted_at IS NULL).
            migrationBuilder.Sql("""
                DELETE FROM product_categories
                WHERE code IN ('YOL_YARDIM','IKAME_ARAC','KONUT_ASISTANS','WARRANTY')
                  AND updated_at IS NULL;
                """);
        }
    }
}
