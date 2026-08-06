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
