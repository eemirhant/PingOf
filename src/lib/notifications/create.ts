import { prisma } from "@/lib/db";
import { sendWebPushToUsers } from "@/lib/push/service";

export type CreateNotificationInput = {
  userIds: string[];
  type: string;
  title: string;
  body: string;
  linkUrl?: string | null;
};

/** Insert one notification per user (dedupes userIds). Also best-effort Web Push. */
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

  // Fire-and-forget Web Push — must not block or fail in-app notifications
  void sendWebPushToUsers(uniqueIds, {
    title: input.title,
    body: input.body,
    url: input.linkUrl ?? "/notifications",
    tag: `pingof-${input.type}`,
  }).catch((error) => {
    console.error("[web-push] batch send error", error);
  });

  return result.count;
}
