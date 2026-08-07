import type { TournamentSummary } from "@/domain/tournament-dashboard";

type TournamentSummaryCardProps = {
  summary: TournamentSummary;
};

function Stat({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="tournament-summary-stat">
      <div className="tournament-summary-stat__icon" aria-hidden>
        {icon}
      </div>
      <div className="tournament-summary-stat__body">
        <div className="tournament-summary-stat__label">{label}</div>
        <div className="tournament-summary-stat__value">{value}</div>
      </div>
    </div>
  );
}

export function TournamentSummaryCard({ summary }: TournamentSummaryCardProps) {
  const createdLabel = new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(summary.startedAt);

  return (
    <section className="tournament-summary-card card card-static" aria-label="Turnuva özeti">
      <div className="tournament-summary-grid">
        <Stat
          icon="🏅"
          label="Katılımcı"
          value={String(summary.participantCount)}
        />
        <Stat icon="🎮" label="Toplam Maç" value={String(summary.totalMatches)} />
        <Stat
          icon="✅"
          label="Tamamlanan"
          value={String(summary.completedMatches)}
        />
        <Stat icon="⏳" label="Kalan Maç" value={String(summary.remainingMatches)} />
        <Stat
          icon="🏆"
          label="Şampiyon"
          value={summary.championLabel ?? "Bekleniyor"}
        />
        <Stat icon="📅" label="Başlangıç" value={createdLabel} />
      </div>
    </section>
  );
}
