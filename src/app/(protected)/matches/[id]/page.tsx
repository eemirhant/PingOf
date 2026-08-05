import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { CancelMatchButton } from "@/components/matches/cancel-match-button";
import { DeleteMatchButton } from "@/components/matches/delete-match-button";
import { JoinMatchButton } from "@/components/matches/join-match-button";
import {
  StakeNoteBadge,
  StakeSettleControls,
} from "@/components/matches/stake-controls";
import {
  canCancelMatch,
  canEnterResult,
  canJoinOpenSlot,
  isRosterFull,
  isWaitingForMatchTime,
  matchStatusLabel,
  playersPerTeam,
  resolveMatchStatus,
  type MatchStatusValue,
} from "@/domain/match-status";
import { canMarkStakeSettled } from "@/domain/stake";
import { formatTeamLabel, formatWinnerLabel, wasMatchEdited } from "@/lib/matches/display";
import { canManageMatch, getMatchForOrganization } from "@/lib/matches/service";
import { UserAvatar } from "@/components/ui/user-avatar";

function statusBadgeClass(status: MatchStatusValue): string {
  switch (status) {
    case "COMPLETED":
      return "badge-win";
    case "PLANNED":
      return "badge-planned";
    case "PENDING":
      return "badge-1v1";
    default:
      return "";
  }
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const match = await getMatchForOrganization(session.user.organizationId, id);

  if (!match) notFound();

  const status = resolveMatchStatus(
    match.status as MatchStatusValue,
    match.scheduledAt,
  );
  const isCompleted = status === "COMPLETED";
  const isDoubles = match.format === "DOUBLES";
  const team1 = match.participants.filter((p) => p.team === 1);
  const team2 = match.participants.filter((p) => p.team === 2);
  const team1Heading =
    formatTeamLabel(match.participants, 1, match.team1Name) || "Açık";
  const team2Heading =
    formatTeamLabel(match.participants, 2, match.team2Name) || "Açık";
  const winnerLabel = isCompleted
    ? formatWinnerLabel(match.participants, match.winnerTeam, {
        team1Name: match.team1Name,
        team2Name: match.team2Name,
      })
    : null;
  const canManage = canManageMatch(
    { id: session.user.id, role: session.user.role },
    match,
  );
  const edited =
    isCompleted && match.createdAt
      ? wasMatchEdited(match.createdAt, match.updatedAt)
      : false;
  const isParticipant = match.participants.some((p) => p.user.id === session.user.id);
  const canSettleStake =
    Boolean(match.stakeNote) &&
    canMarkStakeSettled({
      matchStatus: status,
      stakeNote: match.stakeNote,
      stakeSettled: match.stakeSettled,
      winnerTeam: match.winnerTeam,
      actorUserId: session.user.id,
      participants: match.participants.map((p) => ({
        userId: p.user.id,
        team: p.team,
      })),
    });
  const canJoin = canJoinOpenSlot(
    status,
    match.format,
    match.participants.length,
    isParticipant,
  );
  const canResult =
    isParticipant && canEnterResult(status, match.format, match.participants.length);
  const waitingForTime =
    isParticipant &&
    isWaitingForMatchTime(status, match.format, match.participants.length);
  const showCancel = canManage && canCancelMatch(status);
  const perTeam = playersPerTeam(match.format);
  const scheduledLabel = match.scheduledAt
    ? new Intl.DateTimeFormat("tr-TR", {
        dateStyle: "full",
        timeStyle: "short",
      }).format(match.scheduledAt)
    : null;

  return (
    <div className="mx-auto max-w-[680px] px-6 py-8">
      <Link href="/matches" className="text-text-muted hover:text-text-secondary text-sm">
        ← Maçlar
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-text-primary">Maç Detayı</h1>
          <span className={`badge ${match.format === "SINGLES" ? "badge-1v1" : "badge-2v2"}`}>
            {match.format === "SINGLES" ? "1v1" : "2v2"}
          </span>
          <span className={`badge ${statusBadgeClass(status)}`}>
            {matchStatusLabel(status)}
          </span>
          {!isRosterFull(match.format, match.participants.length) &&
          (status === "PLANNED" || status === "PENDING") ? (
            <span className="badge">Açık maç</span>
          ) : null}
          <StakeNoteBadge
            stakeNote={match.stakeNote}
            stakeSettled={match.stakeSettled}
            completed={isCompleted}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canResult ? (
            <Link href={`/matches/${match.id}/result`} className="btn btn-primary btn-sm">
              Sonuç Gir
            </Link>
          ) : null}
          {isCompleted && canManage ? (
            <>
              <Link href={`/matches/${match.id}/edit`} className="btn btn-secondary btn-sm">
                Düzenle
              </Link>
              <DeleteMatchButton matchId={match.id} />
            </>
          ) : null}
          {showCancel ? <CancelMatchButton matchId={match.id} /> : null}
        </div>
      </div>

      {waitingForTime && scheduledLabel ? (
        <div className="card mt-4 border border-yellow/30 bg-yellow/5">
          <p className="text-sm font-semibold text-text-primary">
            Maç saati henüz gelmedi
          </p>
          <p className="text-text-secondary mt-1 text-sm">
            Sonuç girmek ve maçı tamamlamak için{" "}
            <span className="font-medium text-text-primary">{scheduledLabel}</span>{" "}
            saatini beklemen gerekiyor. Saat gelince durum otomatik olarak
            &quot;Oynanmayı bekliyor&quot; olur.
          </p>
        </div>
      ) : null}

      {match.stakeNote && isCompleted && isParticipant ? (
        <StakeSettleControls
          matchId={match.id}
          stakeNote={match.stakeNote}
          stakeSettled={match.stakeSettled}
          canSettle={canSettleStake}
        />
      ) : match.stakeNote ? (
        <div className="card mt-4 border border-orange/25">
          <div className="text-text-muted text-xs font-bold uppercase tracking-wider">
            İddia
          </div>
          <p className="mt-1 text-sm font-semibold text-text-primary">
            {match.stakeNote}
          </p>
          {isCompleted ? (
            <p className="text-text-secondary mt-1 text-xs">
              Durum: {match.stakeSettled ? "Ödendi" : "Ödenmedi"}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="card mt-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 text-center">
          <div className="min-w-0">
            {isDoubles ? (
              <h2
                className={`mb-3 text-xl font-bold uppercase leading-snug break-words sm:text-2xl ${
                  isCompleted && match.winnerTeam === 1
                    ? "text-yellow"
                    : "text-text-primary"
                }`}
              >
                {team1Heading}
              </h2>
            ) : (
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-accent-light">
                Takım 1
              </div>
            )}
            {team1.map((p) => {
              const isWinner = isCompleted && match.winnerTeam === 1;
              return (
                <div key={p.id} className="mb-2 flex flex-col items-center gap-1">
                  <div className="relative">
                    <UserAvatar
                      userId={p.user.id}
                      fullName={p.user.fullName}
                      avatarUrl={p.user.avatarUrl}
                      size="lg"
                      style={{
                        boxShadow: isWinner ? "0 0 0 2px rgba(234,179,8,0.7)" : undefined,
                      }}
                    />
                    {isWinner ? (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-base">
                        👑
                      </span>
                    ) : null}
                  </div>
                  <div className={`text-sm font-semibold ${isWinner ? "text-yellow" : ""}`}>
                    {p.user.fullName}
                  </div>
                </div>
              );
            })}
            {Array.from({ length: Math.max(0, perTeam - team1.length) }).map((_, i) => (
              <div
                key={`open-1-${i}`}
                className="mb-2 flex flex-col items-center gap-2 rounded-md border border-dashed border-border px-2 py-3"
              >
                <div className="text-text-muted text-sm">Açık slot</div>
                {canJoin ? (
                  <JoinMatchButton matchId={match.id} team={1} label="Bu tarafa katıl" />
                ) : null}
              </div>
            ))}
          </div>

          <div className="pt-6">
            {isCompleted ? (
              <>
                <div className="match-score">
                  {match.team1SetsWon}-{match.team2SetsWon}
                </div>
                {winnerLabel ? (
                  <div className="mt-1 text-xs font-semibold text-green">{winnerLabel}</div>
                ) : null}
              </>
            ) : (
              <div className="text-text-muted text-sm font-bold">VS</div>
            )}
          </div>

          <div className="min-w-0">
            {isDoubles ? (
              <h2
                className={`mb-3 text-xl font-bold uppercase leading-snug break-words sm:text-2xl ${
                  isCompleted && match.winnerTeam === 2
                    ? "text-yellow"
                    : "text-text-primary"
                }`}
              >
                {team2Heading}
              </h2>
            ) : (
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-orange-light">
                Takım 2
              </div>
            )}
            {team2.map((p) => {
              const isWinner = isCompleted && match.winnerTeam === 2;
              return (
                <div key={p.id} className="mb-2 flex flex-col items-center gap-1">
                  <div className="relative">
                    <UserAvatar
                      userId={p.user.id}
                      fullName={p.user.fullName}
                      avatarUrl={p.user.avatarUrl}
                      size="lg"
                      style={{
                        boxShadow: isWinner ? "0 0 0 2px rgba(234,179,8,0.7)" : undefined,
                      }}
                    />
                    {isWinner ? (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-base">
                        👑
                      </span>
                    ) : null}
                  </div>
                  <div className={`text-sm font-semibold ${isWinner ? "text-yellow" : ""}`}>
                    {p.user.fullName}
                  </div>
                </div>
              );
            })}
            {Array.from({ length: Math.max(0, perTeam - team2.length) }).map((_, i) => (
              <div
                key={`open-2-${i}`}
                className="mb-2 flex flex-col items-center gap-2 rounded-md border border-dashed border-border px-2 py-3"
              >
                <div className="text-text-muted text-sm">Açık slot</div>
                {canJoin ? (
                  <JoinMatchButton matchId={match.id} team={2} label="Bu tarafa katıl" />
                ) : null}
              </div>
            ))}
          </div>
        </div>

      </div>

      {isCompleted && match.sets.length > 0 ? (
        <div className="card mt-4">
          <div className="card-title">Set Skorları</div>
          <div className="space-y-2">
            {match.sets.map((set) => {
              const w1 = set.team1Score > set.team2Score;
              return (
                <div
                  key={set.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <span className="text-text-muted text-xs font-bold uppercase">
                    Set {set.setNumber}
                  </span>
                  <span className="font-mono font-bold">
                    <span className={w1 ? "text-green" : ""}>{set.team1Score}</span>
                    {" – "}
                    <span className={!w1 ? "text-green" : ""}>{set.team2Score}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="text-text-muted mt-4 space-y-1 text-sm">
        {match.scheduledAt ? (
          <p>
            Planlanan:{" "}
            {new Intl.DateTimeFormat("tr-TR", {
              dateStyle: "full",
              timeStyle: "short",
            }).format(match.scheduledAt)}
          </p>
        ) : status === "PLANNED" || status === "PENDING" ? (
          <p>Planlanan: Saat belirtilmedi</p>
        ) : null}
        {match.playedAt && isCompleted ? (
          <p>
            Oynanma:{" "}
            {new Intl.DateTimeFormat("tr-TR", {
              dateStyle: "full",
              timeStyle: "short",
            }).format(match.playedAt)}
          </p>
        ) : null}
        <p>Kaydeden: {match.createdBy.fullName}</p>
        {edited && match.resultEnteredBy ? (
          <p>
            Düzenlendi: {match.resultEnteredBy.fullName},{" "}
            {new Intl.DateTimeFormat("tr-TR", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(match.updatedAt)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
