using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BudgetTracker.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SeedMissingExpenseCategories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Kullanıcı kararı 2026-04-21: Excel şablonu `butce_schema_v1.sql`
            // 17 kategori, backend 9; eksik 8 kategori tümü onaylandı.
            // ADR-0012 kapandı.
            //
            // Eşleme mantığı:
            // - SEYAHAT/PAZARLAMA/DANISMANLIK/AGIRLAMA/KONUT_KONFOR/YATIRIM →
            //   GENERAL (gider kalemleri, holding ile aynı sınıflandırma ailesi)
            // - ARAC_TURFILO → TECHNICAL (mevcut ARAC ile aynı sınıflandırma)
            // - T_KATILIM → FINANCIAL (kâr payı finansal düzeltme)
            //
            // Not: Şemanın DIGER_OLAGAN kodu backend'in mevcut DIGER
            // (EXTRAORDINARY) koduyla eşdeğer kabul edildi, tekrar
            // eklenmez (aynı iş anlamı, farklı label).
            //
            // Idempotent: ON CONFLICT (company_id, code) DO NOTHING.
            migrationBuilder.Sql("""
                INSERT INTO expense_categories
                    (company_id, code, name, classification, display_order, is_active, created_at)
                SELECT c.id, v.code, v.name, v.classification, v.display_order, TRUE, NOW()
                FROM companies c
                CROSS JOIN (VALUES
                    ('SEYAHAT',       'Seyahat Giderleri',         'GENERAL',   10),
                    ('PAZARLAMA',     'Pazarlama Giderleri',       'GENERAL',   11),
                    ('DANISMANLIK',   'Danışmanlık Giderleri',     'GENERAL',   12),
                    ('AGIRLAMA',      'Ağırlama Giderleri',        'GENERAL',   13),
                    ('ARAC_TURFILO',  'Araç Giderleri - TurFilo',  'TECHNICAL', 14),
                    ('KONUT_KONFOR',  'Konut Konfor Giderleri',    'GENERAL',   15),
                    ('T_KATILIM',     'T.Katılım',                 'FINANCIAL', 16),
                    ('YATIRIM',       'Yatırım Gideri',            'GENERAL',   17)
                ) AS v(code, name, classification, display_order)
                WHERE c.code = 'TAG'
                ON CONFLICT (company_id, code) DO NOTHING;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Sadece bu migration'ın eklediği seed satırları geri al;
            // elle düzenlenmiş veya expense_entries tarafından referans
            // edilmiş kayıtlar korunur (FK cascade yok).
            migrationBuilder.Sql("""
                DELETE FROM expense_categories
                WHERE code IN (
                    'SEYAHAT','PAZARLAMA','DANISMANLIK','AGIRLAMA',
                    'ARAC_TURFILO','KONUT_KONFOR','T_KATILIM','YATIRIM'
                )
                AND updated_at IS NULL
                AND deleted_at IS NULL;
                """);
        }
    }
}
