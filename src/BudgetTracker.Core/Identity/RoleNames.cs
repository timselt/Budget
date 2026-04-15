namespace BudgetTracker.Core.Identity;

public static class RoleNames
{
    public const string Admin = "Admin";
    public const string Cfo = "CFO";
    public const string FinanceManager = "FinanceManager";
    public const string DepartmentHead = "DepartmentHead";
    public const string Viewer = "Viewer";

    public static readonly IReadOnlyList<string> All = new[]
    {
        Admin,
        Cfo,
        FinanceManager,
        DepartmentHead,
        Viewer,
    };
}
