import { prisma } from "@/lib/db";

export type CreateNotificationInput = {
  userIds: string[];
  type: string;
  title: string;
  body: string;
  linkUrl?: string | null;
};

/** Insert one notification per user (dedupes userIds). */
export async function createNotificationsForUsers(
  input: CreateNotificationInput,
): Promise<number> {
  const uniqueIds = [...new Set(input.userIds.filter(Boolean))];
  if (uniqueIds.length === 0) return 0;

  const result = await prisma.notification.createMany({
    data: uniqueIds.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      linkUrl: input.linkUrl ?? null,
      isRead: false,
    })),
  });

  return result.count;
}
