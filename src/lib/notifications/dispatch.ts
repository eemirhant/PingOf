import {
  createNotificationsForUsers,
  type CreateNotificationInput,
} from "@/lib/notifications/create";
import type { NotificationTypeValue } from "@/domain/notification";

/**
 * Event-driven entry for notifications.
 * Call sites should prefer this over ad-hoc push sends.
 *
 * Flow: Event → preference filter → DB (in-app) → realtime → push provider (FCM)
 */
export type NotificationEvent = {
  type: NotificationTypeValue | string;
  userIds: string[];
  title: string;
  body: string;
  linkUrl?: string | null;
};

export async function dispatchNotificationEvent(
  event: NotificationEvent,
): Promise<number> {
  const input: CreateNotificationInput = {
    userIds: event.userIds,
    type: event.type,
    title: event.title,
    body: event.body,
    linkUrl: event.linkUrl,
  };
  return createNotificationsForUsers(input);
}
