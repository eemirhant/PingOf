import Link from "next/link";

import {
  isRosterFull,
  matchStatusLabel,
  resolveMatchStatus,
  type MatchFormatValue,
  type MatchStatusValue,
} from "@/domain/match-status";
import { formatTeamLabel } from "@/lib/matches/display";

type UpcomingParticipant = {
  team: number;
  user: {
    id: string;
    fullName: string;
  };
};

export type UpcomingMatchCardData = {
  id: string;
  format: string;
  status: string;
  scheduledAt: Date | null;
  team1Name?: string | null;
  team2Name?: string | null;
  participants: UpcomingParticipant[];
};

type UpcomingMatchesSectionProps = {
  currentUserId: string;
  matches: UpcomingMatchCardData[];
};

type MobileBadge = {
  label: string;
  tone: "waiting" | "confirmed" | "approaching" | "today" | "done" | "cancelled";
};

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getOpponentLabel(
  match: UpcomingMatchCardData,
  currentUserId: string,
): string {
  const me = match.participants.find((p) => p.user.id === currentUserId);
  const myTeam = me?.team === 2 ? 2 : 1;
  const oppTeam = myTeam === 1 ? 2 : 1;
  const teamName = oppTeam === 1 ? match.team1Name : match.team2Name;
  return formatTeamLabel(match.participants, oppTeam, teamName) || "Açık";
}

function getMobileBadge(
  match: UpcomingMatchCardData,
  now: Date = new Date(),
): MobileBadge {
  const status = resolveMatchStatus(
    match.status as MatchStatusValue,
    match.scheduledAt,
    now,
  );

  if (status === "CANCELLED") {
    return { label: "İptal", tone: "cancelled" };
  }
  if (status === "COMPLETED") {
    return { label: "Tamamlandı", tone: "done" };
  }
  if (match.scheduledAt && isSameLocalDay(match.scheduledAt, now)) {
    return { label: "Bugün", tone: "today" };
  }
  if (status === "PENDING") {
    return { label: "Yaklaşıyor", tone: "approaching" };
  }

  const rosterFull = isRosterFull(
    match.format as MatchFormatValue,
    match.participants.length,
  );
  if (rosterFull) {
    return { label: "Onaylandı", tone: "confirmed" };
  }
  return { label: "Bekleniyor", tone: "waiting" };
}

function formatMatchDate(scheduledAt: Date | null): string {
  if (!scheduledAt) return "Tarih yok";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
  }).format(scheduledAt);
}

function formatMatchTime(scheduledAt: Date | null): string {
  if (!scheduledAt) return "Saat yok";
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(scheduledAt);
}

function DesktopUpcomingList({
  matches,
}: {
  matches: UpcomingMatchCardData[];
}) {
  return (
    <div className="hidden space-y-2 sm:block">
      {matches.map((match) => {
        const status = resolveMatchStatus(
          match.status as MatchStatusValue,
          match.scheduledAt,
        );
        const team1 =
          formatTeamLabel(match.participants, 1, match.team1Name) || "Açık";
        const team2 =
          formatTeamLabel(match.participants, 2, match.team2Name) || "Açık";

        return (
          <Link
            key={match.id}
            href={`/matches/${match.id}`}
            className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-border px-3 py-3 hover:bg-white/[0.03]"
          >
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap gap-2">
                <span className="badge badge-planned">{matchStatusLabel(status)}</span>
                <span
                  className={`badge ${match.format === "SINGLES" ? "badge-1v1" : "badge-2v2"}`}
                >
                  {match.format === "SINGLES" ? "1v1" : "2v2"}
                </span>
              </div>
              <div className="truncate text-sm font-semibold">
                {team1} <span className="text-text-muted font-normal">vs</span> {team2}
              </div>
            </div>
            <div className="text-text-muted shrink-0 text-xs">
              {match.scheduledAt
                ? new Intl.DateTimeFormat("tr-TR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(match.scheduledAt)
                : "Saat belirtilmedi"}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function MobileUpcomingCards({
  currentUserId,
  matches,
}: {
  currentUserId: string;
  matches: UpcomingMatchCardData[];
}) {
  return (
    <div className="upcoming-mobile-list sm:hidden">
      {matches.map((match) => {
        const opponent = getOpponentLabel(match, currentUserId);
        const badge = getMobileBadge(match);

        return (
          <Link
            key={match.id}
            href={`/matches/${match.id}`}
            className="upcoming-mobile-card"
            aria-label={`${opponent} maçını görüntüle`}
          >
            <div className="upcoming-mobile-card-top">
              <h3 className="upcoming-mobile-opponent">{opponent}</h3>
              <span className={`upcoming-mobile-badge upcoming-mobile-badge--${badge.tone}`}>
                {badge.label}
              </span>
            </div>

            <div className="upcoming-mobile-meta">
              <span className="upcoming-mobile-meta-item">
                <span aria-hidden>📅</span>
                <span>{formatMatchDate(match.scheduledAt)}</span>
              </span>
              <span className="upcoming-mobile-meta-item">
                <span aria-hidden>🕒</span>
                <span>{formatMatchTime(match.scheduledAt)}</span>
              </span>
            </div>

            <div className="upcoming-mobile-location">
              <span aria-hidden>📍</span>
              <span>Konum belirtilmedi</span>
            </div>

            <span className="upcoming-mobile-cta">Maçı Görüntüle</span>
          </Link>
        );
      })}
    </div>
  );
}

export function UpcomingMatchesSection({
  currentUserId,
  matches,
}: UpcomingMatchesSectionProps) {
  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
          Yaklaşan Maçlarım
        </h2>
        <Link
          href="/matches?time=UPCOMING"
          className="text-accent-light text-sm font-semibold"
        >
          Tümü →
        </Link>
      </div>

      {matches.length === 0 ? (
        <>
          <div className="upcoming-mobile-empty sm:hidden">
            <div className="upcoming-mobile-empty-icon" aria-hidden>
              🏓
            </div>
            <p className="upcoming-mobile-empty-title">
              Henüz yaklaşan maçın bulunmuyor.
            </p>
            <p className="upcoming-mobile-empty-desc">
              Yeni bir maç planlayarak başlayabilirsin.
            </p>
          </div>
          <div className="card hidden text-center sm:block">
            <p className="text-text-secondary text-sm">
              Yaklaşan maçın yok. İleri tarihli bir maç planlayabilirsin.
            </p>
            <Link href="/matches/new?type=planned" className="btn btn-secondary btn-sm mt-3">
              Maç Planla
            </Link>
          </div>
        </>
      ) : (
        <>
          <MobileUpcomingCards currentUserId={currentUserId} matches={matches} />
          <DesktopUpcomingList matches={matches} />
        </>
      )}
    </div>
  );
}
