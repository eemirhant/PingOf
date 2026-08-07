import { UserRole } from "@prisma/client";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import { RealtimeEventType } from "@/domain/realtime";
import { publishOrgEvent } from "@/lib/realtime/publish";
import {
  avatarColorForUser,
  hashAvatarColor,
  isAvatarColor,
  isImageAvatar,
} from "@/lib/utils/avatar";
import { avatarColors } from "@/lib/design-tokens";
import type { ChangePasswordInput, UpdateProfileInput } from "@/lib/validations/profile";

export class ProfileError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "ProfileError";
  }
}

/**
 * Prefer an unused palette color in the org; fall back to deterministic hash(userId).
 * Never assigns based on list index.
 */
export async function assignAvatarColorForNewUser(
  organizationId: string,
  userId: string,
): Promise<string> {
  const members = await prisma.user.findMany({
    where: {
      organizationId,
      id: { not: userId },
      avatarColor: { not: null },
    },
    select: { avatarColor: true },
  });
  const used = new Set(
    members
      .map((m) => m.avatarColor?.toLowerCase())
      .filter((c): c is string => Boolean(c)),
  );

  for (const color of avatarColors) {
    if (!used.has(color)) return color;
  }

  return hashAvatarColor(userId);
}

export async function getUserProfile(userId: string, organizationId: string) {
  const profile = await prisma.user.findFirst({
    where: { id: userId, organizationId },
    select: {
      id: true,
      fullName: true,
      email: true,
      avatarUrl: true,
      avatarColor: true,
      role: true,
    },
  });

  if (!profile) return null;

  // Backfill missing colors (pre-migration rows) so UI is stable across devices.
  if (!profile.avatarColor) {
    const color = avatarColorForUser(profile.id, profile.avatarUrl, null);
    await prisma.user.update({
      where: { id: profile.id },
      data: { avatarColor: color },
    });
    return { ...profile, avatarColor: color };
  }

  return profile;
}

export async function updateUserProfile(
  userId: string,
  organizationId: string,
  input: UpdateProfileInput & {
    photoDataUrl?: string | null;
    removePhoto?: boolean;
  },
) {
  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId },
    select: { id: true, avatarUrl: true, avatarColor: true },
  });

  if (!user) {
    throw new ProfileError("Yetkisiz işlem");
  }

  if (!isAvatarColor(input.avatarColor)) {
    throw new ProfileError("Geçersiz avatar rengi", "avatarColor");
  }

  const nextColor = input.avatarColor.toLowerCase();
  let nextAvatarUrl = user.avatarUrl;

  if (input.photoDataUrl) {
    nextAvatarUrl = input.photoDataUrl;
  } else if (input.removePhoto) {
    nextAvatarUrl = null;
  } else if (!isImageAvatar(user.avatarUrl)) {
    // Clear legacy hex-in-avatarUrl; color now lives only in avatarColor
    nextAvatarUrl = null;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: input.fullName.trim(),
      avatarUrl: nextAvatarUrl,
      avatarColor: nextColor,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      avatarUrl: true,
      avatarColor: true,
    },
  });

  await publishOrgEvent(organizationId, RealtimeEventType.PROFILE_UPDATED, {
    entityId: userId,
    actorUserId: userId,
  });

  return updated;
}

export async function changeUserPassword(
  userId: string,
  organizationId: string,
  input: ChangePasswordInput,
) {
  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId },
    select: { id: true, passwordHash: true },
  });

  if (!user) {
    throw new ProfileError("Yetkisiz işlem");
  }

  const isValid = await verifyPassword(input.currentPassword, user.passwordHash);

  if (!isValid) {
    throw new ProfileError("Mevcut şifre hatalı", "currentPassword");
  }

  const passwordHash = await hashPassword(input.newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

export async function updateOrganizationLogo(
  organizationId: string,
  actorUserId: string,
  actorRole: UserRole,
  logoDataUrl: string | null,
) {
  if (actorRole !== UserRole.OWNER) {
    throw new ProfileError("Organizasyon logosunu yalnızca kurucu yükleyebilir", "permission");
  }

  const org = await prisma.organization.findFirst({
    where: { id: organizationId },
    select: { id: true, ownerId: true },
  });

  if (!org) {
    throw new ProfileError("Organizasyon bulunamadı");
  }

  if (org.ownerId && org.ownerId !== actorUserId) {
    throw new ProfileError("Organizasyon logosunu yalnızca kurucu yükleyebilir", "permission");
  }

  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data: { logoUrl: logoDataUrl },
    select: { id: true, name: true, logoUrl: true },
  });

  await publishOrgEvent(organizationId, RealtimeEventType.PROFILE_UPDATED, {
    entityId: organizationId,
    actorUserId: actorUserId,
  });

  return updated;
}

export async function getOrganizationBrand(organizationId: string) {
  return prisma.organization.findFirst({
    where: { id: organizationId },
    select: { id: true, name: true, logoUrl: true },
  });
}
