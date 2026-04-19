using BudgetTracker.Core.Common;
using BudgetTracker.Core.Enums.Reconciliation;

namespace BudgetTracker.Core.Entities.Reconciliation;

/// <summary>
/// Append-only decision (Faz 1 spec §3.6) — line üzerinde alınan her aksiyon.
/// <b>Sprint 1 iskelet:</b> tablo oluşur; aksiyon yazımı Sprint 2'de
/// agent UI ile birlikte aktive edilir.
/// </summary>
public sealed class ReconciliationDecision : BaseEntity
{
    public int LineId { get; private set; }
    public ReconciliationDecisionType DecisionType { get; private set; }
    public int ActorUserId { get; private set; }
    public ReconciliationActorRole ActorRole { get; private set; }
    public DateTimeOffset DecidedAt { get; private set; }
    public string? Note { get; private set; }

    /// <summary>Müşteri onay maili PDF'i, ekran görüntüsü vb. blob/path ref.</summary>
    public string? EvidenceFileRef { get; private set; }

    private ReconciliationDecision() { }

    public static ReconciliationDecision Create(
        int lineId,
        ReconciliationDecisionType decisionType,
        int actorUserId,
        ReconciliationActorRole actorRole,
        DateTimeOffset decidedAt,
        string? note = null,
        string? evidenceFileRef = null)
    {
        if (lineId <= 0) throw new ArgumentOutOfRangeException(nameof(lineId));
        if (actorUserId <= 0) throw new ArgumentOutOfRangeException(nameof(actorUserId));

        return new ReconciliationDecision
        {
            LineId = lineId,
            DecisionType = decisionType,
            ActorUserId = actorUserId,
            ActorRole = actorRole,
            DecidedAt = decidedAt,
            Note = note,
            EvidenceFileRef = evidenceFileRef,
            CreatedAt = decidedAt,
            CreatedByUserId = actorUserId,
        };
    }
}
