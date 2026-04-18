using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BudgetTracker.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBudgetAndActualEntryQuantity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "quantity",
                table: "budget_entries",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "quantity",
                table: "actual_entries",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "quantity",
                table: "budget_entries");

            migrationBuilder.DropColumn(
                name: "quantity",
                table: "actual_entries");
        }
    }
}
