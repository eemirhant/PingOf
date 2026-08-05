import { ChallengeStatus, MatchFormat, MatchStatus } from "@prisma/client";

import { CHALLENGE_EXPIRY_DAYS } from "@/domain/constants";
import {
  canRespondToChallenge,
  resolveChallengeMatchScheduledAt,
  type ChallengeStatusValue,
} from "@/domain/challenge";
import { NotificationType } from "@/domain/notification";
import { RealtimeEventType } from "@/domain/realtime";
import { prisma } from "@/lib/db";
import { createNotificationsForUsers } from "@/lib/notifications/create";
import { pushDebug } from "@/lib/notifications/push-debug";
import { withOrgScope } from "@/lib/org-scope";
import { publishOrgEvent } from "@/lib/realtime/publish";
import type { CreateChallengeInput } from "@/lib/validations/challenges";

export class ChallengeError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = "ChallengeError";
  }
}

export async function syncExpiredChallenges(organizationId: string) {
  const cutoff = new Date(
    Date.now() - CHALLENGE_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  );

  await prisma.challenge.updateMany({
    where: withOrgScope(organizationId, {
      status: ChallengeStatus.PENDING,
      createdAt: { lte: cutoff },
    }),
    data: { status: ChallengeStatus.EXPIRED },
  });
}

export async function createChallenge(
  organizationId: string,
  fromUserId: string,
  input: CreateChallengeInput,
) {
  if (input.toUserId === fromUserId) {
    throw new ChallengeError("Kendine meydan okuyamazsın", "toUserId");
  }

  const toUser = await prisma.user.findFirst({
    where: withOrgScope(organizationId, { id: input.toUserId }),
    select: { id: true, fullName: true },
  });

  if (!toUser) {
    throw new ChallengeError("Rakip bu organizasyonda bulunamadı", "toUserId", 404);
  }

  await syncExpiredChallenges(organizationId);

  const existing = await prisma.challenge.findFirst({
    where: withOrgScope(organizationId, {
      status: ChallengeStatus.PENDING,
      OR: [
        { fromUserId, toUserId: input.toUserId },
        { fromUserId: input.toUserId, toUserId: fromUserId },
      ],
    }),
    select: { id: true },
  });

  if (existing) {
    throw new ChallengeError(
      "Bu oyuncuyla bekleyen bir meydan okuma zaten var",
      "toUserId",
    );
  }

  const fromUser = await prisma.user.findFirst({
    where: withOrgScope(organizationId, { id: fromUserId }),
    select: { fullName: true },
  });

  const challenge = await prisma.challenge.create({
    data: {
      organizationId,
      fromUserId,
      toUserId: input.toUserId,
      proposedAt: input.proposedAt ?? null,
      note: input.note ?? null,
      status: ChallengeStatus.PENDING,
    },
    select: { id: true },
  });

  pushDebug("Meydan okuma oluşturuldu — bildirim akışı başlıyor", {
    event: "CHALLENGE_RECEIVED",
    challengeId: challenge.id,
    fromUserId,
    targetUserIds: [input.toUserId],
    targetExternalIds: [input.toUserId],
  });

  await createNotificationsForUsers({
    userIds: [input.toUserId],
    type: NotificationType.CHALLENGE_RECEIVED,
    title: "Sana maç teklifi geldi",
    body: `${fromUser?.fullName ?? "Bir oyuncu"} sana meydan okudu.`,
    linkUrl: "/challenges",
  });

  await publishOrgEvent(organizationId, RealtimeEventType.CHALLENGE_UPDATED, {
    entityId: challenge.id,
    actorUserId: fromUserId,
  });

  return challenge;
}

