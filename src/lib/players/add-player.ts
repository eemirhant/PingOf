import { UserRole } from "@prisma/client";

import { hashPassword } from "@/lib/auth/password";
import { NotificationType } from "@/domain/notification";
import { prisma } from "@/lib/db";
import { createNotificationsForUsers } from "@/lib/notifications/create";
import { RealtimeEventType } from "@/domain/realtime";
import { publishOrgEvent } from "@/lib/realtime/publish";
import type { AddPlayerInput } from "@/lib/validations/players";

export class AddPlayerError extends Error {
  constructor(
    message: string,
    public readonly field?: keyof AddPlayerInput | "root",
  ) {
    super(message);
    this.name = "AddPlayerError";
  }
}

/**
 * Adds a MEMBER to the actor's organization.
 * Any authenticated org member may invite (PRD §3 / US-4).
 * organizationId always comes from the session — never from client input.
 */
export async function addPlayerToOrganization(
  organizationId: string,
  actorUserId: string,
  input: AddPlayerInput,
) {
  const actor = await prisma.user.findFirst({
    where: {
      id: actorUserId,
      organizationId,
    },
    select: { id: true },
  });

  if (!actor) {
    throw new AddPlayerError("Yetkisiz işlem", "root");
  }

  const email = input.email.trim().toLowerCase();

  const existingInOrg = await prisma.user.findFirst({
    where: {
      organizationId,
      email,
    },
    select: { id: true },
  });

  if (existingInOrg) {
    throw new AddPlayerError("Bu e-posta zaten bu organizasyonda kayıtlı", "email");
  }

  const existingGlobal = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingGlobal) {
    throw new AddPlayerError("Bu e-posta zaten kayıtlı", "email");
  }

  const passwordHash = await hashPassword(input.temporaryPassword);

  const player = await prisma.user.create({
    data: {
      organizationId,
      email,
      passwordHash,
      fullName: input.fullName.trim(),
      role: UserRole.MEMBER,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
    },
  });

  const others = await prisma.user.findMany({
    where: {
      organizationId,
      id: { not: player.id },
    },
    select: { id: true },
  });

  await createNotificationsForUsers({
    userIds: others.map((m) => m.id),
    type: NotificationType.MEMBER_JOINED,
    title: "Yeni oyuncu katıldı",
    body: `${player.fullName} organizasyona eklendi.`,
    linkUrl: `/players/${player.id}`,
    playerId: player.id,
    entityId: player.id,
  });

  await publishOrgEvent(organizationId, RealtimeEventType.MEMBER_JOINED, {
    entityId: player.id,
  });

  return player;
}
