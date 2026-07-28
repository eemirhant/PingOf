import {
  MatchFormat,
  MatchStatus,
  TournamentStatus,
  TournamentType,
  UserRole,
} from "@prisma/client";

import {
  advanceTournamentBracket,
  buildKnockoutBracket,
  buildRoundRobinPairings,
  calculateRoundRobinStandings,
  isRoundRobinComplete,
  type BracketMatch,
  type RoundRobinResult,
} from "@/domain/tournament";
import { prisma } from "@/lib/db";
import { createNotificationsForUsers } from "@/lib/notifications/create";
import { withOrgScope } from "@/lib/org-scope";
import type { CreateTournamentInput } from "@/lib/validations/tournament";

export class TournamentError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = "TournamentError";
  }
}

export type TournamentActor = {
  id: string;
  role: UserRole;
};

type TournamentEntry = {
  entryId: string;
  userIds: string[];
  seed: number;
  pairIndex: number | null;
};

function pairEntryId(pairIndex: number): string {
  return `p${pairIndex}`;
}

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

async function assertPlayersInOrganization(
  organizationId: string,
  playerIds: string[],
) {
  const unique = [...new Set(playerIds)];
  const count = await prisma.user.count({
    where: withOrgScope(organizationId, { id: { in: unique } }),
  });
  if (count !== unique.length) {
    throw new TournamentError(
      "Seçilen oyunculardan bazıları organizasyonda değil",
      "participants",
    );
  }
}

function buildEntriesFromParticipants(
  format: MatchFormat,
  participants: Array<{
    userId: string;
    seed: number;
    pairIndex: number | null;
  }>,
): TournamentEntry[] {
  if (format === MatchFormat.SINGLES) {
    return [...participants]
      .sort((a, b) => a.seed - b.seed)
      .map((p) => ({
        entryId: p.userId,
        userIds: [p.userId],
        seed: p.seed,
        pairIndex: null,
      }));
  }

  const byPair = new Map<number, typeof participants>();
  for (const p of participants) {
    if (p.pairIndex == null) {
      throw new TournamentError("2v2 katılımcıda pairIndex eksik", "pairs");
    }
    const list = byPair.get(p.pairIndex) ?? [];
    list.push(p);
    byPair.set(p.pairIndex, list);
  }

  const entries: TournamentEntry[] = [];
  for (const [pairIndex, members] of [...byPair.entries()].sort(
    (a, b) => (a[1][0]?.seed ?? 0) - (b[1][0]?.seed ?? 0),
  )) {
    if (members.length !== 2) {
      throw new TournamentError("Her çiftte tam 2 oyuncu olmalı", "pairs");
    }
    entries.push({
      entryId: pairEntryId(pairIndex),
      userIds: members.map((m) => m.userId),
      seed: members[0]!.seed,
      pairIndex,
    });
  }
  return entries;
}

function entryIdForUserIds(
  format: MatchFormat,
  userIds: string[],
  entries: TournamentEntry[],
): string | null {
  if (userIds.length === 0) return null;
  if (format === MatchFormat.SINGLES) {
    return userIds[0] ?? null;
  }
  const set = new Set(userIds);
  const found = entries.find((e) => e.userIds.every((id) => set.has(id)));
  return found?.entryId ?? null;
}

function participantsForEntry(
  entry: TournamentEntry | undefined,
  team: 1 | 2,
): Array<{ userId: string; team: number }> {
  if (!entry) return [];
  return entry.userIds.map((userId) => ({ userId, team }));
}

export function canCancelTournament(
  actor: TournamentActor,
  tournament: { createdById: string },
): boolean {
  return actor.id === tournament.createdById || actor.role === UserRole.OWNER;
}

export async function createTournament(
  organizationId: string,
  actorUserId: string,
  input: CreateTournamentInput,
) {
  const format =
    input.format === "SINGLES" ? MatchFormat.SINGLES : MatchFormat.DOUBLES;
  const type =
    input.type === "KNOCKOUT"
      ? TournamentType.KNOCKOUT
      : TournamentType.ROUND_ROBIN;

  const playerIds =
    format === MatchFormat.SINGLES
      ? input.participantIds
      : input.pairs.flat();

  await assertPlayersInOrganization(organizationId, playerIds);

  const tournament = await prisma.$transaction(async (tx) => {
    const created = await tx.tournament.create({
      data: {
        organizationId,
        name: input.name,
        type,
        format,
        status: TournamentStatus.DRAFT,
        createdById: actorUserId,
        startsAt: input.startsAt,
      },
      select: { id: true },
    });

    if (format === MatchFormat.SINGLES) {
      await tx.tournamentParticipant.createMany({
        data: input.participantIds.map((userId, index) => ({
          tournamentId: created.id,
          userId,
          seed: index,
          pairIndex: null,
        })),
      });
    } else {
      const rows = input.pairs.flatMap((pair, pairIndex) =>
        pair.map((userId) => ({
          tournamentId: created.id,
          userId,
          seed: pairIndex,
          pairIndex,
        })),
      );
      await tx.tournamentParticipant.createMany({ data: rows });
    }

    return created;
  });

  return tournament;
}

