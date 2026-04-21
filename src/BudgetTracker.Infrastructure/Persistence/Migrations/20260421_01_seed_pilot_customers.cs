using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BudgetTracker.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SeedPilotCustomers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Pilot seed — ButceMusteriler.xlsx (Timur, 2026-04-21) üzerinden
            // 89 gerçek müşteri. 4 kategori: Sigorta 22, Otomotiv 24, Filo 24,
            // Alternatif 19. ADR-0017 mutabakat akış modeline uyumlu.
            //
            // Segment: category → segment kod eşlemesi (SIGORTA/OTOMOTIV/FILO/
            // ALTERNATIF — InitialSchema seed'inde var).
            // ShortId: 1-89 sequential (contract code segmenti #6 için).
            // Code: Türkçe karakter + boşluk yok, uppercase, max 30 char.
            //
            // Idempotent: ON CONFLICT (company_id, code) DO NOTHING. Replay
            // güvenli; elle girilmiş müşterilerle çakışma olursa atlanır.
            migrationBuilder.Sql("""
                INSERT INTO customers
                    (company_id, code, name, category_code, segment_id,
                     short_id, is_active, is_group_internal, is_other_flag, created_at)
                SELECT c.id, v.code, v.name, v.category_code, s.id,
                       v.short_id, TRUE, FALSE, FALSE, NOW()
                FROM companies c
                CROSS JOIN (VALUES
                    ('SOMPO', 'Sompo Sigorta', 'Sigorta', 'SIGORTA', 1),
                    ('ANADOLU', 'Anadolu Sigorta', 'Sigorta', 'SIGORTA', 2),
                    ('HEPIYI', 'Hepiyi Sigorta', 'Sigorta', 'SIGORTA', 3),
                    ('AKSIGORTA', 'Ak Sigorta', 'Sigorta', 'SIGORTA', 4),
                    ('KORU', 'Koru Sigorta', 'Sigorta', 'SIGORTA', 5),
                    ('MAGDEBURGE', 'Magdeburger Sigorta', 'Sigorta', 'SIGORTA', 6),
                    ('NIPPON', 'Turk Nippon Sigorta', 'Sigorta', 'SIGORTA', 7),
                    ('ORIENT', 'Orient Sigorta', 'Sigorta', 'SIGORTA', 8),
                    ('REFERANS', 'Referans Sigorta', 'Sigorta', 'SIGORTA', 9),
                    ('ATLAS', 'Atlas Mutuel Sigorta', 'Sigorta', 'SIGORTA', 10),
                    ('MAPFRE', 'Mapfre Sigorta', 'Sigorta', 'SIGORTA', 11),
                    ('GULF', 'Gulf Sigorta', 'Sigorta', 'SIGORTA', 12),
                    ('ZURICH', 'Zurich Sigorta', 'Sigorta', 'SIGORTA', 13),
                    ('UNICO', 'Unico Sigorta', 'Sigorta', 'SIGORTA', 14),
                    ('PRIVE', 'Prive Sigorta', 'Sigorta', 'SIGORTA', 15),
                    ('ANKARA', 'Ankara Sigorta', 'Sigorta', 'SIGORTA', 16),
                    ('SEKER', 'Seker Sigorta', 'Sigorta', 'SIGORTA', 17),
                    ('EMAA', 'Emaa Sigorta', 'Sigorta', 'SIGORTA', 18),
                    ('UMAT_ANA', 'Ana Sigorta', 'Sigorta', 'SIGORTA', 19),
                    ('QUICK', 'Quick Sigorta', 'Sigorta', 'SIGORTA', 20),
                    ('AXA', 'AXA', 'Sigorta', 'SIGORTA', 21),
                    ('EUREKO', 'EUREKO', 'Sigorta', 'SIGORTA', 22),
                    ('TOGG', 'TOGG', 'Otomotiv', 'OTOMOTIV', 23),
                    ('TOFAS', 'Tofaş', 'Otomotiv', 'OTOMOTIV', 24),
                    ('TOYOTA', 'Toyota', 'Otomotiv', 'OTOMOTIV', 25),
                    ('NISSAN', 'Nissan', 'Otomotiv', 'OTOMOTIV', 26),
                    ('RENAULT', 'Renault', 'Otomotiv', 'OTOMOTIV', 27),
                    ('BYD', 'BYD', 'Otomotiv', 'OTOMOTIV', 28),
                    ('KIA', 'KIA', 'Otomotiv', 'OTOMOTIV', 29),
                    ('HONDA', 'Honda', 'Otomotiv', 'OTOMOTIV', 30),
                    ('MG_YARDIM', 'MG', 'Otomotiv', 'OTOMOTIV', 31),
                    ('DOGUS', 'Dogus Oto', 'Otomotiv', 'OTOMOTIV', 32),
                    ('CHERY', 'Chery', 'Otomotiv', 'OTOMOTIV', 33),
                    ('MAN', 'Man', 'Otomotiv', 'OTOMOTIV', 34),
                    ('METAL', 'Metal Oto', 'Otomotiv', 'OTOMOTIV', 35),
                    ('GARANTI', 'Warranty', 'Otomotiv', 'OTOMOTIV', 36),
                    ('KARSAN', 'Karsan', 'Otomotiv', 'OTOMOTIV', 37),
                    ('SUZUKI', 'Suzuki', 'Otomotiv', 'OTOMOTIV', 38),
                    ('JAECOO', 'Jaecoo', 'Otomotiv', 'OTOMOTIV', 39),
                    ('MAXUS', 'Maxus', 'Otomotiv', 'OTOMOTIV', 40),
                    ('HANKOOK', 'Hankook Lastik', 'Otomotiv', 'OTOMOTIV', 41),
                    ('OTOGARANTI', 'OTO GARANTİ', 'Otomotiv', 'OTOMOTIV', 42),
                    ('OYAK', 'OYAK', 'Otomotiv', 'OTOMOTIV', 43),
                    ('LYNKCO', 'Lynk & Co', 'Otomotiv', 'OTOMOTIV', 44),
                    ('FERRARI', 'Ferrari', 'Otomotiv', 'OTOMOTIV', 45),
                    ('DFSK', 'DFSK', 'Otomotiv', 'OTOMOTIV', 46),
                    ('OTOKOC', 'Otokoc-AVIS', 'Filo', 'FILO', 47),
                    ('ENTERPRISE', 'Enterprise', 'Filo', 'FILO', 48),
                    ('ZIRAAT_FIL', 'Ziraat Filo', 'Filo', 'FILO', 49),
                    ('RENTGO', 'RentGo', 'Filo', 'FILO', 50),
                    ('BURGAN', 'Burgan Leasing', 'Filo', 'FILO', 51),
                    ('GREEN', 'Greenmotion', 'Filo', 'FILO', 52),
                    ('PORT_FILO', 'PORT FİLO', 'Filo', 'FILO', 53),
                    ('SEKAR', 'Sekar Filo', 'Filo', 'FILO', 54),
                    ('ARKAS', 'Arkas Filo', 'Filo', 'FILO', 55),
                    ('KARRENT', 'Kar Rent a Car', 'Filo', 'FILO', 56),
                    ('HERTZ', 'Hertz Filo', 'Filo', 'FILO', 57),
                    ('DOKAY', 'Dokay Filo', 'Filo', 'FILO', 58),
                    ('MAYGOLD', 'Maygold Filo', 'Filo', 'FILO', 59),
                    ('MOBILUP', 'Mobilup Filo', 'Filo', 'FILO', 60),
                    ('ATAKO', 'Atako Filo', 'Filo', 'FILO', 61),
                    ('RENTLEE', 'RENTLEE', 'Filo', 'FILO', 62),
                    ('BEON', 'Beon Filo', 'Filo', 'FILO', 63),
                    ('UNITED', 'United Filo', 'Filo', 'FILO', 64),
                    ('ROTA', 'ROTA', 'Filo', 'FILO', 65),
                    ('TUR_FILO', 'TUR FİLO', 'Filo', 'FILO', 66),
                    ('KAR_OTO', 'KAR OTO', 'Filo', 'FILO', 67),
                    ('ARGUN_FILO', 'Argun Filo', 'Filo', 'FILO', 68),
                    ('KAYAFILO', 'Kaya Filo', 'Filo', 'FILO', 69),
                    ('PLUS_FLEET', 'PLUS FLEET', 'Filo', 'FILO', 70),
                    ('EUROP', 'Europ Assistance', 'Alternatif', 'ALTERNATIF', 71),
                    ('UMRAN', 'Umran', 'Alternatif', 'ALTERNATIF', 72),
                    ('IS_BANKASI', 'Is Bankasi', 'Alternatif', 'ALTERNATIF', 73),
                    ('SIGORTAACE', 'Sigorta Acentesi', 'Alternatif', 'ALTERNATIF', 74),
                    ('OTOKONFOR', 'Otokonfor', 'Alternatif', 'ALTERNATIF', 75),
                    ('EFT', 'Eft Ekspertiz', 'Alternatif', 'ALTERNATIF', 76),
                    ('TTELEKOM', 'Turk Telekom', 'Alternatif', 'ALTERNATIF', 77),
                    ('RS', 'RS Ekspertiz', 'Alternatif', 'ALTERNATIF', 78),
                    ('CARVAK', 'Carvak', 'Alternatif', 'ALTERNATIF', 79),
                    ('TUR_ASSIST', 'TUR ASSİST', 'Alternatif', 'ALTERNATIF', 80),
                    ('LETGO', 'Letgo', 'Alternatif', 'ALTERNATIF', 81),
                    ('ALIFENDI', 'Alifendi Turizm', 'Alternatif', 'ALTERNATIF', 82),
                    ('DIGERGELIR', 'DİĞERGELİR', 'Alternatif', 'ALTERNATIF', 83),
                    ('APSIYON', 'Apsiyon', 'Alternatif', 'ALTERNATIF', 84),
                    ('TAMAMLIYO', 'TAMAMLIYO', 'Alternatif', 'ALTERNATIF', 85),
                    ('TENAX', 'Tenax', 'Alternatif', 'ALTERNATIF', 86),
                    ('DEAKTIF', 'DEAKTİF', 'Alternatif', 'ALTERNATIF', 87),
                    ('ARABAM_COM', 'ARABAM.COM', 'Alternatif', 'ALTERNATIF', 88),
                    ('ISBANKONUT', 'İŞBANKONUT', 'Alternatif', 'ALTERNATIF', 89)
                ) AS v(code, name, category_code, segment_code, short_id)
                JOIN segments s ON s.company_id = c.id AND s.code = v.segment_code
                WHERE c.code = 'TAG'
                ON CONFLICT (company_id, code) DO NOTHING;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Sadece seed satırlarını geri al — elle düzenlenmiş
            // (updated_at != null) kayıtlar korunur.
            migrationBuilder.Sql("""
                DELETE FROM customers
                WHERE code IN (
                    'SOMPO','ANADOLU','HEPIYI','AKSIGORTA','KORU','MAGDEBURGE','NIPPON',
                    'ORIENT','REFERANS','ATLAS','MAPFRE','GULF','ZURICH','UNICO','PRIVE',
                    'ANKARA','SEKER','EMAA','UMAT_ANA','QUICK','AXA','EUREKO',
                    'TOGG','TOFAS','TOYOTA','NISSAN','RENAULT','BYD','KIA','HONDA',
                    'MG_YARDIM','DOGUS','CHERY','MAN','METAL','GARANTI','KARSAN',
                    'SUZUKI','JAECOO','MAXUS','HANKOOK','OTOGARANTI','OYAK','LYNKCO',
                    'FERRARI','DFSK',
                    'OTOKOC','ENTERPRISE','ZIRAAT_FIL','RENTGO','BURGAN','GREEN',
                    'PORT_FILO','SEKAR','ARKAS','KARRENT','HERTZ','DOKAY','MAYGOLD',
                    'MOBILUP','ATAKO','RENTLEE','BEON','UNITED','ROTA','TUR_FILO',
                    'KAR_OTO','ARGUN_FILO','KAYAFILO','PLUS_FLEET',
                    'EUROP','UMRAN','IS_BANKASI','SIGORTAACE','OTOKONFOR','EFT',
                    'TTELEKOM','RS','CARVAK','TUR_ASSIST','LETGO','ALIFENDI',
                    'DIGERGELIR','APSIYON','TAMAMLIYO','TENAX','DEAKTIF',
                    'ARABAM_COM','ISBANKONUT'
                )
                AND updated_at IS NULL
                AND deleted_at IS NULL;
                """);
        }
    }
}
