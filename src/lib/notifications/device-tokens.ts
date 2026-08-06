import "server-only";

import { prisma } from "@/lib/db";
import { pushLog } from "@/lib/notifications/push-log";

export type RegisterDeviceTokenInput = {
  userId: string;
  organizationId: string;
  deviceId: string;
  fcmToken: string;
  platform?: string;
  browser?: string | null;
  deviceName?: string | null;
};

/**
 * Upsert FCM token for a device. Token refresh updates the same row
 * (matched by userId + deviceId). Duplicate fcmToken for another device
 * is reassigned to this device.
 */
export async function registerDeviceToken(
  input: RegisterDeviceTokenInput,
): Promise<{ id: string; refreshed: boolean }> {
  const platform = input.platform?.trim() || "web";
  const now = new Date();

  console.info("[fcm-register-db] registerDeviceToken() başladı", {
    userId: input.userId,
    organizationId: input.organizationId,
    deviceId: input.deviceId,
    platform,
    tokenLength: input.fcmToken.length,
    tokenPreview: `${input.fcmToken.slice(0, 8)}…${input.fcmToken.slice(-8)}`,
  });

  const existingByDevice = await prisma.deviceToken.findUnique({
    where: {
      userId_deviceId: {
        userId: input.userId,
        deviceId: input.deviceId,
      },
    },
  });

  const existingByToken = await prisma.deviceToken.findUnique({
    where: { fcmToken: input.fcmToken },
  });

  console.info("[fcm-register-db] mevcut kayıtlar", {
    existingByDeviceId: existingByDevice?.id ?? null,
    existingByDeviceActive: existingByDevice?.isActive ?? null,
    existingByTokenId: existingByToken?.id ?? null,
    existingByTokenUserId: existingByToken?.userId ?? null,
  });

  if (
    existingByToken &&
    existingByToken.userId === input.userId &&
    existingByToken.deviceId === input.deviceId
  ) {
    const updated = await prisma.deviceToken.update({
      where: { id: existingByToken.id },
      data: {
        isActive: true,
        lastSeenAt: now,
        platform,
        browser: input.browser ?? existingByToken.browser,
        deviceName: input.deviceName ?? existingByToken.deviceName,
        organizationId: input.organizationId,
      },
    });
    console.info("[fcm-register-db] UPDATE same device+token → isActive=true", {
      id: updated.id,
      userId: input.userId,
      deviceId: input.deviceId,
    });
    pushLog.deviceRegistered({
      userId: input.userId,
      deviceId: input.deviceId,
      organizationId: input.organizationId,
      refreshed: false,
    });
    return { id: updated.id, refreshed: false };
  }

  if (existingByToken && existingByToken.id !== existingByDevice?.id) {
    console.info("[fcm-register-db] çakışan fcmToken siliniyor", {
      deletedId: existingByToken.id,
      previousUserId: existingByToken.userId,
    });
    await prisma.deviceToken.delete({ where: { id: existingByToken.id } });
  }

  if (existingByDevice) {
    const refreshed = existingByDevice.fcmToken !== input.fcmToken;
    const updated = await prisma.deviceToken.update({
      where: { id: existingByDevice.id },
      data: {
        fcmToken: input.fcmToken,
        isActive: true,
        lastSeenAt: now,
        platform,
        browser: input.browser ?? existingByDevice.browser,
        deviceName: input.deviceName ?? existingByDevice.deviceName,
        organizationId: input.organizationId,
      },
    });
    console.info("[fcm-register-db] UPDATE by deviceId", {
      id: updated.id,
      refreshed,
      userId: input.userId,
      deviceId: input.deviceId,
      isActive: true,
    });
    if (refreshed) {
      pushLog.tokenRefreshed({
        userId: input.userId,
        deviceId: input.deviceId,
        organizationId: input.organizationId,
      });
    } else {
      pushLog.deviceRegistered({
        userId: input.userId,
        deviceId: input.deviceId,
        organizationId: input.organizationId,
        refreshed: false,
      });
    }
    return { id: updated.id, refreshed };
  }

  const created = await prisma.deviceToken.create({
    data: {
      userId: input.userId,
      organizationId: input.organizationId,
      deviceId: input.deviceId,
      fcmToken: input.fcmToken,
      platform,
      browser: input.browser ?? null,
      deviceName: input.deviceName ?? null,
      lastSeenAt: now,
      isActive: true,
    },
  });

  console.info("[fcm-register-db] CREATE yeni DeviceToken", {
    id: created.id,
    userId: created.userId,
    deviceId: created.deviceId,
    platform: created.platform,
    isActive: created.isActive,
    tokenLength: input.fcmToken.length,
  });

  pushLog.deviceRegistered({
    userId: input.userId,
    deviceId: input.deviceId,
    organizationId: input.organizationId,
    created: true,
  });

  return { id: created.id, refreshed: false };
}

