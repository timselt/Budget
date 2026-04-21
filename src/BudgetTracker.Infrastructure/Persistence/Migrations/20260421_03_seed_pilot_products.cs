using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BudgetTracker.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SeedPilotProducts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Kullanıcı kararı 2026-04-21: Pilot ürün master listesi 4 ürün —
            // Yol Yardım, İkame Araç, Konut, Warranty (Eksper/Sağlık/Mini Onarım
            // kapsamda değil, SGK Teşvik ayrı). Her ürün, aynı kodlu mevcut
            // kategori (20260418102702_SeedInitialProductCategories seed) altına
            // yerleşir.
            //
            // Her kategoriye 1 varsayılan ürün seed ediliyor — SKU varyantları
            // (YOLYARD-30, IKAMARAC-1G, vb.) PriceBookItem seviyesinde string
            // kod olarak yaşar, ayrı Product entity gerektirmez.
            //
            // Contract + PriceBook kurulumu (89 müşteri için) bu seed'in kapsamı
            // dışında — docs/Mutabakat_Modulu/seed/README.md bash script'i
            // muhasebe ekibi gerçek fiyatlarla çalıştırır.
            //
            // Idempotent: ON CONFLICT (company_id, code) DO NOTHING.
            migrationBuilder.Sql("""
                INSERT INTO products
                    (company_id, product_category_id, code, name, description,
                     default_currency_code, display_order, is_active, created_at)
                SELECT c.id, pc.id, v.code, v.name, v.description,
                       'TRY', v.display_order, TRUE, NOW()
                FROM companies c
                CROSS JOIN (VALUES
                    ('YOL_YARDIM',     'YOL_YARDIM',     'Yol Yardım',      'Yol yardım, çekici, kurtarma — varsayılan ürün',   1),
                    ('IKAME_ARAC',     'IKAME_ARAC',     'İkame Araç',      'İkame araç gün / değişim — varsayılan ürün',       2),
                    ('KONUT_ASISTANS', 'KONUT_ASISTANS', 'Konut Asistans',  'Konut acil bakım ve onarım — varsayılan ürün',     3),
                    ('WARRANTY',       'WARRANTY',       'Warranty',        'Uzatılmış garanti ve OEM sonrası — varsayılan ürün', 4)
                ) AS v(category_code, code, name, description, display_order)
                JOIN product_categories pc ON pc.company_id = c.id AND pc.code = v.category_code
                WHERE c.code = 'TAG'
                ON CONFLICT (company_id, code) DO NOTHING;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Sadece seed satırları geri al; sözleşme/PriceBook tarafından
            // referans edilmişse FK engeller (DeleteBehavior.Restrict).
            migrationBuilder.Sql("""
                DELETE FROM products
                WHERE code IN ('YOL_YARDIM','IKAME_ARAC','KONUT_ASISTANS','WARRANTY')
                  AND updated_at IS NULL
                  AND deleted_at IS NULL;
                """);
        }
    }
}
