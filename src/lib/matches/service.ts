import { MatchFormat, MatchStatus, TournamentStatus, UserRole, type Prisma } from "@prisma/client";

import { determineMatchWinner } from "@/domain/match-scoring";
import {
  canCancelMatch,
  canEnterResult,
  canJoinOpenSlot,
  nextOpenTeam,
  resolveMatchStatus,
  type MatchStatusValue,
} from "@/domain/match-status";
import {
  getMatchTimeRange,
  type MatchListTimeFilter,
} from "@/domain/match-time-filter";
import { NotificationType } from "@/domain/notification";
import { RealtimeEventType } from "@/domain/realtime";
import { stakeSettleDenialReason } from "@/domain/stake";
import { prisma } from "@/lib/db";
import { formatMatchDefeatNotificationBody } from "@/lib/matches/display";
import { createNotificationsForUsers } from "@/lib/notifications/create";
import {
  notifyLeaderboardAfterMatch,
  snapshotPlayerRanks,
} from "@/lib/notifications/leaderboard-notify";
import { pushDebug } from "@/lib/notifications/push-debug";
import { withOrgScope } from "@/lib/org-scope";
import { publishOrgEvent } from "@/lib/realtime/publish";
import type {
  InstantMatchInput,
  PlannedMatchInput,
  PlannedMatchResultInput,
} from "@/lib/validations/matches";

export class MatchError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = "MatchError";
  }
}

export type MatchActor = {
  id: string;
  role: UserRole;
};

export type OrgPlayerOption = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
};

/** KK-8: creator or organization OWNER may edit/delete/cancel. */
export function canManageMatch(
  actor: MatchActor,
  match: { createdById: string },
): boolean {
  return actor.id === match.createdById || actor.role === UserRole.OWNER;
}

export function assertCanManageMatch(
  actor: MatchActor,
  match: { createdById: string },
): void {
  if (!canManageMatch(actor, match)) {
    throw new MatchError("Bu maçı düzenleme yetkin yok", "permission", 403);
  }
}

export async function getOrganizationPlayers(
  organizationId: string,
): Promise<OrgPlayerOption[]> {
  return prisma.user.findMany({
    where: withOrgScope(organizationId),
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
    },
  });
}

async function assertPlayersInOrganization(
  organizationId: string,
  playerIds: string[],
) {
  if (playerIds.length === 0) return;

  const players = await prisma.user.findMany({
    where: {
      organizationId,
      id: { in: playerIds },
    },
    select: { id: true },
  });

  if (players.length !== playerIds.length) {
    throw new MatchError(
      "Seçilen oyunculardan bazıları bu organizasyonda değil",
      "participants",
    );
  }
}

function assertCompleteMatchResult(input: { sets: InstantMatchInput["sets"] }) {
  const winnerResult = determineMatchWinner(input.sets);

  if (!winnerResult.ok) {
    throw new MatchError(winnerResult.error, "sets");
  }

  if (!winnerResult.complete) {
    throw new MatchError(
      "Maç tamamlanmadan kaydedilemez. Bir taraf 3 set kazanmalıdır (3-0, 3-1 veya 3-2).",
      "sets",
    );
  }

  return winnerResult;
}

export async function syncPlannedMatchesToPending(organizationId: string) {
  const now = new Date();
  await prisma.match.updateMany({
    where: withOrgScope(organizationId, {
      status: MatchStatus.PLANNED,
      OR: [{ scheduledAt: { lte: now } }, { scheduledAt: null }],
    }),
    data: { status: MatchStatus.PENDING },
  });
}