export async function acceptChallenge(
  organizationId: string,
  actorUserId: string,
  challengeId: string,
) {
  await syncExpiredChallenges(organizationId);

  const challenge = await prisma.challenge.findFirst({
    where: withOrgScope(organizationId, { id: challengeId }),
    include: {
      fromUser: { select: { id: true, fullName: true } },
      toUser: { select: { id: true, fullName: true } },
    },
  });

  if (!challenge) {
    throw new ChallengeError("Teklif bulunamadı", "challenge", 404);
  }

  if (challenge.toUserId !== actorUserId) {
    throw new ChallengeError("Bu teklifi yalnızca alıcı yanıtlayabilir", "permission", 403);
  }

  if (
    !canRespondToChallenge(
      challenge.status as ChallengeStatusValue,
      challenge.createdAt,
    )
  ) {
    throw new ChallengeError("Bu teklif artık yanıtlanamaz", "status");
  }

  const scheduledAt = resolveChallengeMatchScheduledAt(challenge.proposedAt);

  const match = await prisma.$transaction(async (tx) => {
    await tx.challenge.update({
      where: { id: challengeId },
      data: { status: ChallengeStatus.ACCEPTED },
    });

    return tx.match.create({
      data: {
        organizationId,
        format: MatchFormat.SINGLES,
        status: MatchStatus.PLANNED,
        scheduledAt,
        createdById: challenge.fromUserId,
        participants: {
          create: [
            { userId: challenge.fromUserId, team: 1 },
            { userId: challenge.toUserId, team: 2 },
          ],
        },
      },
      select: { id: true },
    });
  });

  const orgMembers = await prisma.user.findMany({
    where: withOrgScope(organizationId),
    select: { id: true },
  });

  const orgMemberIds = orgMembers.map((m) => m.id);
  pushDebug("Meydan okuma kabul edildi — bildirim akışı başlıyor", {
    event: "CHALLENGE_ACCEPTED",
    challengeId,
    matchId: match.id,
    actorUserId,
    matchCreatedTargetUserIds: orgMemberIds,
    matchCreatedTargetExternalIds: orgMemberIds,
    acceptedTargetUserIds: [challenge.fromUserId],
    acceptedTargetExternalIds: [challenge.fromUserId],
  });

  await createNotificationsForUsers({
    userIds: orgMemberIds,
    type: "MATCH_CREATED",
    title: "Yeni maç planlandı",
    body: `${challenge.fromUser.fullName} vs ${challenge.toUser.fullName} maçı kabul edildi.`,
    linkUrl: `/matches/${match.id}`,
  });

  await createNotificationsForUsers({
    userIds: [challenge.fromUserId],
    type: NotificationType.CHALLENGE_ACCEPTED,
    title: "Teklifin kabul edildi",
    body: `${challenge.toUser.fullName} meydan okumanı kabul etti.`,
    linkUrl: `/matches/${match.id}`,
  });

  await publishOrgEvent(organizationId, RealtimeEventType.CHALLENGE_UPDATED, {
    entityId: challengeId,
    actorUserId: actorUserId,
  });
  await publishOrgEvent(organizationId, RealtimeEventType.MATCH_UPSERTED, {
    entityId: match.id,
    actorUserId: actorUserId,
  });

  return { challengeId, matchId: match.id };
}

export async function declineChallenge(
  organizationId: string,
  actorUserId: string,
  challengeId: string,
) {
  await syncExpiredChallenges(organizationId);

  const challenge = await prisma.challenge.findFirst({
    where: withOrgScope(organizationId, { id: challengeId }),
    include: {
      toUser: { select: { fullName: true } },
    },
  });

  if (!challenge) {
    throw new ChallengeError("Teklif bulunamadı", "challenge", 404);
  }

  if (challenge.toUserId !== actorUserId) {
    throw new ChallengeError("Bu teklifi yalnızca alıcı yanıtlayabilir", "permission", 403);
  }

  if (
    !canRespondToChallenge(
      challenge.status as ChallengeStatusValue,
      challenge.createdAt,
    )
  ) {
    throw new ChallengeError("Bu teklif artık yanıtlanamaz", "status");
  }

  await prisma.challenge.update({
    where: { id: challengeId },
    data: { status: ChallengeStatus.DECLINED },
  });

  pushDebug("Meydan okuma reddedildi — bildirim akışı başlıyor", {
    event: "CHALLENGE_DECLINED",
    challengeId,
    actorUserId,
    targetUserIds: [challenge.fromUserId],
    targetExternalIds: [challenge.fromUserId],
  });

  await createNotificationsForUsers({
    userIds: [challenge.fromUserId],
    type: NotificationType.CHALLENGE_DECLINED,
    title: "Teklifin reddedildi",
    body: `${challenge.toUser.fullName} meydan okumanı reddetti.`,
    linkUrl: "/challenges",
  });

  await publishOrgEvent(organizationId, RealtimeEventType.CHALLENGE_UPDATED, {
    entityId: challengeId,
    actorUserId: actorUserId,
  });

  return { id: challengeId };
}

const challengeInclude = {
  fromUser: {
    select: { id: true, fullName: true, avatarUrl: true },
  },
  toUser: {
    select: { id: true, fullName: true, avatarUrl: true },
  },
} as const;

export async function listIncomingChallenges(
  organizationId: string,
  userId: string,
) {
  await syncExpiredChallenges(organizationId);

  return prisma.challenge.findMany({
    where: withOrgScope(organizationId, {
      toUserId: userId,
      status: ChallengeStatus.PENDING,
    }),
    orderBy: { createdAt: "desc" },
    include: challengeInclude,
  });
}

export async function listOutgoingChallenges(
  organizationId: string,
  userId: string,
) {
  await syncExpiredChallenges(organizationId);

  return prisma.challenge.findMany({
    where: withOrgScope(organizationId, {
      fromUserId: userId,
    }),
    orderBy: { createdAt: "desc" },
    take: 50,
    include: challengeInclude,
  });
}

export async function countPendingIncoming(
  organizationId: string,
  userId: string,
) {
  await syncExpiredChallenges(organizationId);

  return prisma.challenge.count({
    where: withOrgScope(organizationId, {
      toUserId: userId,
      status: ChallengeStatus.PENDING,
    }),
  });
}

export async function getOrgPlayerForChallenge(
  organizationId: string,
  playerId: string,
) {
  return prisma.user.findFirst({
    where: withOrgScope(organizationId, { id: playerId }),
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
    },
  });
}

export async function listOrgPlayersForChallenge(organizationId: string) {
  return prisma.user.findMany({
    where: withOrgScope(organizationId),
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      createdAt: true,
    },
  });
}