export async function shuffleTournamentSeeds(
  organizationId: string,
  tournamentId: string,
) {
  const tournament = await prisma.tournament.findFirst({
    where: withOrgScope(organizationId, { id: tournamentId }),
    include: { participants: true },
  });

  if (!tournament) {
    throw new TournamentError("Turnuva bulunamadı", "tournament", 404);
  }
  if (tournament.status !== TournamentStatus.DRAFT) {
    throw new TournamentError(
      "Sadece taslak turnuvalarda karıştırma yapılabilir",
      "status",
    );
  }

  const entries = buildEntriesFromParticipants(
    tournament.format,
    tournament.participants,
  );
  shuffleInPlace(entries);

  await prisma.$transaction(
    entries.map((entry, index) =>
      prisma.tournamentParticipant.updateMany({
        where: {
          tournamentId,
          userId: { in: entry.userIds },
        },
        data: { seed: index },
      }),
    ),
  );

  return { id: tournamentId };
}

async function createMatchFromSides(params: {
  organizationId: string;
  tournamentId: string;
  createdById: string;
  format: MatchFormat;
  status: MatchStatus;
  tournamentRound: number | null;
  bracketSlot: number | null;
  team1UserIds: string[];
  team2UserIds: string[];
  winnerTeam?: number | null;
  team1SetsWon?: number | null;
  team2SetsWon?: number | null;
  playedAt?: Date | null;
}) {
  const participants = [
    ...params.team1UserIds.map((userId) => ({ userId, team: 1 })),
    ...params.team2UserIds.map((userId) => ({ userId, team: 2 })),
  ];

  return prisma.match.create({
    data: {
      organizationId: params.organizationId,
      tournamentId: params.tournamentId,
      format: params.format,
      status: params.status,
      createdById: params.createdById,
      tournamentRound: params.tournamentRound,
      bracketSlot: params.bracketSlot,
      winnerTeam: params.winnerTeam ?? null,
      team1SetsWon: params.team1SetsWon ?? null,
      team2SetsWon: params.team2SetsWon ?? null,
      playedAt: params.playedAt ?? null,
      participants: participants.length
        ? { create: participants }
        : undefined,
    },
    select: {
      id: true,
      status: true,
      participants: { select: { userId: true } },
    },
  });
}

async function startKnockoutTournament(
  organizationId: string,
  tournament: {
    id: string;
    format: MatchFormat;
    createdById: string;
    name: string;
  },
  entries: TournamentEntry[],
) {
  const entryIds = entries.map((e) => e.entryId);
  const byId = new Map(entries.map((e) => [e.entryId, e]));
  const { matches: bracket } = buildKnockoutBracket(entryIds);

  const createdMatches: Array<{
    id: string;
    status: MatchStatus;
    userIds: string[];
  }> = [];

  for (const bm of bracket) {
    const team1 = bm.team1EntryId ? byId.get(bm.team1EntryId) : undefined;
    const team2 = bm.team2EntryId ? byId.get(bm.team2EntryId) : undefined;
    const team1UserIds = team1?.userIds ?? [];
    const team2UserIds = team2?.userIds ?? [];

    let status: MatchStatus = MatchStatus.PLANNED;
    let winnerTeam: number | null = null;
    let team1SetsWon: number | null = null;
    let team2SetsWon: number | null = null;
    let playedAt: Date | null = null;

    if (bm.status === "COMPLETED" && bm.winnerEntryId) {
      status = MatchStatus.COMPLETED;
      winnerTeam = 1;
      team1SetsWon = 3;
      team2SetsWon = 0;
      playedAt = new Date();
      // Ensure winner is on team 1 for BYE records
      const winner = byId.get(bm.winnerEntryId);
      const loserIsBye = bm.team1EntryId == null || bm.team2EntryId == null;
      if (loserIsBye && winner) {
        const match = await createMatchFromSides({
          organizationId,
          tournamentId: tournament.id,
          createdById: tournament.createdById,
          format: tournament.format,
          status,
          tournamentRound: bm.round,
          bracketSlot: bm.bracketSlot,
          team1UserIds: winner.userIds,
          team2UserIds: [],
          winnerTeam: 1,
          team1SetsWon: 3,
          team2SetsWon: 0,
          playedAt,
        });
        createdMatches.push({
          id: match.id,
          status: match.status,
          userIds: match.participants.map((p) => p.userId),
        });
        continue;
      }
    } else if (bm.status === "PENDING") {
      status = MatchStatus.PENDING;
    } else {
      status = MatchStatus.PLANNED;
    }

    const match = await createMatchFromSides({
      organizationId,
      tournamentId: tournament.id,
      createdById: tournament.createdById,
      format: tournament.format,
      status,
      tournamentRound: bm.round,
      bracketSlot: bm.bracketSlot,
      team1UserIds,
      team2UserIds,
      winnerTeam,
      team1SetsWon,
      team2SetsWon,
      playedAt,
    });
    createdMatches.push({
      id: match.id,
      status: match.status,
      userIds: match.participants.map((p) => p.userId),
    });
  }

  return createdMatches;
}

