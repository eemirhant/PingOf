import { prisma } from "@/lib/db";

export class NotificationError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = "NotificationError";
  }
}

export async function listNotificationsForUser(
  userId: string,
  options: { page?: number; pageSize?: number } = {},
) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const where = { userId };

  const [total, unreadCount, notifications] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        linkUrl: true,
        isRead: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    notifications,
    total,
    unreadCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const existing = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
    select: { id: true, type: true, isRead: true, linkUrl: true },
  });

  if (!existing) {
    throw new NotificationError("Bildirim bulunamadı", 404);
  }

  if (!existing.isRead) {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  return existing;
}

/**
 * Best-effort mark-read when opening via push/deep link without a row id.
 * Matches unread rows by type + entity fragment in linkUrl.
 */
export async function markUnreadNotificationsFromDeepLink(
  userId: string,
  input: {
    notificationId?: string | null;
    notificationType?: string | null;
    entityId?: string | null;
    challengeId?: string | null;
    matchId?: string | null;
    tournamentId?: string | null;
  },
): Promise<number> {
  if (input.notificationId?.trim()) {
    try {
      await markNotificationRead(userId, input.notificationId.trim());
      return 1;
    } catch {
      // fall through to heuristic match
    }
  }

  const fragments = [
    input.challengeId,
    input.matchId,
    input.tournamentId,
    input.entityId,
  ]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);

  if (fragments.length === 0 && !input.notificationType?.trim()) {
    return 0;
  }

  const unread = await prisma.notification.findMany({
    where: {
      userId,
      isRead: false,
      ...(input.notificationType?.trim()
        ? { type: input.notificationType.trim().toUpperCase() }
        : {}),
    },
    select: { id: true, linkUrl: true },
    take: 20,
    orderBy: { createdAt: "desc" },
  });

  const ids = unread
    .filter((row) => {
      if (fragments.length === 0) return true;
      const url = row.linkUrl ?? "";
      return fragments.some((f) => url.includes(f));
    })
    .map((row) => row.id);

  if (ids.length === 0) return 0;

  const result = await prisma.notification.updateMany({
    where: { userId, id: { in: ids }, isRead: false },
    data: { isRead: true },
  });
  return result.count;
}

export async function markAllNotificationsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return { count: result.count };
}

export async function deleteNotification(userId: string, notificationId: string) {
  const existing = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
    select: { id: true },
  });

  if (!existing) {
    throw new NotificationError("Bildirim bulunamadı", 404);
  }

  await prisma.notification.delete({ where: { id: notificationId } });
  return { id: notificationId };
}

export async function deleteReadNotifications(userId: string) {
  const result = await prisma.notification.deleteMany({
    where: { userId, isRead: true },
  });
  return { count: result.count };
}

export async function clearAllNotifications(userId: string) {
  const result = await prisma.notification.deleteMany({
    where: { userId },
  });
  return { count: result.count };
}