export async function createInstantMatch(
  organizationId: string,
  actorUserId: string,
  input: InstantMatchInput,
) {
  const allPlayerIds = [...input.team1PlayerIds, ...input.team2PlayerIds];

  if (!allPlayerIds.includes(actorUserId)) {
    throw new MatchError(
      "Maçı kaydetmek için maçın taraflarından biri olmalısın",
      "participants",
    );
  }

  await assertPlayersInOrganization(organizationId, allPlayerIds);
  const winnerResult = assertCompleteMatchResult(input);

  const format = input.format === "SINGLES" ? MatchFormat.SINGLES : MatchFormat.DOUBLES;
  const now = new Date();
  const previousRanks = await snapshotPlayerRanks(organizationId, allPlayerIds);

  const match = await prisma.$transaction(async (tx) => {
    return tx.match.create({
      data: {
        organizationId,
        format,
        status: MatchStatus.COMPLETED,
        playedAt: now,
        createdById: actorUserId,
        resultEnteredById: actorUserId,
        stakeNote: input.stakeNote ?? null,
        team1Name: input.team1Name ?? null,
        team2Name: input.team2Name ?? null,
        team1SetsWon: winnerResult.team1SetsWon,
        team2SetsWon: winnerResult.team2SetsWon,
        winnerTeam: winnerResult.winnerTeam,
        participants: {
          create: [
            ...input.team1PlayerIds.map((userId) => ({ userId, team: 1 })),
            ...input.team2PlayerIds.map((userId) => ({ userId, team: 2 })),
          ],
        },
        sets: {
          create: winnerResult.sets.map((set, index) => ({
            setNumber: index + 1,
            team1Score: set.team1Score,
            team2Score: set.team2Score,
          })),
        },
      },
      select: { id: true },
    });
  });

  const orgMembers = await prisma.user.findMany({
    where: withOrgScope(organizationId),
    select: { id: true, fullName: true },
  });

  const nameById = new Map(orgMembers.map((m) => [m.id, m.fullName]));
  const participantsForLabel = [
    ...input.team1PlayerIds.map((userId) => ({
      team: 1,
      user: { fullName: nameById.get(userId) ?? "Oyuncu" },
    })),
    ...input.team2PlayerIds.map((userId) => ({
      team: 2,
      user: { fullName: nameById.get(userId) ?? "Oyuncu" },
    })),
  ];

  await createNotificationsForUsers({
    userIds: orgMembers.map((m) => m.id),
    type: NotificationType.MATCH_CREATED,
    title: "Yeni maç kaydedildi",
    body: formatMatchDefeatNotificationBody({
      participants: participantsForLabel,
      winnerTeam: winnerResult.winnerTeam,
      team1SetsWon: winnerResult.team1SetsWon,
      team2SetsWon: winnerResult.team2SetsWon,
      teamNames: {
        team1Name: input.team1Name,
        team2Name: input.team2Name,
      },
      format: input.format,
    }),
    linkUrl: `/matches/${match.id}`,
  });

  if (input.stakeNote?.trim()) {
    await createNotificationsForUsers({
      userIds: allPlayerIds,
      type: NotificationType.STAKE_CREATED,
      title: "İddia eklendi",
      body: `Bu maça iddia eklendi: ${input.stakeNote.trim()}`,
      linkUrl: `/matches/${match.id}`,
    });
  }

  await notifyLeaderboardAfterMatch(organizationId, allPlayerIds, previousRanks);

  await publishOrgEvent(organizationId, RealtimeEventType.MATCH_UPSERTED, {
    entityId: match.id,
    actorUserId: actorUserId,
  });
  await publishOrgEvent(organizationId, RealtimeEventType.MATCH_RESULT, {
    entityId: match.id,
    actorUserId: actorUserId,
  });
  await publishOrgEvent(organizationId, RealtimeEventType.LEADERBOARD_DIRTY, {
    entityId: match.id,
  });

  return match;
}

export async function createPlannedMatch(
  organizationId: string,
  actorUserId: string,
  input: PlannedMatchInput,
) {
  const allPlayerIds = [...input.team1PlayerIds, ...input.team2PlayerIds];
  await assertPlayersInOrganization(organizationId, allPlayerIds);

  const format = input.format === "SINGLES" ? MatchFormat.SINGLES : MatchFormat.DOUBLES;

  const match = await prisma.match.create({
    data: {
      organizationId,
      format,
      status: MatchStatus.PLANNED,
      scheduledAt: input.scheduledAt,
      createdById: actorUserId,
      stakeNote: input.stakeNote ?? null,
      team1Name: input.team1Name ?? null,
      team2Name: input.team2Name ?? null,
      participants: {
        create: [
          ...input.team1PlayerIds.map((userId) => ({ userId, team: 1 })),
          ...input.team2PlayerIds.map((userId) => ({ userId, team: 2 })),
        ],
      },
    },
    select: { id: true },
  });

  const orgMembers = await prisma.user.findMany({
    where: withOrgScope(organizationId),
    select: { id: true },
  });

  await createNotificationsForUsers({
    userIds: orgMembers.map((m) => m.id),
    type: NotificationType.MATCH_CREATED,
    title: "Yeni maç planlandı",
    body: "Organizasyonunda ileri tarihli bir maç planlandı.",
    linkUrl: `/matches/${match.id}`,
  });

  if (input.stakeNote?.trim()) {
    const stakeRecipients = allPlayerIds.length
      ? allPlayerIds
      : [actorUserId];
    await createNotificationsForUsers({
      userIds: stakeRecipients,
      type: NotificationType.STAKE_CREATED,
      title: "İddia eklendi",
      body: `Planlanan maça iddia eklendi: ${input.stakeNote.trim()}`,
      linkUrl: `/matches/${match.id}`,
    });
  }

  await publishOrgEvent(organizationId, RealtimeEventType.MATCH_UPSERTED, {
    entityId: match.id,
    actorUserId: actorUserId,
  });

  return match;
}

