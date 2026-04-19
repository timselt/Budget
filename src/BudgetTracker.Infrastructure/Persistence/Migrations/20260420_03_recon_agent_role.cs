using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BudgetTracker.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddReconAgentRole : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Mutabakat önkoşul #3 (00c) — ReconAgent rolü için deterministik seed.
            // IdentitySeeder dev/staging'de çalışır, ancak prod bootstrap bu migration
            // tablo satırına güvenir. INSERT idempotent (NOT EXISTS) — tekrar çalıştırma güvenli.
            migrationBuilder.Sql(@"
INSERT INTO ""AspNetRoles"" (name, normalized_name, concurrency_stamp)
SELECT 'ReconAgent', 'RECONAGENT', gen_random_uuid()::text
WHERE NOT EXISTS (
    SELECT 1 FROM ""AspNetRoles"" WHERE normalized_name = 'RECONAGENT'
);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DELETE FROM ""AspNetRoles"" WHERE normalized_name = 'RECONAGENT';");
        }
    }
}