async function startRoundRobinTournament(
  organizationId: string,
  tournament: {
    id: string;
    format: MatchFormat;
    createdById: string;
  },
  entries: TournamentEntry[],
) {
  const pairings = buildRoundRobinPairings(entries.map((e) => e.entryId));
  const byId = new Map(entries.map((e) => [e.entryId, e]));
  const createdMatches: Array<{
    id: string;
    status: MatchStatus;
    userIds: string[];
  }> = [];

  for (const pairing of pairings) {
    const team1 = byId.get(pairing.team1EntryId)!;
    const team2 = byId.get(pairing.team2EntryId)!;
    const match = await createMatchFromSides({
      organizationId,
      tournamentId: tournament.id,
      createdById: tournament.createdById,
      format: tournament.format,
      status: MatchStatus.PENDING,
      tournamentRound: null,
      bracketSlot: null,
      team1UserIds: team1.userIds,
      team2UserIds: team2.userIds,
    });
    createdMatches.push({
      id: match.id,
      status: match.status,
      userIds: match.participants.map((p) => p.userId),
    });
  }

  return createdMatches;
}

export async function startTournament(
  organizationId: string,
  tournamentId: string,
) {
  const tournament = await prisma.tournament.findFirst({
    where: withOrgScope(organizationId, { id: tournamentId }),
    include: { participants: true },
  });

  if (!tournament) {
    throw new TournamentError("Turnuva bulunamadı", "tournament", 404);
  }
  if (tournament.status !== TournamentStatus.DRAFT) {
    throw new TournamentError("Sadece taslak turnuva başlatılabilir", "status");
  }

  const entries = buildEntriesFromParticipants(
    tournament.format,
    tournament.participants,
  );
  if (entries.length < 2) {
    throw new TournamentError("En az 2 katılımcı gerekli", "participants");
  }

  const existingMatches = await prisma.match.count({
    where: withOrgScope(organizationId, { tournamentId }),
  });
  if (existingMatches > 0) {
    throw new TournamentError("Turnuva maçları zaten oluşturulmuş", "status");
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: TournamentStatus.IN_PROGRESS },
  });

  const createdMatches =
    tournament.type === TournamentType.KNOCKOUT
      ? await startKnockoutTournament(organizationId, tournament, entries)
      : await startRoundRobinTournament(organizationId, tournament, entries);

  const orgMembers = await prisma.user.findMany({
    where: withOrgScope(organizationId),
    select: { id: true },
  });

  await createNotificationsForUsers({
    userIds: orgMembers.map((m) => m.id),
    type: "TOURNAMENT_STARTED",
    title: "Turnuva başladı",
    body: `"${tournament.name}" turnuvası başladı.`,
    linkUrl: `/tournaments/${tournamentId}`,
  });

  const readyPlayerIds = createdMatches
    .filter((m) => m.status === MatchStatus.PENDING)
    .flatMap((m) => m.userIds);

  await createNotificationsForUsers({
    userIds: readyPlayerIds,
    type: "TOURNAMENT_MATCH_READY",
    title: "Turnuva maçın hazır",
    body: `"${tournament.name}" turnuvasında sıradaki maçın hazır.`,
    linkUrl: `/tournaments/${tournamentId}`,
  });

  return { id: tournamentId };
}

