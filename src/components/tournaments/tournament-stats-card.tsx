import { UserAvatar } from "@/components/ui/user-avatar";
import type { TournamentDashboardStats } from "@/domain/tournament-dashboard";

type TournamentStatsCardProps = {
  stats: TournamentDashboardStats;
};

function StatRow({
  label,
  valueLabel,
  player,
  subtitle,
}: {
  label: string;
  valueLabel: string;
  subtitle?: string | null;
  player?: {
    userId: string;
    fullName: string;
    avatarUrl?: string | null;
    avatarColor?: string | null;
  } | null;
}) {
  return (
    <div className="tournament-stats-row">
      <div className="tournament-stats-row__main">
        {player ? (
          <UserAvatar
            userId={player.userId}
            fullName={player.fullName}
            avatarUrl={player.avatarUrl}
            avatarColor={player.avatarColor}
            size="xs"
          />
        ) : (
          <span className="tournament-stats-row__dot" aria-hidden />
        )}
        <div className="min-w-0">
          <div className="tournament-stats-row__label">{label}</div>
          {player ? (
            <div className="tournament-stats-row__name truncate">{player.fullName}</div>
          ) : subtitle ? (
            <div className="tournament-stats-row__name truncate">{subtitle}</div>
          ) : null}
        </div>
      </div>
      <div className="tournament-stats-row__value">{valueLabel}</div>
    </div>
  );
}

export function TournamentStatsCard({ stats }: TournamentStatsCardProps) {
  const hasAny =
    stats.mostWins ||
    stats.mostPoints ||
    stats.mostActive ||
    stats.fastestMatch ||
    stats.averageDuration;

  if (!hasAny) return null;

  return (
    <section
      className="tournament-stats-card card card-static"
      aria-label="Turnuva istatistikleri"
    >
      <h2 className="tournament-stats-card__title">Turnuva İstatistikleri</h2>
      <div className="tournament-stats-list">
        {stats.mostWins?.player ? (
          <StatRow
            label={stats.mostWins.label}
            valueLabel={stats.mostWins.valueLabel}
            player={stats.mostWins.player}
          />
        ) : null}
        {stats.mostPoints?.player ? (
          <StatRow
            label={stats.mostPoints.label}
            valueLabel={stats.mostPoints.valueLabel}
            player={stats.mostPoints.player}
          />
        ) : null}
        {stats.mostActive?.player ? (
          <StatRow
            label={stats.mostActive.label}
            valueLabel={stats.mostActive.valueLabel}
            player={stats.mostActive.player}
          />
        ) : null}
        {stats.fastestMatch ? (
          <StatRow
            label={stats.fastestMatch.label}
            valueLabel={stats.fastestMatch.valueLabel}
            subtitle={stats.fastestMatch.player?.fullName ?? null}
          />
        ) : null}
        {stats.averageDuration ? (
          <StatRow
            label={stats.averageDuration.label}
            valueLabel={stats.averageDuration.valueLabel}
          />
        ) : null}
      </div>
    </section>
  );
}
