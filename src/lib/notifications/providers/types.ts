/**
 * Provider-agnostic push notification types.
 * createNotificationsForUsers must never import a concrete provider SDK.
 */

export type PushPriority = "normal" | "high";

export type PushNotificationPayload = {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  /** Prefer relative path for SW/client (e.g. /challenges?highlight=…). */
  url?: string;
  /** Absolute URL for FCM webpush.fcmOptions.link only. */
  absoluteUrl?: string;
  notificationType?: string;
  entityId?: string | null;
  organizationId?: string | null;
  challengeId?: string | null;
  matchId?: string | null;
  tournamentId?: string | null;
  notificationId?: string | null;
  timestamp?: string;
  priority?: PushPriority;
  tag?: string;
};

export type PushSendResult = {
  attempted: number;
  succeeded: number;
  failed: number;
  invalidTokensRemoved: number;
};

/**
 * Pluggable push delivery backend (FCM, Expo, APNs, WebPush, …).
 */
export interface PushProvider {
  readonly name: string;
  send(
    userIds: string[],
    notification: PushNotificationPayload,
  ): Promise<PushSendResult>;
}
