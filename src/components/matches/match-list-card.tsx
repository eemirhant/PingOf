import Link from "next/link";

import { UserAvatar } from "@/components/ui/user-avatar";
import {
  canEnterResult,
  isRosterFull,
  isWaitingForMatchTime,
  matchStatusLabel,
  type MatchStatusValue,
} from "@/domain/match-status";
import { formatTeamLabel, formatWinnerLabel } from "@/lib/matches/display";

type MatchListCardParticipant = {
  id: string;
  team: number;
  user: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
};

export type MatchListCardMatch = {
  id: string;
  format: "SINGLES" | "DOUBLES";
  status: string;
  scheduledAt: Date | null;
  playedAt: Date | null;
  winnerTeam: number | null;
  team1SetsWon: number | null;
  team2SetsWon: number | null;
  team1Name: string | null;
  team2Name: string | null;
  stakeNote: string | null;
  stakeSettled: boolean;
  tournamentName?: string | null;
  participants: MatchListCardParticipant[];
};

type MatchListCardProps = {
  match: MatchListCardMatch;
  resolvedStatus: MatchStatusValue;
  currentUserId: string;
};

function statusBadgeClass(status: MatchStatusValue): string {
  switch (status) {
    case "COMPLETED":
      return "badge-win";
    case "PLANNED":
      return "badge-planned";
    case "PENDING":
      return "badge-1v1";
    case "CANCELLED":
      return "match-list-card__badge-muted";
    default:
      return "";
  }
}

function formatMatchDate(match: MatchListCardMatch): string {
  const date = match.scheduledAt ?? match.playedAt;
  if (!date) return "Saat belirtilmedi";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function stakeMeta(match: MatchListCardMatch, completed: boolean): {
  label: string;
  tone: "settled" | "open" | "none";
} {
  if (!match.stakeNote) {
    return { label: "İddia Yok", tone: "none" };
  }
  if (completed && match.stakeSettled) {
    return { label: "Ödendi", tone: "settled" };
  }
  return { label: "Ödenmedi", tone: "open" };
}

export function MatchListCard({
  match,
  resolvedStatus,
  currentUserId,
}: MatchListCardProps) {
  const team1Label =
    formatTeamLabel(match.participants, 1, match.team1Name) || "Açık";
  const team2Label =
    formatTeamLabel(match.participants, 2, match.team2Name) || "Açık";
  const isCompleted = resolvedStatus === "COMPLETED";
  const winnerLabel = isCompleted
    ? formatWinnerLabel(match.participants, match.winnerTeam, {
        team1Name: match.team1Name,
        team2Name: match.team2Name,
      })
    : null;
  const team1Won = match.winnerTeam === 1;
  const team2Won = match.winnerTeam === 2;
  const isParticipant = match.participants.some((p) => p.user.id === currentUserId);
  const showEnter =
    isParticipant &&
    canEnterResult(resolvedStatus, match.format, match.participants.length);
  const waiting =
    isParticipant &&
    isWaitingForMatchTime(resolvedStatus, match.format, match.participants.length);
  const isOpenSlot =
    !isRosterFull(match.format, match.participants.length) &&
    (resolvedStatus === "PLANNED" || resolvedStatus === "PENDING");
  const stake = stakeMeta(match, isCompleted);
  const dateLabel = formatMatchDate(match);

  return (
    <Link href={`/matches/${match.id}`} className="match-list-card">
      <div className="match-list-card__format">
        <span
          className={`badge match-list-card__badge ${match.format === "SINGLES" ? "badge-1v1" : "badge-2v2"}`}
        >
          {match.format === "SINGLES" ? "1v1" : "2v2"}
        </span>
        {match.tournamentName ? (
          <span
            className="badge match-list-card__badge match-list-card__tournament"
            title={match.tournamentName}
          >
            🏆 {match.tournamentName}
          </span>
        ) : null}
        {isOpenSlot ? (
          <span className="badge match-list-card__badge match-list-card__badge-muted">
            Açık
          </span>
        ) : null}
      </div>

      <div className="match-list-card__teams">
        <div
          className={`match-list-card__team ${team1Won && isCompleted ? "match-list-card__team--won" : ""}`}
        >
          {team1Label}
        </div>
        <div className="match-list-card__vs">vs</div>
        <div
          className={`match-list-card__team ${team2Won && isCompleted ? "match-list-card__team--won" : ""}`}
        >
          {team2Label}
        </div>
      </div>

      <div className="match-list-card__score-slot">
        {isCompleted ? (
          <div className="match-list-card__score" aria-label="Skor">
            <span className={team1Won ? "text-green" : ""}>{match.team1SetsWon ?? 0}</span>
            <span className="match-list-card__score-sep">-</span>
            <span className={team2Won ? "text-green" : ""}>{match.team2SetsWon ?? 0}</span>
          </div>
        ) : showEnter ? (
          <span className="btn btn-primary btn-sm match-list-card__action">Sonuç Gir</span>
        ) : waiting ? (
          <span className="match-list-card__waiting">Saat bekleniyor</span>
        ) : (
          <span className="match-list-card__score-placeholder" aria-hidden="true">
            –
          </span>
        )}
      </div>

      <div className="match-list-card__avatars-block">
        <div className="match-list-card__meta-label match-list-card__meta-label--desktop">
          👥 Oyuncular
        </div>
        <div className="match-list-card__avatars">
          {match.participants.slice(0, 4).map((p) => (
            <UserAvatar
              key={p.id}
              userId={p.user.id}
              fullName={p.user.fullName}
              avatarUrl={p.user.avatarUrl}
              size="xs"
              className="match-list-card__avatar border border-bg-900"
            />
          ))}
          {match.participants.length === 0 ? (
            <span className="match-list-card__meta-value">—</span>
          ) : null}
        </div>
      </div>

      {/*
        Desktop: display:contents → children join parent grid.
        Mobile: flex column on the right side of the card.
      */}
      <div className="match-list-card__aside">
        <div className="match-list-card__status">
          <span className={`badge match-list-card__badge ${statusBadgeClass(resolvedStatus)}`}>
            {matchStatusLabel(resolvedStatus)}
          </span>
        </div>

        <div className="match-list-card__winner">
          {winnerLabel ? (
            <span className="badge badge-win match-list-card__badge">👑 {winnerLabel}</span>
          ) : (
            <span className="match-list-card__winner-placeholder" aria-hidden="true" />
          )}
        </div>

        <div className="match-list-card__date">
          <div className="match-list-card__meta-label match-list-card__meta-label--desktop">
            📅 Tarih
          </div>
          <div className="match-list-card__meta-value">
            <span className="match-list-card__meta-prefix" aria-hidden="true">
              📅{" "}
            </span>
            {dateLabel}
          </div>
        </div>

        <div className="match-list-card__stake-wrap">
          <div className="match-list-card__meta-label match-list-card__meta-label--desktop">
            🎯 İddia
          </div>
          <span
            className={`badge match-list-card__badge match-list-card__stake match-list-card__stake--${stake.tone}`}
          >
            {stake.tone === "settled" ? "🟢" : stake.tone === "open" ? "🟠" : "⚪"}{" "}
            {stake.label}
          </span>
        </div>
      </div>
    </Link>
  );
}