export async function cancelTournament(
  organizationId: string,
  actor: TournamentActor,
  tournamentId: string,
) {
  const tournament = await prisma.tournament.findFirst({
    where: withOrgScope(organizationId, { id: tournamentId }),
    select: { id: true, createdById: true, status: true, name: true },
  });

  if (!tournament) {
    throw new TournamentError("Turnuva bulunamadı", "tournament", 404);
  }
  if (!canCancelTournament(actor, tournament)) {
    throw new TournamentError("Bu turnuvayı iptal etme yetkin yok", "permission", 403);
  }
  if (
    tournament.status === TournamentStatus.COMPLETED ||
    tournament.status === TournamentStatus.CANCELLED
  ) {
    throw new TournamentError("Bu turnuva iptal edilemez", "status");
  }

  await prisma.$transaction(async (tx) => {
    await tx.tournament.update({
      where: { id: tournamentId },
      data: { status: TournamentStatus.CANCELLED },
    });
    await tx.match.updateMany({
      where: withOrgScope(organizationId, {
        tournamentId,
        status: { in: [MatchStatus.PLANNED, MatchStatus.PENDING] },
      }),
      data: { status: MatchStatus.CANCELLED },
    });
  });

  return { id: tournamentId };
}

export async function listTournaments(organizationId: string) {
  return prisma.tournament.findMany({
    where: withOrgScope(organizationId),
    orderBy: [{ startsAt: "desc" }, { id: "desc" }],
    include: {
      createdBy: { select: { id: true, fullName: true } },
      _count: { select: { participants: true, matches: true } },
    },
  });
}

export async function getActiveTournaments(organizationId: string, take = 3) {
  return prisma.tournament.findMany({
    where: withOrgScope(organizationId, {
      status: TournamentStatus.IN_PROGRESS,
    }),
    orderBy: [{ startsAt: "asc" }],
    take,
    select: {
      id: true,
      name: true,
      type: true,
      format: true,
      startsAt: true,
      _count: { select: { matches: true, participants: true } },
    },
  });
}

export async function getTournamentDetail(
  organizationId: string,
  tournamentId: string,
) {
  const tournament = await prisma.tournament.findFirst({
    where: withOrgScope(organizationId, { id: tournamentId }),
    include: {
      createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
      participants: {
        include: {
          user: { select: { id: true, fullName: true, avatarUrl: true } },
        },
        orderBy: [{ seed: "asc" }, { userId: "asc" }],
      },
      matches: {
        include: {
          participants: {
            include: {
              user: { select: { id: true, fullName: true, avatarUrl: true } },
            },
          },
          sets: { orderBy: { setNumber: "asc" } },
        },
        orderBy: [
          { tournamentRound: "asc" },
          { bracketSlot: "asc" },
          { createdAt: "asc" },
        ],
      },
    },
  });

  if (!tournament) return null;

  const entries = buildEntriesFromParticipants(
    tournament.format,
    tournament.participants,
  );

  let standings = null;
  let championLabels: string[] = [];

  if (tournament.type === TournamentType.ROUND_ROBIN) {
    const results: RoundRobinResult[] = [];
    for (const match of tournament.matches) {
      if (match.status !== MatchStatus.COMPLETED || match.winnerTeam == null) {
        continue;
      }
      const team1Ids = match.participants
        .filter((p) => p.team === 1)
        .map((p) => p.userId);
      const team2Ids = match.participants
        .filter((p) => p.team === 2)
        .map((p) => p.userId);
      const team1Entry = entryIdForUserIds(
        tournament.format,
        team1Ids,
        entries,
      );
      const team2Entry = entryIdForUserIds(
        tournament.format,
        team2Ids,
        entries,
      );
      if (!team1Entry || !team2Entry) continue;

      const winnerEntry =
        match.winnerTeam === 1 ? team1Entry : team2Entry;
      const team1Points = match.sets.reduce((s, x) => s + x.team1Score, 0);
      const team2Points = match.sets.reduce((s, x) => s + x.team2Score, 0);

      results.push({
        team1EntryId: team1Entry,
        team2EntryId: team2Entry,
        winnerEntryId: winnerEntry,
        team1SetsWon: match.team1SetsWon ?? 0,
        team2SetsWon: match.team2SetsWon ?? 0,
        team1PointsScored: team1Points,
        team2PointsScored: team2Points,
      });
    }

    const names: Record<string, string> = {};
    for (const e of entries) {
      names[e.entryId] = e.userIds
        .map(
          (id) =>
            tournament.participants.find((p) => p.userId === id)?.user.fullName ??
            id,
        )
        .join(" / ");
    }

    standings = calculateRoundRobinStandings(
      entries.map((e) => e.entryId),
      results,
      names,
    );

    if (tournament.status === TournamentStatus.COMPLETED && standings[0]) {
      championLabels = [names[standings[0].entryId] ?? standings[0].entryId];
    }
  } else if (tournament.status === TournamentStatus.COMPLETED) {
    const maxRound = tournament.matches.reduce(
      (max, m) => Math.max(max, m.tournamentRound ?? 0),
      0,
    );
    const final = tournament.matches.find(
      (m) =>
        m.tournamentRound === maxRound &&
        m.status === MatchStatus.COMPLETED &&
        m.winnerTeam != null,
    );
    if (final) {
      championLabels = final.participants
        .filter((p) => p.team === final.winnerTeam)
        .map((p) => p.user.fullName);
    }
  }

  return { tournament, entries, standings, championLabels };
}