export async function deactivateDeviceToken(input: {
  userId: string;
  organizationId: string;
  deviceId?: string;
  fcmToken?: string;
}): Promise<number> {
  const where = {
    userId: input.userId,
    organizationId: input.organizationId,
    isActive: true,
    ...(input.deviceId ? { deviceId: input.deviceId } : {}),
    ...(input.fcmToken ? { fcmToken: input.fcmToken } : {}),
  };

  const result = await prisma.deviceToken.updateMany({
    where,
    data: { isActive: false },
  });

  if (result.count > 0) {
    pushLog.deviceDeactivated({
      userId: input.userId,
      organizationId: input.organizationId,
      deviceId: input.deviceId ?? null,
      count: result.count,
    });
  }

  return result.count;
}

export async function deactivateAllDeviceTokensForUser(input: {
  userId: string;
  organizationId: string;
}): Promise<number> {
  return deactivateDeviceToken(input);
}

export async function listActiveTokensForUsers(
  userIds: string[],
): Promise<Array<{ id: string; userId: string; fcmToken: string }>> {
  if (userIds.length === 0) return [];

  return prisma.deviceToken.findMany({
    where: {
      userId: { in: userIds },
      isActive: true,
    },
    select: {
      id: true,
      userId: true,
      fcmToken: true,
    },
  });
}

/**
 * Diagnostic-only: all DeviceToken rows for users (active + inactive).
 * Does not change delivery behavior.
 */
export async function diagnoseDeviceTokensForUsers(userIds: string[]): Promise<
  Array<{
    userId: string;
    deviceId: string;
    platform: string;
    browser: string | null;
    isActive: boolean;
    lastSeenAt: Date;
    tokenLength: number;
    tokenPreview: string;
  }>
> {
  if (userIds.length === 0) return [];

  const rows = await prisma.deviceToken.findMany({
    where: { userId: { in: userIds } },
    select: {
      userId: true,
      deviceId: true,
      platform: true,
      browser: true,
      isActive: true,
      lastSeenAt: true,
      fcmToken: true,
    },
    orderBy: { lastSeenAt: "desc" },
  });

  return rows.map((row) => ({
    userId: row.userId,
    deviceId: row.deviceId,
    platform: row.platform,
    browser: row.browser,
    isActive: row.isActive,
    lastSeenAt: row.lastSeenAt,
    tokenLength: row.fcmToken.length,
    tokenPreview: `${row.fcmToken.slice(0, 8)}…${row.fcmToken.slice(-8)}`,
  }));
}

export async function removeInvalidTokens(
  fcmTokens: string[],
): Promise<number> {
  if (fcmTokens.length === 0) return 0;

  const result = await prisma.deviceToken.deleteMany({
    where: { fcmToken: { in: fcmTokens } },
  });

  for (const token of fcmTokens) {
    pushLog.invalidTokenRemoved({
      fcmTokenPrefix: token.slice(0, 12),
    });
  }

  return result.count;
}
