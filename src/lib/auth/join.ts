import { UserRole } from "@prisma/client";

import { generateInviteCode } from "@/lib/auth/invite-code";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import { NotificationType } from "@/domain/notification";
import { createNotificationsForUsers } from "@/lib/notifications/create";
import type { JoinInput } from "@/lib/validations/auth";

export class JoinError extends Error {
  constructor(
    message: string,
    public readonly field?: keyof JoinInput | "root" | "inviteCode",
  ) {
    super(message);
    this.name = "JoinError";
  }
}

export async function getOrganizationByInviteCode(inviteCode: string) {
  return prisma.organization.findUnique({
    where: { inviteCode },
    select: {
      id: true,
      name: true,
      inviteCode: true,
    },
  });
}

async function createUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const inviteCode = generateInviteCode();
    const existing = await prisma.organization.findUnique({
      where: { inviteCode },
      select: { id: true },
    });
    if (!existing) return inviteCode;
  }

  throw new Error("Davet kodu oluşturulamadı");
}

export async function joinOrganizationWithInvite(input: JoinInput) {
  const email = input.email.trim().toLowerCase();
  const inviteCode = input.inviteCode.trim();

  const organization = await getOrganizationByInviteCode(inviteCode);

  if (!organization) {
    throw new JoinError("Bu davet geçersiz", "inviteCode");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new JoinError("Bu e-posta zaten kayıtlı", "email");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      organizationId: organization.id,
      email,
      passwordHash,
      fullName: input.fullName.trim(),
      role: UserRole.MEMBER,
    },
  });

  const others = await prisma.user.findMany({
    where: {
      organizationId: organization.id,
      id: { not: user.id },
    },
    select: { id: true },
  });

  await createNotificationsForUsers({
    userIds: others.map((m) => m.id),
    type: NotificationType.MEMBER_JOINED,
    title: "Yeni oyuncu katıldı",
    body: `${user.fullName} organizasyona katıldı.`,
    linkUrl: `/players/${user.id}`,
  });

  return user;
}

/**
 * OWNER-only: regenerates invite code so the previous link becomes invalid.
 */
export async function regenerateOrganizationInviteCode(
  organizationId: string,
  actorUserId: string,
) {
  const actor = await prisma.user.findFirst({
    where: {
      id: actorUserId,
      organizationId,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!actor) {
    throw new JoinError("Yetkisiz işlem", "root");
  }

  if (actor.role !== UserRole.OWNER) {
    throw new JoinError("Davet linkini yalnızca kurucu sıfırlayabilir", "root");
  }

  const inviteCode = await createUniqueInviteCode();

  return prisma.organization.update({
    where: { id: organizationId },
    data: { inviteCode },
    select: {
      id: true,
      name: true,
      inviteCode: true,
    },
  });
}

export async function getOrganizationSettings(organizationId: string) {
  return prisma.organization.findFirst({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      inviteCode: true,
      ownerId: true,
      logoUrl: true,
      users: {
        orderBy: [{ role: "asc" }, { fullName: "asc" }],
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
        },
      },
    },
  });
}
