/**
 * Notification type catalog (SCREAMING_SNAKE for DB compatibility).
 * User-managed toggles live in notification-preferences.ts (subset).
 */

export const NotificationType = {
  // Challenges
  CHALLENGE_RECEIVED: "CHALLENGE_RECEIVED",
  CHALLENGE_ACCEPTED: "CHALLENGE_ACCEPTED",
  CHALLENGE_DECLINED: "CHALLENGE_DECLINED",
  CHALLENGE_CANCELLED: "CHALLENGE_CANCELLED",

  // Matches
  MATCH_CREATED: "MATCH_CREATED",
  MATCH_SCHEDULE_CHANGED: "MATCH_SCHEDULE_CHANGED",
  MATCH_REMINDER: "MATCH_REMINDER",
  MATCH_CANCELLED: "MATCH_CANCELLED",
  MATCH_RESULT: "MATCH_RESULT",

  // Tournaments
  TOURNAMENT_CREATED: "TOURNAMENT_CREATED",
  TOURNAMENT_ADDED: "TOURNAMENT_ADDED",
  TOURNAMENT_STARTED: "TOURNAMENT_STARTED",
  TOURNAMENT_MATCH_READY: "TOURNAMENT_MATCH_READY",
  TOURNAMENT_MATCH_CREATED: "TOURNAMENT_MATCH_CREATED",
  TOURNAMENT_COMPLETED: "TOURNAMENT_COMPLETED",

  // Stakes (emitted; not user-toggleable in Settings)
  STAKE_CREATED: "STAKE_CREATED",
  STAKE_SETTLED: "STAKE_SETTLED",

  // Leaderboard
  LEADERBOARD_RANK_CHANGED: "LEADERBOARD_RANK_CHANGED",
  LEADERBOARD_TOP3: "LEADERBOARD_TOP3",
  LEADERBOARD_OVERTAKEN: "LEADERBOARD_OVERTAKEN",
  LEADERBOARD_STREAK: "LEADERBOARD_STREAK",

  // Org (emitted; not user-toggleable in Settings)
  MEMBER_JOINED: "MEMBER_JOINED",
} as const;

export type NotificationTypeValue =
  (typeof NotificationType)[keyof typeof NotificationType];

/** UI icon for notification center (emoji — matches app style). */
export function notificationTypeIcon(type: string): string {
  switch (type) {
    case NotificationType.CHALLENGE_RECEIVED:
    case NotificationType.CHALLENGE_ACCEPTED:
    case NotificationType.CHALLENGE_DECLINED:
    case NotificationType.CHALLENGE_CANCELLED:
      return "🏓";
    case NotificationType.MATCH_CREATED:
    case NotificationType.MATCH_SCHEDULE_CHANGED:
    case NotificationType.MATCH_REMINDER:
    case NotificationType.MATCH_CANCELLED:
    case NotificationType.MATCH_RESULT:
      return "📅";
    case NotificationType.TOURNAMENT_CREATED:
    case NotificationType.TOURNAMENT_ADDED:
    case NotificationType.TOURNAMENT_STARTED:
    case NotificationType.TOURNAMENT_MATCH_READY:
    case NotificationType.TOURNAMENT_MATCH_CREATED:
    case NotificationType.TOURNAMENT_COMPLETED:
      return "🏆";
    case NotificationType.STAKE_CREATED:
    case NotificationType.STAKE_SETTLED:
      return "💰";
    case NotificationType.LEADERBOARD_RANK_CHANGED:
    case NotificationType.LEADERBOARD_TOP3:
    case NotificationType.LEADERBOARD_OVERTAKEN:
    case NotificationType.LEADERBOARD_STREAK:
      return "📈";
    case NotificationType.MEMBER_JOINED:
      return "👤";
    default:
      return "🔔";
  }
}