export async function joinPlannedMatch(
  organizationId: string,
  actorUserId: string,
  matchId: string,
  preferredTeam?: 1 | 2,
) {
  await syncPlannedMatchesToPending(organizationId);

  const match = await prisma.match.findFirst({
    where: withOrgScope(organizationId, { id: matchId }),
    include: {
      participants: { select: { userId: true, team: true } },
    },
  });

  if (!match) {
    throw new MatchError("Maç bulunamadı", "match", 404);
  }

  const status = resolveMatchStatus(
    match.status as MatchStatusValue,
    match.scheduledAt,
  );

  const already = match.participants.some((p) => p.userId === actorUserId);
  if (
    !canJoinOpenSlot(status, match.format, match.participants.length, already)
  ) {
    throw new MatchError(
      already
        ? "Bu maça zaten katıldın"
        : "Bu maça katılınamaz (dolu veya uygun değil)",
      "join",
    );
  }

  const team1Count = match.participants.filter((p) => p.team === 1).length;
  const team2Count = match.participants.filter((p) => p.team === 2).length;

  let team: 1 | 2 | null = null;
  if (preferredTeam === 1 || preferredTeam === 2) {
    const perTeam = match.format === "SINGLES" ? 1 : 2;
    const count = preferredTeam === 1 ? team1Count : team2Count;
    if (count < perTeam) team = preferredTeam;
  }
  if (!team) {
    team = nextOpenTeam(match.format, team1Count, team2Count);
  }
  if (!team) {
    throw new MatchError("Açık slot kalmadı", "join");
  }

  await prisma.matchParticipant.create({
    data: { matchId, userId: actorUserId, team },
  });

  return { id: matchId, team };
}

export async function cancelMatch(
  organizationId: string,
  actor: MatchActor,
  matchId: string,
) {
  await syncPlannedMatchesToPending(organizationId);

  const match = await prisma.match.findFirst({
    where: withOrgScope(organizationId, { id: matchId }),
    include: {
      participants: { select: { userId: true } },
    },
  });

  if (!match) {
    throw new MatchError("Maç bulunamadı", "match", 404);
  }

  assertCanManageMatch(actor, match);

  const status = resolveMatchStatus(
    match.status as MatchStatusValue,
    match.scheduledAt,
  );

  if (!canCancelMatch(status)) {
    throw new MatchError("Bu maç iptal edilemez", "status");
  }

  await prisma.match.update({
    where: { id: matchId },
    data: { status: MatchStatus.CANCELLED },
  });

  const notifyIds = [
    ...new Set([...match.participants.map((p) => p.userId), match.createdById]),
  ].filter((id) => id !== actor.id);

  await createNotificationsForUsers({
    userIds: notifyIds,
    type: NotificationType.MATCH_CANCELLED,
    title: "Maç iptal edildi",
    body: "Planlanan bir maç iptal edildi.",
    linkUrl: `/matches/${matchId}`,
  });

  await publishOrgEvent(organizationId, RealtimeEventType.MATCH_UPSERTED, {
    entityId: matchId,
    actorUserId: actor.id,
  });

  return { id: matchId };
}

