import { createHash, randomBytes } from "crypto";

import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export class PasswordResetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasswordResetError";
  }
}

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function generateRawToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Creates a single-use reset token for the user (if email exists).
 * Returns null when the email is unknown — callers must not reveal this.
 */
export async function createPasswordResetToken(
  email: string,
): Promise<{ rawToken: string; userId: string; email: string } | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, email: true },
  });

  if (!user) {
    return null;
  }

  // Invalidate previous unused tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: {
      userId: user.id,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });

  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  return { rawToken, userId: user.id, email: user.email };
}

export async function validatePasswordResetToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
    },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return null;
  }

  return record;
}

export async function resetPasswordWithToken(rawToken: string, newPassword: string) {
  const record = await validatePasswordResetToken(rawToken);

  if (!record) {
    throw new PasswordResetError("Bu sıfırlama linki geçersiz veya süresi dolmuş.");
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction(async (tx) => {
    const updated = await tx.passwordResetToken.updateMany({
      where: {
        id: record.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });

    if (updated.count === 0) {
      throw new PasswordResetError("Bu sıfırlama linki geçersiz veya süresi dolmuş.");
    }

    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });

    // Invalidate any remaining unused tokens for this user
    await tx.passwordResetToken.updateMany({
      where: {
        userId: record.userId,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });
  });
}
