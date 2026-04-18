namespace BudgetTracker.Core.Enums.Contracts;

/// <summary>
/// Kontrat kodu 14-segment enum'ları için kod string dönüşüm yardımcıları.
/// ADR-0014 §2.7: Builder/Parser burada tanımlı tablolara dayanır; C# enum
/// isimleri ile kontrat kodu string değerleri arasında izolasyon katmanı.
/// </summary>
public static class ContractSegmentCodes
{
    // ---- BusinessLine (#2) ----

    public static string ToCode(this BusinessLine value) => ((int)value).ToString();

    public static BusinessLine ParseBusinessLine(string code)
    {
        if (code.Length != 1 || !int.TryParse(code, out var digit))
        {
            throw new ArgumentException(
                $"business line segment must be 1 digit, got '{code}'", nameof(code));
        }

        if (!Enum.IsDefined(typeof(BusinessLine), digit))
        {
            throw new ArgumentException(
                $"unknown business line code '{code}'", nameof(code));
        }

        return (BusinessLine)digit;
    }

    // ---- SalesType (#3) ----

    public static string ToCode(this SalesType value) => value switch
    {
        SalesType.Insurance => "SG",
        SalesType.Automotive => "OM",
        SalesType.DirectChannel => "DK",
        SalesType.Fleet => "OF",
        SalesType.Medical => "MD",
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, null)
    };

    public static SalesType ParseSalesType(string code) => code switch
    {
        "SG" => SalesType.Insurance,
        "OM" => SalesType.Automotive,
        "DK" => SalesType.DirectChannel,
        "OF" => SalesType.Fleet,
        "MD" => SalesType.Medical,
        _ => throw new ArgumentException($"unknown sales type code '{code}'", nameof(code))
    };

    // ---- ProductType (#4) ----

    public static string ToCode(this ProductType value) => value switch
    {
        ProductType.Kasko => "K0",
        ProductType.Trafik => "T0",
        ProductType.Garanti => "G0",
        ProductType.Warranty => "W0",
        ProductType.Bireysel => "B0",
        ProductType.Filo => "F0",
        ProductType.IsYeriAcil => "İ0",
        ProductType.KonutAcil => "K1",
        ProductType.FerdiKaza => "FK",
        ProductType.KonutOnarim => "K2",
        ProductType.IsYeriOnarim => "İ1",
        ProductType.Yat => "Y0",
        ProductType.Diger => "D0",
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, null)
    };

    public static ProductType ParseProductType(string code) => code switch
    {
        "K0" => ProductType.Kasko,
        "T0" => ProductType.Trafik,
        "G0" => ProductType.Garanti,
        "W0" => ProductType.Warranty,
        "B0" => ProductType.Bireysel,
        "F0" => ProductType.Filo,
        "İ0" => ProductType.IsYeriAcil,
        "K1" => ProductType.KonutAcil,
        "FK" => ProductType.FerdiKaza,
        "K2" => ProductType.KonutOnarim,
        "İ1" => ProductType.IsYeriOnarim,
        "Y0" => ProductType.Yat,
        "D0" => ProductType.Diger,
        _ => throw new ArgumentException($"unknown product type code '{code}'", nameof(code))
    };

    // ---- VehicleType (#5) ----

    public static string ToCode(this VehicleType value) => value switch
    {
        VehicleType.None => "000",
        VehicleType.Binek => "B00",
        VehicleType.HafifTicari => "H00",
        VehicleType.AgirTicari => "A00",
        VehicleType.OzelMaksatli => "ÖM0",
        VehicleType.Motosiklet => "M00",
        VehicleType.AgirVeOzelMaksatli => "AÖ0",
        VehicleType.BinekVeHafif => "BH0",
        VehicleType.BinekHafifAgir => "BHF",
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, null)
    };

    public static VehicleType ParseVehicleType(string code) => code switch
    {
        "000" => VehicleType.None,
        "B00" => VehicleType.Binek,
        "H00" => VehicleType.HafifTicari,
        "A00" => VehicleType.AgirTicari,
        "ÖM0" => VehicleType.OzelMaksatli,
        "M00" => VehicleType.Motosiklet,
        "AÖ0" => VehicleType.AgirVeOzelMaksatli,
        "BH0" => VehicleType.BinekVeHafif,
        "BHF" => VehicleType.BinekHafifAgir,
        _ => throw new ArgumentException($"unknown vehicle type code '{code}'", nameof(code))
    };

    // ---- ContractForm (#7) ----

    public static string ToCode(this ContractForm value) => ((int)value).ToString("D2");

    public static ContractForm ParseContractForm(string code)
    {
        if (code.Length != 2 || !int.TryParse(code, out var digit))
        {
            throw new ArgumentException(
                $"contract form segment must be 2 digits, got '{code}'", nameof(code));
        }

        if (!Enum.IsDefined(typeof(ContractForm), digit))
        {
            throw new ArgumentException(
                $"unknown contract form code '{code}'", nameof(code));
        }

        return (ContractForm)digit;
    }

    // ---- ContractType (#8) ----

    public static string ToCode(this ContractType value) => ((int)value).ToString("D2");

    public static ContractType ParseContractType(string code)
    {
        if (code.Length != 2 || !int.TryParse(code, out var digit))
        {
            throw new ArgumentException(
                $"contract type segment must be 2 digits, got '{code}'", nameof(code));
        }

        if (!Enum.IsDefined(typeof(ContractType), digit))
        {
            throw new ArgumentException(
                $"unknown contract type code '{code}'", nameof(code));
        }

        return (ContractType)digit;
    }

    // ---- PaymentFrequency (#10) ----
    // ADR-0014 §2.7: T365 kodda T'siz ("365") render edilir; parser ikisini
    // de kabul eder.

    public static string ToCode(this PaymentFrequency value) => value switch
    {
        PaymentFrequency.UpFront => "P00",
        PaymentFrequency.Monthly => "T12",
        PaymentFrequency.BiMonthly => "T02",
        PaymentFrequency.Quarterly => "T03",
        PaymentFrequency.Daily => "365",
        PaymentFrequency.Other => "T01",
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, null)
    };

    public static PaymentFrequency ParsePaymentFrequency(string code) => code switch
    {
        "P00" => PaymentFrequency.UpFront,
        "T12" => PaymentFrequency.Monthly,
        "T02" => PaymentFrequency.BiMonthly,
        "T03" => PaymentFrequency.Quarterly,
        "T01" => PaymentFrequency.Other,
        "T365" or "365" => PaymentFrequency.Daily,
        _ => throw new ArgumentException($"unknown payment frequency code '{code}'", nameof(code))
    };

    // ---- AdjustmentClause (#11) ----

    public static string ToCode(this AdjustmentClause value) => ((int)value).ToString();

    public static AdjustmentClause ParseAdjustmentClause(string code)
    {
        if (code.Length != 1 || !int.TryParse(code, out var digit))
        {
            throw new ArgumentException(
                $"adjustment clause segment must be 1 digit, got '{code}'", nameof(code));
        }

        if (!Enum.IsDefined(typeof(AdjustmentClause), digit))
        {
            throw new ArgumentException(
                $"unknown adjustment clause code '{code}'", nameof(code));
        }

        return (AdjustmentClause)digit;
    }

    // ---- ContractKind (#12) ----

    public static string ToCode(this ContractKind value) => value switch
    {
        ContractKind.CleanCut => "CC",
        ContractKind.RunOff => "RO",
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, null)
    };

    public static ContractKind ParseContractKind(string code) => code switch
    {
        "CC" => ContractKind.CleanCut,
        "RO" => ContractKind.RunOff,
        _ => throw new ArgumentException($"unknown contract kind code '{code}'", nameof(code))
    };

    // ---- ServiceArea (#13) ----

    public static string ToCode(this ServiceArea value) => ((int)value).ToString();

    public static ServiceArea ParseServiceArea(string code)
    {
        if (code.Length != 1 || !int.TryParse(code, out var digit))
        {
            throw new ArgumentException(
                $"service area segment must be 1 digit, got '{code}'", nameof(code));
        }

        if (!Enum.IsDefined(typeof(ServiceArea), digit))
        {
            throw new ArgumentException(
                $"unknown service area code '{code}'", nameof(code));
        }

        return (ServiceArea)digit;
    }
}
