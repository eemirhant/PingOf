import { MatchFormat, MatchStatus, UserRole, type Prisma } from "@prisma/client";

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
import { prisma } from "@/lib/db";
import { createNotificationsForUsers } from "@/lib/notifications/create";
import { withOrgScope } from "@/lib/org-scope";
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
      scheduledAt: { lte: now },
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
    select: { id: true },
  });

  await createNotificationsForUsers({
    userIds: orgMembers.map((m) => m.id),
    type: "MATCH_CREATED",
    title: "Yeni maç kaydedildi",
    body: "Organizasyonunda yeni bir maç sonucu girildi.",
    linkUrl: `/matches/${match.id}`,
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
    type: "MATCH_CREATED",
    title: "Yeni maç planlandı",
    body: "Organizasyonunda ileri tarihli bir maç planlandı.",
    linkUrl: `/matches/${match.id}`,
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
    type: "MATCH_CANCELLED",
    title: "Maç iptal edildi",
    body: "Planlanan bir maç iptal edildi.",
    linkUrl: `/matches/${matchId}`,
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

  await createNotificationsForUsers({
    userIds: others,
    type: "MATCH_RESULT",
    title: "Maç sonucu girildi",
    body: "Oynadığın bir maçın sonucu kaydedildi.",
    linkUrl: `/matches/${matchId}`,
  });

  if (match.tournamentId) {
    const { processTournamentMatchResult } = await import(
      "@/lib/tournaments/service"
    );
    await processTournamentMatchResult(organizationId, matchId);
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

  return prisma.$transaction(async (tx) => {
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

    return { id: matchId };
  });
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

  const where = withOrgScope(organizationId, {
    AND: [statusFilter, timeFilter],
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
  return prisma.match.findMany({
    where: withOrgScope(organizationId, { status: MatchStatus.COMPLETED }),
    orderBy: [{ playedAt: "desc" }, { updatedAt: "desc" }],
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

export async function listUpcomingForUser(
  organizationId: string,
  userId: string,
  limit = 5,
) {
  await syncPlannedMatchesToPending(organizationId);

  return prisma.match.findMany({
    where: withOrgScope(organizationId, {
      status: { in: [MatchStatus.PLANNED, MatchStatus.PENDING] },
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
 * US-16: mark stake as paid/unpaid. Only match participants; completed matches with a note.
 */
export async function setMatchStakeSettled(
  organizationId: string,
  actorUserId: string,
  matchId: string,
  settled: boolean,
) {
  const match = await prisma.match.findFirst({
    where: withOrgScope(organizationId, { id: matchId }),
    include: {
      participants: { select: { userId: true } },
    },
  });

  if (!match) {
    throw new MatchError("Maç bulunamadı", "match", 404);
  }

  if (!match.stakeNote) {
    throw new MatchError("Bu maçta iddia yok", "stakeNote");
  }

  if (match.status !== MatchStatus.COMPLETED) {
    throw new MatchError(
      "İddia yalnızca tamamlanmış maçlarda işaretlenebilir",
      "status",
    );
  }

  if (!match.participants.some((p) => p.userId === actorUserId)) {
    throw new MatchError(
      "İddiayı yalnızca maçın tarafları işaretleyebilir",
      "permission",
      403,
    );
  }

  await prisma.match.update({
    where: { id: matchId },
    data: { stakeSettled: settled },
  });

  return { id: matchId, stakeSettled: settled };
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