function dbMatchesToBracket(
  format: MatchFormat,
  entries: TournamentEntry[],
  matches: Array<{
    id: string;
    tournamentRound: number | null;
    bracketSlot: number | null;
    status: MatchStatus;
    winnerTeam: number | null;
    participants: Array<{ userId: string; team: number }>;
  }>,
): BracketMatch[] {
  return matches
    .filter((m) => m.tournamentRound != null && m.bracketSlot != null)
    .map((m) => {
      const team1Ids = m.participants
        .filter((p) => p.team === 1)
        .map((p) => p.userId);
      const team2Ids = m.participants
        .filter((p) => p.team === 2)
        .map((p) => p.userId);
      const team1EntryId = entryIdForUserIds(format, team1Ids, entries);
      const team2EntryId = entryIdForUserIds(format, team2Ids, entries);
      let winnerEntryId: string | null = null;
      if (m.status === MatchStatus.COMPLETED && m.winnerTeam != null) {
        winnerEntryId =
          m.winnerTeam === 1 ? team1EntryId : team2EntryId;
      }

      let status: BracketMatch["status"] = "WAITING";
      if (m.status === MatchStatus.COMPLETED) status = "COMPLETED";
      else if (
        m.status === MatchStatus.PENDING &&
        team1EntryId &&
        team2EntryId
      ) {
        status = "PENDING";
      } else if (team1EntryId && team2EntryId) {
        status = "PENDING";
      }

      return {
        id: m.id,
        round: m.tournamentRound!,
        bracketSlot: m.bracketSlot!,
        team1EntryId,
        team2EntryId,
        winnerEntryId,
        status,
      };
    });
}

async function completeTournament(
  organizationId: string,
  tournamentId: string,
  tournamentName: string,
  championNames: string[],
) {
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: TournamentStatus.COMPLETED },
  });

  const orgMembers = await prisma.user.findMany({
    where: withOrgScope(organizationId),
    select: { id: true },
  });

  const champ =
    championNames.length > 0 ? championNames.join(" / ") : "Şampiyon";

  await createNotificationsForUsers({
    userIds: orgMembers.map((m) => m.id),
    type: "TOURNAMENT_COMPLETED",
    title: "Turnuva tamamlandı",
    body: `"${tournamentName}" bitti. Şampiyon: ${champ}.`,
    linkUrl: `/tournaments/${tournamentId}`,
  });
}

/**
 * Called after a tournament match result is saved.
 * Advances knockout bracket or completes round-robin when finished.
 */
