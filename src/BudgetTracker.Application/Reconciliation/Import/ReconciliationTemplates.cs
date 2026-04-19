using BudgetTracker.Core.Enums.Reconciliation;

namespace BudgetTracker.Application.Reconciliation.Import;

/// <summary>
/// Sigorta + Otomotiv şablon tanımları (Faz 1 spec §6.1, §6.2). Alias listesi
/// mutabakat ekibinin yıllar içinde gözlemlediği gerçek başlık varyasyonlarını
/// içerir; sözlük genişledikçe burası güncellenir (docs/reconciliation/parser-fixtures.md).
/// </summary>
public static class ReconciliationTemplates
{
    /// <summary>Sigorta poliçe listesi (spec §6.1) — 9 kolon.</summary>
    public static TemplateDefinition Insurance { get; } = new(
        ReconciliationFlow.Insurance,
        new List<ColumnDefinition>
        {
            new("policy_no",
                new[] { "policy_no", "police_no", "poliçe_no", "policy number", "poliçe numarası" },
                ColumnValueType.String, IsRequired: true,
                "Poliçe numarası"),
            new("insured_party_name",
                new[] { "insured_party_name", "insured_name", "sigortali_adi", "sigortalı adı", "sigortalı" },
                ColumnValueType.String, IsRequired: true,
                "Sigortalı adı"),
            new("product_code",
                new[] { "product_code", "urun_kodu", "ürün kodu", "paket_kodu", "asistans_kodu" },
                ColumnValueType.String, IsRequired: true,
                "Asistans paketi kodu"),
            new("product_name",
                new[] { "product_name", "urun_adi", "ürün adı", "paket_adi", "asistans_adi" },
                ColumnValueType.String, IsRequired: true,
                "Paket gösterim adı"),
            new("quantity",
                new[] { "quantity", "qty", "adet", "miktar" },
                ColumnValueType.Integer, IsRequired: true,
                "Adet (genelde 1)"),
            new("unit_price_expected",
                new[] { "unit_price_expected", "expected_price", "beklenen_fiyat", "birim_fiyat" },
                ColumnValueType.Decimal, IsRequired: false,
                "Şirketin beyan ettiği fiyat (kontrol için)"),
            new("period_code",
                new[] { "period_code", "donem", "dönem", "period" },
                ColumnValueType.PeriodCode, IsRequired: true,
                "YYYY-MM formatı"),
            new("external_customer_ref",
                new[] { "external_customer_ref", "logo_kodu", "musteri_kodu", "müşteri kodu", "musteri_ref" },
                ColumnValueType.String, IsRequired: true,
                "Sigorta şirketi Logo kodu"),
            new("notes",
                new[] { "notes", "notlar", "aciklama", "açıklama" },
                ColumnValueType.String, IsRequired: false),
        });

    /// <summary>Otomotiv TARS / Power BI şablonu (spec §6.2) — 9 kolon.</summary>
    public static TemplateDefinition Automotive { get; } = new(
        ReconciliationFlow.Automotive,
        new List<ColumnDefinition>
        {
            new("case_ref",
                new[] { "case_ref", "tars_no", "operation_no", "operasyon_no", "dosya_no" },
                ColumnValueType.String, IsRequired: true,
                "TARS operasyon dosya no"),
            new("service_code",
                new[] { "service_code", "hizmet_kodu", "hizmet kodu", "service_id" },
                ColumnValueType.String, IsRequired: true,
                "Hizmet kodu (çekici, yol yardımı, vb.)"),
            new("service_name",
                new[] { "service_name", "hizmet_adi", "hizmet adı", "service_description" },
                ColumnValueType.String, IsRequired: true,
                "Hizmet gösterim adı"),
            new("usage_count",
                new[] { "usage_count", "adet", "kullanim_adedi", "kullanım adedi", "qty" },
                ColumnValueType.Integer, IsRequired: true,
                "Kullanım adedi"),
            new("service_date",
                new[] { "service_date", "hizmet_tarihi", "hizmet tarihi", "tarih", "date" },
                ColumnValueType.Date, IsRequired: true,
                "Hizmetin verildiği tarih"),
            new("dealer_code",
                new[] { "dealer_code", "bayi_kodu", "bayi kodu", "sirket_kodu", "şirket kodu" },
                ColumnValueType.String, IsRequired: true,
                "Bayi / şirket kodu"),
            new("period_code",
                new[] { "period_code", "donem", "dönem", "period" },
                ColumnValueType.PeriodCode, IsRequired: true,
                "YYYY-MM formatı"),
            new("external_customer_ref",
                new[] { "external_customer_ref", "musteri_kodu", "müşteri kodu", "logo_kodu", "musteri_ref" },
                ColumnValueType.String, IsRequired: true,
                "Müşteri / dealer kodu"),
            new("power_bi_query_ref",
                new[] { "power_bi_query_ref", "powerbi_query", "query_ref", "query_id" },
                ColumnValueType.String, IsRequired: false,
                "Kaynak Power BI query kimliği"),
        });

    public static TemplateDefinition ForFlow(ReconciliationFlow flow) => flow switch
    {
        ReconciliationFlow.Insurance => Insurance,
        ReconciliationFlow.Automotive => Automotive,
        _ => throw new ArgumentOutOfRangeException(nameof(flow),
            $"unknown reconciliation flow: {flow}"),
    };
}
