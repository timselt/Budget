using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BudgetTracker.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddExternalSubjectIdToUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "external_subject_id",
                table: "AspNetUsers",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_asp_net_users_external_subject_id",
                table: "AspNetUsers",
                column: "external_subject_id",
                unique: true,
                filter: "\"external_subject_id\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_asp_net_users_external_subject_id",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "external_subject_id",
                table: "AspNetUsers");
        }
    }
}
