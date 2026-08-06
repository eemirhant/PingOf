/**
 * Pure UI helpers for the notification center (no React / Prisma).
 */

import { NotificationType } from "@/domain/notification";

export type NotificationUiCategory =
  | "challenge"
  | "match"
  | "tournament"
  | "stake"
  | "system";

export type NotificationDateGroupId = "today" | "yesterday" | "week" | "older";

export type NotificationFilterId =
  | "all"
  | "unread"
  | "challenge"
  | "match"
  | "tournament"
  | "stake"
  | "system";

export function notificationUiCategory(type: string): NotificationUiCategory {
  switch (type) {
    case NotificationType.CHALLENGE_RECEIVED:
    case NotificationType.CHALLENGE_ACCEPTED:
    case NotificationType.CHALLENGE_DECLINED:
    case NotificationType.CHALLENGE_CANCELLED:
      return "challenge";
    case NotificationType.MATCH_CREATED:
    case NotificationType.MATCH_SCHEDULE_CHANGED:
    case NotificationType.MATCH_REMINDER:
    case NotificationType.MATCH_CANCELLED:
    case NotificationType.MATCH_RESULT:
      return "match";
    case NotificationType.TOURNAMENT_CREATED:
    case NotificationType.TOURNAMENT_ADDED:
    case NotificationType.TOURNAMENT_STARTED:
    case NotificationType.TOURNAMENT_MATCH_READY:
    case NotificationType.TOURNAMENT_MATCH_CREATED:
    case NotificationType.TOURNAMENT_COMPLETED:
      return "tournament";
    case NotificationType.STAKE_CREATED:
    case NotificationType.STAKE_SETTLED:
      return "stake";
    default:
      return "system";
  }
}

export function notificationDateGroup(
  date: Date,
  now: Date = new Date(),
): NotificationDateGroupId {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);

  if (date >= startOfToday) return "today";
  if (date >= startOfYesterday) return "yesterday";
  if (date >= startOfWeek) return "week";
  return "older";
}

export function notificationDateGroupLabel(id: NotificationDateGroupId): string {
  switch (id) {
    case "today":
      return "Bugün";
    case "yesterday":
      return "Dün";
    case "week":
      return "Bu Hafta";
    case "older":
      return "Daha Eski";
  }
}

export const NOTIFICATION_FILTERS: Array<{
  id: NotificationFilterId;
  label: string;
}> = [
  { id: "all", label: "Tümü" },
  { id: "unread", label: "Okunmamış" },
  { id: "challenge", label: "Meydan Okuma" },
  { id: "match", label: "Maç" },
  { id: "tournament", label: "Turnuva" },
  { id: "stake", label: "Bahis" },
  { id: "system", label: "Sistem" },
];

export function matchesNotificationFilter(
  filter: NotificationFilterId,
  item: { type: string; isRead: boolean },
): boolean {
  if (filter === "all") return true;
  if (filter === "unread") return !item.isRead;
  return notificationUiCategory(item.type) === filter;
}