export async function enterPlannedMatchResult(
  organizationId: string,
  actorUserId: string,
  matchId: string,
  input: PlannedMatchResultInput,
) {
  await syncPlannedMatchesToPending(organizationId);

  const match = await prisma.match.findFirst({
    where: withOrgScope(organizationId, { id: matchId }),
    include: {
      participants: {
        select: {
          userId: true,
          team: true,
          user: { select: { fullName: true } },
        },
      },
    },
  });

  if (!match) {
    throw new MatchError("Maç bulunamadı", "match", 404);
  }

  const status = resolveMatchStatus(
    match.status as MatchStatusValue,
    match.scheduledAt,
  );

  if (!canEnterResult(status, match.format, match.participants.length)) {
    if (status === "PLANNED") {
      throw new MatchError(
        "Maç saati gelmeden sonuç girilemez. Saat gelince maç 'Oynanmayı bekliyor' olur.",
        "scheduledAt",
      );
    }
    throw new MatchError(
      "Sonuç girmek için maç oynanmayı bekliyor olmalı ve kadro dolu olmalı",
      "status",
    );
  }

  if (!match.participants.some((p) => p.userId === actorUserId)) {
    throw new MatchError(
      "Sonucu girmek için maçın taraflarından biri olmalısın",
      "permission",
      403,
    );
  }

  const winnerResult = assertCompleteMatchResult(input);
  const participantIds = match.participants.map((p) => p.userId);
  const previousRanks = await snapshotPlayerRanks(organizationId, participantIds);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.matchSet.deleteMany({ where: { matchId } });
    await tx.match.update({
      where: { id: matchId },
      data: {
        status: MatchStatus.COMPLETED,
        playedAt: match.scheduledAt ?? now,
        resultEnteredById: actorUserId,
        team1SetsWon: winnerResult.team1SetsWon,
        team2SetsWon: winnerResult.team2SetsWon,
        winnerTeam: winnerResult.winnerTeam,
        sets: {
          create: winnerResult.sets.map((set, index) => ({
            setNumber: index + 1,
            team1Score: set.team1Score,
            team2Score: set.team2Score,
          })),
        },
      },
    });
  });

  const others = match.participants
    .map((p) => p.userId)
    .filter((id) => id !== actorUserId);

  const formatValue = match.format === MatchFormat.SINGLES ? "SINGLES" : "DOUBLES";

  pushDebug("Maç sonucu girildi — bildirim akışı başlıyor", {
    event: "MATCH_RESULT",
    matchId,
    actorUserId,
    targetUserIds: others,
    targetExternalIds: others,
  });

  await createNotificationsForUsers({
    userIds: others,
    type: NotificationType.MATCH_RESULT,
    title: "Maç sonucu girildi",
    body: formatMatchDefeatNotificationBody({
      participants: match.participants.map((p) => ({
        team: p.team,
        user: { fullName: p.user.fullName },
      })),
      winnerTeam: winnerResult.winnerTeam,
      team1SetsWon: winnerResult.team1SetsWon,
      team2SetsWon: winnerResult.team2SetsWon,
      teamNames: {
        team1Name: match.team1Name,
        team2Name: match.team2Name,
      },
      format: formatValue,
    }),
    linkUrl: `/matches/${matchId}`,
  });

  await notifyLeaderboardAfterMatch(organizationId, participantIds, previousRanks);

  if (match.tournamentId) {
    const { processTournamentMatchResult } = await import(
      "@/lib/tournaments/service"
    );
    await processTournamentMatchResult(organizationId, matchId);
  }

  await publishOrgEvent(organizationId, RealtimeEventType.MATCH_RESULT, {
    entityId: matchId,
    actorUserId: actorUserId,
  });
  await publishOrgEvent(organizationId, RealtimeEventType.MATCH_UPSERTED, {
    entityId: matchId,
    actorUserId: actorUserId,
  });
  await publishOrgEvent(organizationId, RealtimeEventType.LEADERBOARD_DIRTY, {
    entityId: matchId,
  });
  if (match.tournamentId) {
    await publishOrgEvent(organizationId, RealtimeEventType.TOURNAMENT_UPDATED, {
      entityId: match.tournamentId,
      actorUserId: actorUserId,
    });
  }

  return { id: matchId };
}