export async function processTournamentMatchResult(
  organizationId: string,
  matchId: string,
) {
  const match = await prisma.match.findFirst({
    where: withOrgScope(organizationId, { id: matchId }),
    include: {
      participants: { select: { userId: true, team: true } },
    },
  });

  if (!match?.tournamentId || match.winnerTeam == null) return;

  const tournament = await prisma.tournament.findFirst({
    where: withOrgScope(organizationId, { id: match.tournamentId }),
    include: {
      participants: {
        include: { user: { select: { fullName: true } } },
      },
      matches: {
        include: {
          participants: { select: { userId: true, team: true } },
          sets: true,
        },
      },
    },
  });

  if (!tournament || tournament.status !== TournamentStatus.IN_PROGRESS) {
    return;
  }

  const entries = buildEntriesFromParticipants(
    tournament.format,
    tournament.participants,
  );
  const entryName = (entryId: string) => {
    const entry = entries.find((e) => e.entryId === entryId);
    if (!entry) return entryId;
    return entry.userIds
      .map(
        (id) =>
          tournament.participants.find((p) => p.userId === id)?.user.fullName ??
          id,
      )
      .join(" / ");
  };

  if (tournament.type === TournamentType.ROUND_ROBIN) {
    const completed = tournament.matches.filter(
      (m) => m.status === MatchStatus.COMPLETED,
    ).length;
    if (!isRoundRobinComplete(entries.length, completed)) return;

    const detail = await getTournamentDetail(organizationId, tournament.id);
    const top = detail?.standings?.[0];
    await completeTournament(
      organizationId,
      tournament.id,
      tournament.name,
      top ? [entryName(top.entryId)] : [],
    );
    return;
  }

  // Knockout advance
  const bracket = dbMatchesToBracket(
    tournament.format,
    entries,
    tournament.matches,
  );

  const team1Ids = match.participants
    .filter((p) => p.team === 1)
    .map((p) => p.userId);
  const team2Ids = match.participants
    .filter((p) => p.team === 2)
    .map((p) => p.userId);
  const winnerEntryId =
    match.winnerTeam === 1
      ? entryIdForUserIds(tournament.format, team1Ids, entries)
      : entryIdForUserIds(tournament.format, team2Ids, entries);

  if (!winnerEntryId) return;

  const advanced = advanceTournamentBracket({
    matches: bracket,
    completedMatchId: match.id,
    winnerEntryId,
  });

  const byId = new Map(entries.map((e) => [e.entryId, e]));

  for (const bm of advanced.matches) {
    const dbMatch = tournament.matches.find((m) => m.id === bm.id);
    if (!dbMatch) continue;

    const desiredTeam1 = bm.team1EntryId
      ? byId.get(bm.team1EntryId)?.userIds ?? []
      : [];
    const desiredTeam2 = bm.team2EntryId
      ? byId.get(bm.team2EntryId)?.userIds ?? []
      : [];

    const currentTeam1 = dbMatch.participants
      .filter((p) => p.team === 1)
      .map((p) => p.userId)
      .sort()
      .join(",");
    const currentTeam2 = dbMatch.participants
      .filter((p) => p.team === 2)
      .map((p) => p.userId)
      .sort()
      .join(",");
    const nextTeam1 = [...desiredTeam1].sort().join(",");
    const nextTeam2 = [...desiredTeam2].sort().join(",");

    const rosterChanged = currentTeam1 !== nextTeam1 || currentTeam2 !== nextTeam2;
    const shouldBePending =
      bm.status === "PENDING" &&
      desiredTeam1.length > 0 &&
      desiredTeam2.length > 0;

    if (rosterChanged) {
      await prisma.matchParticipant.deleteMany({ where: { matchId: bm.id } });
      const rows = [
        ...participantsForEntry(
          bm.team1EntryId ? byId.get(bm.team1EntryId) : undefined,
          1,
        ),
        ...participantsForEntry(
          bm.team2EntryId ? byId.get(bm.team2EntryId) : undefined,
          2,
        ),
      ];
      if (rows.length > 0) {
        await prisma.matchParticipant.createMany({
          data: rows.map((r) => ({ matchId: bm.id, ...r })),
        });
      }
    }

    if (
      shouldBePending &&
      dbMatch.status !== MatchStatus.PENDING &&
      dbMatch.status !== MatchStatus.COMPLETED
    ) {
      await prisma.match.update({
        where: { id: bm.id },
        data: { status: MatchStatus.PENDING },
      });
    }
  }

  if (advanced.newlyReadyMatchIds.length > 0) {
    const readyMatches = await prisma.match.findMany({
      where: withOrgScope(organizationId, {
        id: { in: advanced.newlyReadyMatchIds },
      }),
      include: { participants: { select: { userId: true } } },
    });
    const userIds = readyMatches.flatMap((m) =>
      m.participants.map((p) => p.userId),
    );
    await createNotificationsForUsers({
      userIds,
      type: "TOURNAMENT_MATCH_READY",
      title: "Turnuva maçın hazır",
      body: `"${tournament.name}" turnuvasında sıradaki maçın hazır.`,
      linkUrl: `/tournaments/${tournament.id}`,
    });
  }

  if (advanced.championEntryId) {
    await completeTournament(
      organizationId,
      tournament.id,
      tournament.name,
      [entryName(advanced.championEntryId)],
    );
  }
}
