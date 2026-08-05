import { UserRole } from "@prisma/client";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import { RealtimeEventType } from "@/domain/realtime";
import { publishOrgEvent } from "@/lib/realtime/publish";
import { isAvatarColor, isImageAvatar } from "@/lib/utils/avatar";
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

export async function getUserProfile(userId: string, organizationId: string) {
  return prisma.user.findFirst({
    where: { id: userId, organizationId },
    select: {
      id: true,
      fullName: true,
      email: true,
      avatarUrl: true,
      role: true,
    },
  });
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
    select: { id: true, avatarUrl: true },
  });

  if (!user) {
    throw new ProfileError("Yetkisiz işlem");
  }

  if (!isAvatarColor(input.avatarColor)) {
    throw new ProfileError("Geçersiz avatar rengi", "avatarColor");
  }

  let nextAvatar = user.avatarUrl;

  if (input.photoDataUrl) {
    nextAvatar = input.photoDataUrl;
  } else if (input.removePhoto) {
    nextAvatar = input.avatarColor.toLowerCase();
  } else if (!isImageAvatar(user.avatarUrl)) {
    nextAvatar = input.avatarColor.toLowerCase();
  }
  // Keep existing photo when only name/color metadata changes without remove/upload

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: input.fullName.trim(),
      avatarUrl: nextAvatar,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      avatarUrl: true,
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

  return prisma.organization.update({
    where: { id: organizationId },
    data: { logoUrl: logoDataUrl },
    select: { id: true, name: true, logoUrl: true },
  });
}

export async function getOrganizationBrand(organizationId: string) {
  return prisma.organization.findFirst({
    where: { id: organizationId },
    select: { id: true, name: true, logoUrl: true },
  });
}