export async function updateInstantMatch(
  organizationId: string,
  actor: MatchActor,
  matchId: string,
  input: InstantMatchInput,
) {
  const existing = await prisma.match.findFirst({
    where: withOrgScope(organizationId, { id: matchId }),
    select: { id: true, createdById: true, status: true },
  });

  if (!existing) {
    throw new MatchError("Maç bulunamadı", "match", 404);
  }

  assertCanManageMatch(actor, existing);

  if (existing.status !== MatchStatus.COMPLETED) {
    throw new MatchError("Sadece tamamlanmış maçlar düzenlenebilir", "status");
  }

  const allPlayerIds = [...input.team1PlayerIds, ...input.team2PlayerIds];
  await assertPlayersInOrganization(organizationId, allPlayerIds);
  const winnerResult = assertCompleteMatchResult(input);

  const format = input.format === "SINGLES" ? MatchFormat.SINGLES : MatchFormat.DOUBLES;

  await prisma.$transaction(async (tx) => {
    await tx.matchParticipant.deleteMany({ where: { matchId } });
    await tx.matchSet.deleteMany({ where: { matchId } });

    await tx.match.update({
      where: { id: matchId },
      data: {
        format,
        resultEnteredById: actor.id,
        stakeNote: input.stakeNote ?? null,
        // Clearing or changing note resets settlement
        stakeSettled: false,
        team1Name: input.team1Name ?? null,
        team2Name: input.team2Name ?? null,
        team1SetsWon: winnerResult.team1SetsWon,
        team2SetsWon: winnerResult.team2SetsWon,
        winnerTeam: winnerResult.winnerTeam,
        participants: {
          create: [
            ...input.team1PlayerIds.map((userId) => ({ userId, team: 1 })),
            ...input.team2PlayerIds.map((userId) => ({ userId, team: 2 })),
          ],
        },
        sets: {
          create: winnerResult.sets.map((set, index) => ({
            setNumber: index + 1,
            team1Score: set.team1Score,
            team2Score: set.team2Score,
          })),
        },
      },
    });
  });

  await publishOrgEvent(organizationId, RealtimeEventType.MATCH_RESULT, {
    entityId: matchId,
    actorUserId: actor.id,
  });
  await publishOrgEvent(organizationId, RealtimeEventType.LEADERBOARD_DIRTY, {
    entityId: matchId,
  });

  return { id: matchId };
}

export async function deleteMatch(
  organizationId: string,
  actor: MatchActor,
  matchId: string,
) {
  const existing = await prisma.match.findFirst({
    where: withOrgScope(organizationId, { id: matchId }),
    select: { id: true, createdById: true },
  });

  if (!existing) {
    throw new MatchError("Maç bulunamadı", "match", 404);
  }

  assertCanManageMatch(actor, existing);

  await prisma.match.delete({
    where: { id: matchId },
  });

  await publishOrgEvent(organizationId, RealtimeEventType.MATCH_UPSERTED, {
    entityId: matchId,
    actorUserId: actor.id,
  });
  await publishOrgEvent(organizationId, RealtimeEventType.LEADERBOARD_DIRTY, {
    entityId: matchId,
  });

  return { id: matchId };
}

export type MatchListStatusFilter =
  | "ALL"
  | "COMPLETED"
  | "PLANNED"
  | "PENDING"
  | "CANCELLED";

export type { MatchListTimeFilter };

/**
 * Prefer scheduledAt, else playedAt, else createdAt — for calendar filters.
 */
function matchDateInRangeWhere(
  start: Date,
  end: Date,
): Prisma.MatchWhereInput {
  return {
    OR: [
      { scheduledAt: { gte: start, lt: end } },
      {
        AND: [
          { scheduledAt: null },
          { playedAt: { gte: start, lt: end } },
        ],
      },
      {
        AND: [
          { scheduledAt: null },
          { playedAt: null },
          { createdAt: { gte: start, lt: end } },
        ],
      },
    ],
  };
}

function buildTimeWhere(
  time: MatchListTimeFilter | undefined,
  now: Date,
): Prisma.MatchWhereInput {
  if (!time || time === "ALL") return {};

  if (time === "UPCOMING") {
    return {
      status: { in: [MatchStatus.PLANNED, MatchStatus.PENDING] },
      scheduledAt: { gt: now },
    };
  }

  if (time === "PAST") {
    return {
      OR: [
        { status: MatchStatus.COMPLETED },
        {
          status: MatchStatus.CANCELLED,
          OR: [
            { scheduledAt: { lt: now } },
            { AND: [{ scheduledAt: null }, { playedAt: { lt: now } }] },
            {
              AND: [
                { scheduledAt: null },
                { playedAt: null },
                { createdAt: { lt: now } },
              ],
            },
          ],
        },
        {
          status: { in: [MatchStatus.PLANNED, MatchStatus.PENDING] },
          scheduledAt: { lte: now },
        },
      ],
    };
  }

  const range = getMatchTimeRange(time, now);
  if (!range) return {};
  return matchDateInRangeWhere(range.start, range.end);
}

