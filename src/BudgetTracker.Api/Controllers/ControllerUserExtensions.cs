using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using OpenIddict.Abstractions;

namespace BudgetTracker.Api.Controllers;

internal static class ControllerUserExtensions
{
    public static int GetRequiredUserId(this ControllerBase controller)
    {
        var raw = controller.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? controller.User.FindFirstValue(OpenIddictConstants.Claims.Subject)
            ?? controller.User.FindFirstValue("sub");

        if (!int.TryParse(raw, NumberStyles.None, CultureInfo.InvariantCulture, out var userId))
        {
            throw new UnauthorizedAccessException("Geçerli kullanıcı kimliği bulunamadı.");
        }

        return userId;
    }
}
