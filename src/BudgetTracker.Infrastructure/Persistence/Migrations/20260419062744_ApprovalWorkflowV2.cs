using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BudgetTracker.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// ADR-0015: onay akışı 2 aşamaya indirildi.
    ///
    /// 1. Eski enum string'leri yeni değerlere map'lenir
    ///    (Submitted, DeptApproved → PendingFinance; FinanceApproved, CfoApproved → PendingCfo)
    /// 2. Yıl başına invariant ihlali defensive cleanup
    /// 3. Partial unique index: yıl başına tek "çalışılan taslak"
    /// 4. dept_approved_at + dept_approved_by_user_id kolonları düşer
    /// </summary>
    public partial class ApprovalWorkflowV2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ============================================================
            // 1) Eski CHECK constraint'i düş — eski 8-değer setini içeriyor
            //    (DRAFT, SUBMITTED, DEPT_APPROVED, ...) — yeni 6-değer
            //    SCREAMING_SNAKE_CASE constraint Step 5'te eklenir.
            // ============================================================
            migrationBuilder.Sql(@"
                ALTER TABLE budget_versions
                    DROP CONSTRAINT IF EXISTS ck_budget_versions_status;
            ");

            // ============================================================
            // 2) Invariant cleanup ÖNCE — yıl başına birden fazla "çalışılan
            //    taslak" varsa partial unique index oluşturulduktan sonra
            //    UPDATE'in atomic check'i fail olur. UPPER karşılaştırma
            //    çünkü eski değerler upper-case olabilir.
            // ============================================================
            migrationBuilder.Sql(@"
                WITH ranked AS (
                  SELECT id,
                         ROW_NUMBER() OVER (
                           PARTITION BY company_id, budget_year_id
                           ORDER BY created_at DESC, id DESC
                         ) AS rn
                    FROM budget_versions
                   WHERE UPPER(status) IN (
                           'DRAFT','SUBMITTED','DEPT_APPROVED','DEPTAPPROVED',
                           'FINANCE_APPROVED','CFO_APPROVED','FINANCEAPPROVED',
                           'CFOAPPROVED','REJECTED','PENDINGFINANCE','PENDINGCFO')
                     AND deleted_at IS NULL
                )
                UPDATE budget_versions
                   SET status = 'ARCHIVED',
                       updated_at = NOW()
                 WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
            ");

            // ============================================================
            // 3) Aynı şekilde Active invariant cleanup.
            // ============================================================
            migrationBuilder.Sql(@"
                WITH ranked AS (
                  SELECT id,
                         ROW_NUMBER() OVER (
                           PARTITION BY company_id, budget_year_id
                           ORDER BY created_at DESC, id DESC
                         ) AS rn
                    FROM budget_versions
                   WHERE UPPER(status) = 'ACTIVE'
                     AND deleted_at IS NULL
                )
                UPDATE budget_versions
                   SET status = 'ARCHIVED',
                       is_active = FALSE,
                       updated_at = NOW()
                 WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
            ");

            // ============================================================
            // 4) Eski enum string'lerini SCREAMING_SNAKE_CASE'e normalize.
            //    BudgetTracker custom EnumToStringConverter PascalCase enum'ı
            //    SCREAMING_SNAKE_CASE'e çevirir (Draft → DRAFT, PendingFinance
            //    → PENDING_FINANCE). DB hep bu format kullanır.
            // ============================================================
            migrationBuilder.Sql(@"
                UPDATE budget_versions
                   SET status = CASE
                          WHEN UPPER(status) = 'DRAFT'                                          THEN 'DRAFT'
                          WHEN UPPER(status) IN ('SUBMITTED','DEPT_APPROVED','DEPTAPPROVED','PENDINGFINANCE','PENDING_FINANCE')   THEN 'PENDING_FINANCE'
                          WHEN UPPER(status) IN ('FINANCE_APPROVED','CFO_APPROVED','FINANCEAPPROVED','CFOAPPROVED','PENDINGCFO','PENDING_CFO') THEN 'PENDING_CFO'
                          WHEN UPPER(status) = 'ACTIVE'                                        THEN 'ACTIVE'
                          WHEN UPPER(status) = 'REJECTED'                                      THEN 'REJECTED'
                          WHEN UPPER(status) = 'ARCHIVED'                                      THEN 'ARCHIVED'
                          ELSE status
                        END;
            ");

            // ============================================================
            // 5) Yeni CHECK constraint (SCREAMING_SNAKE_CASE 6 değer)
            // ============================================================
            migrationBuilder.Sql(@"
                ALTER TABLE budget_versions
                    ADD CONSTRAINT ck_budget_versions_status
                    CHECK (status IN ('DRAFT','PENDING_FINANCE','PENDING_CFO','ACTIVE','REJECTED','ARCHIVED'));
            ");

            // ============================================================
            // 6) Partial unique index: yıl başına tek çalışılan taslak.
            //    Active invariant'ı zaten EXCLUDE USING gist ile sağlanıyor.
            // ============================================================
            migrationBuilder.Sql(@"
                CREATE UNIQUE INDEX IF NOT EXISTS ux_budget_versions_single_in_progress
                    ON budget_versions (company_id, budget_year_id)
                 WHERE status IN ('DRAFT','PENDING_FINANCE','PENDING_CFO','REJECTED')
                   AND deleted_at IS NULL;
            ");

            // ============================================================
            // 7) dept_approved_* kolonları düşer
            // ============================================================
            migrationBuilder.DropColumn(
                name: "dept_approved_at",
                table: "budget_versions");

            migrationBuilder.DropColumn(
                name: "dept_approved_by_user_id",
                table: "budget_versions");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Kolonları geri ekle (orijinal NULL değerler kaybedilir)
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "dept_approved_at",
                table: "budget_versions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "dept_approved_by_user_id",
                table: "budget_versions",
                type: "integer",
                nullable: true);

            // Partial index düş
            migrationBuilder.Sql("DROP INDEX IF EXISTS ux_budget_versions_single_in_progress;");

            // Enum string'lerini geri çevir (best-effort — orijinal granülerlik kaybolur)
            migrationBuilder.Sql(@"
                UPDATE budget_versions
                   SET status = CASE status
                                  WHEN 'PENDING_FINANCE' THEN 'SUBMITTED'
                                  WHEN 'PENDING_CFO'     THEN 'FINANCE_APPROVED'
                                  ELSE status
                                END
                 WHERE status IN ('PENDING_FINANCE','PENDING_CFO');
            ");
        }
    }
}