export async function listMatchesForOrganization(
  organizationId: string,
  options: {
    page?: number;
    pageSize?: number;
    status?: MatchListStatusFilter;
    time?: MatchListTimeFilter;
    /** When set, only matches where this user is a participant. */
    participantUserId?: string;
    /**
     * regular (default): non-tournament matches only.
     * tournament: tournament matches only; optional tournamentId narrows to one event.
     */
    matchKind?: "regular" | "tournament";
    tournamentId?: string;
  } = {},
) {
  await syncPlannedMatchesToPending(organizationId);

  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 20));
  const skip = (page - 1) * pageSize;
  const now = new Date();

  const statusFilter =
    options.status && options.status !== "ALL"
      ? { status: options.status as MatchStatus }
      : {};

  const timeFilter = buildTimeWhere(options.time, now);

  const participantFilter = options.participantUserId
    ? { participants: { some: { userId: options.participantUserId } } }
    : {};

  const matchKind = options.matchKind ?? "regular";
  const tournamentFilter: Prisma.MatchWhereInput =
    matchKind === "tournament"
      ? options.tournamentId
        ? { tournamentId: options.tournamentId }
        : { tournamentId: { not: null } }
      : { tournamentId: null };

  const where = withOrgScope(organizationId, {
    AND: [statusFilter, timeFilter, participantFilter, tournamentFilter],
  });

  const [total, matches] = await Promise.all([
    prisma.match.count({ where }),
    prisma.match.findMany({
      where,
      orderBy: [
        { scheduledAt: "desc" },
        { playedAt: "desc" },
        { updatedAt: "desc" },
      ],
      skip,
      take: pageSize,
      include: {
        tournament: { select: { id: true, name: true } },
        participants: {
          include: {
            user: {
              select: { id: true, fullName: true, avatarUrl: true },
            },
          },
        },
        sets: {
          orderBy: { setNumber: "asc" },
        },
      },
    }),
  ]);

  return {
    matches,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Tournaments that have matches — active first, then others (for match-list chips). */
export async function listTournamentsForMatchFilter(organizationId: string) {
  const rows = await prisma.tournament.findMany({
    where: withOrgScope(organizationId, {
      matches: { some: {} },
      status: { not: TournamentStatus.CANCELLED },
    }),
    select: {
      id: true,
      name: true,
      status: true,
      startsAt: true,
    },
  });

  const statusRank: Record<string, number> = {
    IN_PROGRESS: 0,
    DRAFT: 1,
    COMPLETED: 2,
  };

  return rows
    .sort((a, b) => {
      const ra = statusRank[a.status] ?? 9;
      const rb = statusRank[b.status] ?? 9;
      if (ra !== rb) return ra - rb;
      return b.startsAt.getTime() - a.startsAt.getTime();
    })
    .map((t) => ({
      id: t.id,
      name: t.name,
      status: t.status,
    }));
}

export async function getMatchForOrganization(organizationId: string, matchId: string) {
  await syncPlannedMatchesToPending(organizationId);

  return prisma.match.findFirst({
    where: withOrgScope(organizationId, { id: matchId }),
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, fullName: true, avatarUrl: true },
          },
        },
        orderBy: [{ team: "asc" }, { id: "asc" }],
      },
      sets: {
        orderBy: { setNumber: "asc" },
      },
      createdBy: {
        select: { id: true, fullName: true },
      },
      resultEnteredBy: {
        select: { id: true, fullName: true },
      },
    },
  });
}

