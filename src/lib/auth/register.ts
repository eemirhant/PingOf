import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/db";
import { generateInviteCode } from "@/lib/auth/invite-code";
import { hashPassword } from "@/lib/auth/password";
import type { RegisterInput } from "@/lib/validations/auth";

export class RegisterError extends Error {
  constructor(
    message: string,
    public readonly field?: keyof RegisterInput | "root",
  ) {
    super(message);
    this.name = "RegisterError";
  }
}

export async function registerOrganization(input: RegisterInput) {
  const email = input.email.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new RegisterError("Bu e-posta zaten kayıtlı", "email");
  }

  const passwordHash = await hashPassword(input.password);

  let inviteCode = generateInviteCode();
  let attempts = 0;

  while (attempts < 5) {
    const existingOrg = await prisma.organization.findUnique({
      where: { inviteCode },
      select: { id: true },
    });

    if (!existingOrg) break;

    inviteCode = generateInviteCode();
    attempts++;
  }

  if (attempts === 5) {
    throw new RegisterError("Kayıt işlemi tamamlanamadı. Lütfen tekrar deneyin.", "root");
  }

  const user = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: input.organizationName.trim(),
        inviteCode,
      },
    });

    const createdUser = await tx.user.create({
      data: {
        organizationId: organization.id,
        email,
        passwordHash,
        fullName: input.fullName.trim(),
        role: UserRole.OWNER,
      },
    });

    await tx.organization.update({
      where: { id: organization.id },
      data: { ownerId: createdUser.id },
    });

    return createdUser;
  });

  return user;
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}
