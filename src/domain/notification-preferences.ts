/**
 * User-managed notification preferences (per type × channel).
 * Only the four settings categories are user-toggleable; other notification
 * types still deliver (always allowed) when emitted by the app.
 */

import {
  NotificationType,
  type NotificationTypeValue,
} from "@/domain/notification";

export const NotificationChannel = {
  IN_APP: "inApp",
  PUSH: "push",
} as const;

export type NotificationChannelKey =
  (typeof NotificationChannel)[keyof typeof NotificationChannel];

/** Types shown in Settings → Bildirim Tercihleri (and stored in preferences JSON). */
export const MANAGED_NOTIFICATION_TYPES = [
  NotificationType.CHALLENGE_RECEIVED,
  NotificationType.CHALLENGE_ACCEPTED,
  NotificationType.CHALLENGE_DECLINED,
  NotificationType.CHALLENGE_CANCELLED,
  NotificationType.MATCH_CREATED,
  NotificationType.MATCH_SCHEDULE_CHANGED,
  NotificationType.MATCH_REMINDER,
  NotificationType.MATCH_CANCELLED,
  NotificationType.MATCH_RESULT,
  NotificationType.TOURNAMENT_ADDED,
  NotificationType.TOURNAMENT_STARTED,
  NotificationType.TOURNAMENT_MATCH_READY,
  NotificationType.TOURNAMENT_MATCH_CREATED,
  NotificationType.TOURNAMENT_COMPLETED,
  NotificationType.LEADERBOARD_RANK_CHANGED,
  NotificationType.LEADERBOARD_TOP3,
  NotificationType.LEADERBOARD_STREAK,
] as const;

export type NotificationPreferenceKey =
  (typeof MANAGED_NOTIFICATION_TYPES)[number];

export type ChannelPreference = {
  inApp: boolean;
  push: boolean;
};

export type NotificationPreferencesMap = Record<
  NotificationPreferenceKey,
  ChannelPreference
>;

export type ResolvedNotificationSettings = {
  preferences: NotificationPreferencesMap;
};

export type NotificationPreferenceCategoryId =
  | "challenges"
  | "matches"
  | "tournaments"
  | "leaderboard";

export type NotificationPreferenceItemDef = {
  key: NotificationPreferenceKey;
  label: string;
};

export type NotificationPreferenceCategoryDef = {
  id: NotificationPreferenceCategoryId;
  title: string;
  items: NotificationPreferenceItemDef[];
};

function both(on: boolean): ChannelPreference {
  return { inApp: on, push: on };
}

/** Defaults: challenges/matches/tournaments on; leaderboard off. */
export function defaultChannelPreference(
  key: NotificationPreferenceKey,
): ChannelPreference {
  switch (key) {
    case NotificationType.LEADERBOARD_RANK_CHANGED:
    case NotificationType.LEADERBOARD_TOP3:
    case NotificationType.LEADERBOARD_STREAK:
      return both(false);
    default:
      return both(true);
  }
}

export function buildDefaultPreferences(): NotificationPreferencesMap {
  const entries = MANAGED_NOTIFICATION_TYPES.map((key) => [
    key,
    defaultChannelPreference(key),
  ]);
  return Object.fromEntries(entries) as NotificationPreferencesMap;
}

export const NOTIFICATION_PREFERENCE_CATEGORIES: NotificationPreferenceCategoryDef[] =
  [
    {
      id: "challenges",
      title: "Meydan Okumalar",
      items: [
        {
          key: NotificationType.CHALLENGE_RECEIVED,
          label: "Bana yeni meydan okuması gönderildi",
        },
        {
          key: NotificationType.CHALLENGE_ACCEPTED,
          label: "Gönderdiğim meydan okuması kabul edildi",
        },
        {
          key: NotificationType.CHALLENGE_DECLINED,
          label: "Gönderdiğim meydan okuması reddedildi",
        },
        {
          key: NotificationType.CHALLENGE_CANCELLED,
          label: "Meydan okuması iptal edildi",
        },
      ],
    },
    {
      id: "matches",
      title: "Maçlar",
      items: [
        {
          key: NotificationType.MATCH_CREATED,
          label: "Yeni maç oluşturuldu",
        },
        {
          key: NotificationType.MATCH_SCHEDULE_CHANGED,
          label: "Maç tarihi veya saati değişti",
        },
        {
          key: NotificationType.MATCH_REMINDER,
          label: "Maç başlamadan önce hatırlatma",
        },
        {
          key: NotificationType.MATCH_CANCELLED,
          label: "Maç iptal edildi",
        },
        {
          key: NotificationType.MATCH_RESULT,
          label: "Maç sonucu girildi",
        },
      ],
    },
    {
      id: "tournaments",
      title: "Turnuvalar",
      items: [
        {
          key: NotificationType.TOURNAMENT_ADDED,
          label: "Yeni turnuvaya eklendim",
        },
        {
          key: NotificationType.TOURNAMENT_STARTED,
          label: "Turnuva başladı",
        },
        {
          key: NotificationType.TOURNAMENT_MATCH_READY,
          label: "Yeni rakibim belli oldu",
        },
        {
          key: NotificationType.TOURNAMENT_MATCH_CREATED,
          label: "Turnuva maçı oluşturuldu",
        },
        {
          key: NotificationType.TOURNAMENT_COMPLETED,
          label: "Turnuva tamamlandı",
        },
      ],
    },
    {
      id: "leaderboard",
      title: "Sıralama",
      items: [
        {
          key: NotificationType.LEADERBOARD_RANK_CHANGED,
          label: "Sıralamam değişti",
        },
        {
          key: NotificationType.LEADERBOARD_TOP3,
          label: "İlk 3'e girdim",
        },
        {
          key: NotificationType.LEADERBOARD_STREAK,
          label: "Yeni galibiyet serisi oluşturdum",
        },
      ],
    },
  ];

export function isNotificationPreferenceKey(
  value: string,
): value is NotificationPreferenceKey {
  return (MANAGED_NOTIFICATION_TYPES as readonly string[]).includes(value);
}

/**
 * Merge stored partial prefs with defaults (unknown keys ignored; missing keys defaulted).
 */
export function mergePreferences(
  stored: Partial<Record<string, Partial<ChannelPreference>>> | null | undefined,
): NotificationPreferencesMap {
  const defaults = buildDefaultPreferences();
  if (!stored || typeof stored !== "object") return defaults;

  for (const key of MANAGED_NOTIFICATION_TYPES) {
    const row = stored[key];
    if (!row || typeof row !== "object") continue;
    defaults[key] = {
      inApp: typeof row.inApp === "boolean" ? row.inApp : defaults[key].inApp,
      push: typeof row.push === "boolean" ? row.push : defaults[key].push,
    };
  }
  return defaults;
}

export function allowsInApp(
  prefs: NotificationPreferencesMap,
  type: string,
): boolean {
  if (!isNotificationPreferenceKey(type)) return true;
  return prefs[type].inApp;
}

export function allowsPush(
  prefs: NotificationPreferencesMap,
  type: string,
): boolean {
  if (!isNotificationPreferenceKey(type)) return true;
  return prefs[type].push;
}