export async function getRecentMatches(organizationId: string, limit = 5) {
  const now = new Date();

  return prisma.match.findMany({
    where: withOrgScope(organizationId, {
      OR: [
        { status: MatchStatus.COMPLETED },
        {
          status: MatchStatus.CANCELLED,
          OR: [
            { scheduledAt: { lt: now } },
            { AND: [{ scheduledAt: null }, { playedAt: { lt: now } }] },
            {
              AND: [
                { scheduledAt: null },
                { playedAt: null },
                { createdAt: { lt: now } },
              ],
            },
          ],
        },
        {
          status: { in: [MatchStatus.PLANNED, MatchStatus.PENDING] },
          scheduledAt: { lte: now },
        },
      ],
    }),
    orderBy: [{ scheduledAt: "desc" }, { playedAt: "desc" }, { updatedAt: "desc" }],
    take: limit,
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, fullName: true, avatarUrl: true },
          },
        },
      },
    },
  });
}

/**
 * Upcoming = future scheduledAt, not completed/cancelled.
 * Past-dated or unscheduled matches must never appear here.
 */
export async function listUpcomingForUser(
  organizationId: string,
  userId: string,
  limit = 5,
) {
  await syncPlannedMatchesToPending(organizationId);
  const now = new Date();

  return prisma.match.findMany({
    where: withOrgScope(organizationId, {
      status: { in: [MatchStatus.PLANNED, MatchStatus.PENDING] },
      scheduledAt: { gt: now },
      participants: { some: { userId } },
    }),
    orderBy: [{ scheduledAt: "asc" }],
    take: limit,
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, fullName: true, avatarUrl: true },
          },
        },
      },
    },
  });
}

/**
 * US-16: mark stake as paid. Only winning-side participants; completed matches with a note.
 * Unsettling is not allowed. Client `settled=false` is rejected.
 */
export async function setMatchStakeSettled(
  organizationId: string,
  actorUserId: string,
  matchId: string,
  settled: boolean,
) {
  if (!settled) {
    throw new MatchError(
      "İddia yalnızca ödendi olarak işaretlenebilir",
      "stakeSettled",
      403,
    );
  }

  const match = await prisma.match.findFirst({
    where: withOrgScope(organizationId, { id: matchId }),
    include: {
      participants: { select: { userId: true, team: true } },
    },
  });

  if (!match) {
    throw new MatchError("Maç bulunamadı", "match", 404);
  }

  const denial = stakeSettleDenialReason({
    matchStatus: match.status as MatchStatusValue,
    stakeNote: match.stakeNote,
    stakeSettled: match.stakeSettled,
    winnerTeam: match.winnerTeam,
    actorUserId,
    participants: match.participants,
  });

  if (denial) {
    const status =
      denial.includes("yalnızca") || denial.includes("tarafları") ? 403 : 400;
    throw new MatchError(denial, "permission", status);
  }

  // Atomic guard against double-click / race
  const updated = await prisma.match.updateMany({
    where: withOrgScope(organizationId, {
      id: matchId,
      stakeSettled: false,
      status: MatchStatus.COMPLETED,
    }),
    data: { stakeSettled: true },
  });

  if (updated.count === 0) {
    throw new MatchError(
      "İddia zaten ödendi olarak işaretlenmiş",
      "stakeSettled",
      409,
    );
  }

  const actor = await prisma.user.findFirst({
    where: withOrgScope(organizationId, { id: actorUserId }),
    select: { id: true, fullName: true },
  });

  const otherParticipantIds = match.participants
    .map((p) => p.userId)
    .filter((id) => id !== actorUserId);

  if (otherParticipantIds.length > 0 && actor) {
    await createNotificationsForUsers({
      userIds: otherParticipantIds,
      type: NotificationType.STAKE_SETTLED,
      title: "İddia ödendi",
      body: `${actor.fullName}, bu maçın iddiasını "Ödendi" olarak işaretledi.`,
      linkUrl: `/matches/${matchId}`,
    });
  }

  await publishOrgEvent(organizationId, RealtimeEventType.MATCH_UPSERTED, {
    entityId: matchId,
    actorUserId,
  });

  return { id: matchId, stakeSettled: true };
}

/** Unpaid stakes involving the player (completed matches with stakeNote, not settled). */
export async function listUnpaidStakesForUser(
  organizationId: string,
  userId: string,
) {
  return prisma.match.findMany({
    where: withOrgScope(organizationId, {
      status: MatchStatus.COMPLETED,
      stakeNote: { not: null },
      stakeSettled: false,
      participants: { some: { userId } },
    }),
    orderBy: [{ playedAt: "desc" }, { updatedAt: "desc" }],
    include: {
      participants: {
        include: {
          user: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      },
    },
  });
}
