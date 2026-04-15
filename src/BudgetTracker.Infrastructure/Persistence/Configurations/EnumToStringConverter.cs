using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace BudgetTracker.Infrastructure.Persistence.Configurations;

/// <summary>SCREAMING_SNAKE_CASE string conversion for enum columns (matches CHECK constraints).</summary>
public sealed class EnumToStringConverter<TEnum> : ValueConverter<TEnum, string>
    where TEnum : struct, Enum
{
    public EnumToStringConverter()
        : base(
            v => ToScreamingSnake(v.ToString()),
            v => (TEnum)Enum.Parse(typeof(TEnum), FromScreamingSnake(v), ignoreCase: true))
    {
    }

    private static string ToScreamingSnake(string pascal)
    {
        if (string.IsNullOrEmpty(pascal)) return pascal;
        var sb = new System.Text.StringBuilder(pascal.Length + 4);
        for (var i = 0; i < pascal.Length; i++)
        {
            var c = pascal[i];
            if (i > 0 && char.IsUpper(c))
            {
                sb.Append('_');
            }
            sb.Append(char.ToUpperInvariant(c));
        }
        return sb.ToString();
    }

    private static string FromScreamingSnake(string snake)
    {
        if (string.IsNullOrEmpty(snake)) return snake;
        var parts = snake.Split('_', StringSplitOptions.RemoveEmptyEntries);
        var sb = new System.Text.StringBuilder();
        foreach (var p in parts)
        {
            if (p.Length == 0) continue;
            sb.Append(char.ToUpperInvariant(p[0]));
            if (p.Length > 1) sb.Append(p[1..].ToLowerInvariant());
        }
        return sb.ToString();
    }
}
