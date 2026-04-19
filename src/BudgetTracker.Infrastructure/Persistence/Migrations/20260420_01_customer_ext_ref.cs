using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BudgetTracker.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerExternalRef : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "external_customer_ref",
                table: "customers",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "external_ref_verified_at",
                table: "customers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "external_ref_verified_by_user_id",
                table: "customers",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "external_source_system",
                table: "customers",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_customer_external_ref",
                table: "customers",
                columns: new[] { "company_id", "external_customer_ref" },
                unique: true,
                filter: "external_customer_ref IS NOT NULL AND deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "ix_customer_external_ref_lookup",
                table: "customers",
                columns: new[] { "company_id", "external_source_system", "external_customer_ref" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_customer_external_ref",
                table: "customers");

            migrationBuilder.DropIndex(
                name: "ix_customer_external_ref_lookup",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "external_customer_ref",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "external_ref_verified_at",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "external_ref_verified_by_user_id",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "external_source_system",
                table: "customers");
        }
    }
}
