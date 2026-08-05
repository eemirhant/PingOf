import { Prisma } from "@prisma/client";

import {
  mergePreferences,
  type ChannelPreference,
  type NotificationPreferenceKey,
  type ResolvedNotificationSettings,
} from "@/domain/notification-preferences";
import { prisma } from "@/lib/db";
import { withOrgScope } from "@/lib/org-scope";

function asPreferenceRecord(
  value: Prisma.JsonValue | null | undefined,
): Partial<Record<string, Partial<ChannelPreference>>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Partial<Record<string, Partial<ChannelPreference>>>;
}

export async function getResolvedNotificationSettings(
  userId: string,
): Promise<ResolvedNotificationSettings> {
  const row = await prisma.userNotificationSettings.findUnique({
    where: { userId },
  });

  return {
    preferences: mergePreferences(asPreferenceRecord(row?.preferences)),
  };
}

/** Batch-load settings for many users (missing rows → defaults). */
export async function getResolvedNotificationSettingsForUsers(
  userIds: string[],
): Promise<Map<string, ResolvedNotificationSettings>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, ResolvedNotificationSettings>();
  if (unique.length === 0) return map;

  const rows = await prisma.userNotificationSettings.findMany({
    where: { userId: { in: unique } },
  });
  const byId = new Map(rows.map((r) => [r.userId, r]));

  for (const userId of unique) {
    const row = byId.get(userId);
    map.set(userId, {
      preferences: mergePreferences(asPreferenceRecord(row?.preferences)),
    });
  }
  return map;
}

export type UpdateNotificationPreferencesInput = {
  preferences?: Partial<Record<NotificationPreferenceKey, ChannelPreference>>;
};

export async function updateNotificationSettings(
  organizationId: string,
  userId: string,
  input: UpdateNotificationPreferencesInput,
): Promise<ResolvedNotificationSettings> {
  const user = await prisma.user.findFirst({
    where: withOrgScope(organizationId, { id: userId }),
    select: { id: true },
  });
  if (!user) {
    throw new Error("Yetkisiz işlem");
  }

  const current = await getResolvedNotificationSettings(userId);
  const nextPrefs = { ...current.preferences };
  if (input.preferences) {
    for (const [key, value] of Object.entries(input.preferences)) {
      if (!value) continue;
      if (!(key in nextPrefs)) continue;
      nextPrefs[key as NotificationPreferenceKey] = {
        inApp: Boolean(value.inApp),
        push: Boolean(value.push),
      };
    }
  }

  await prisma.userNotificationSettings.upsert({
    where: { userId },
    create: {
      userId,
      preferences: nextPrefs as unknown as Prisma.InputJsonValue,
    },
    update: {
      preferences: nextPrefs as unknown as Prisma.InputJsonValue,
    },
  });

  return { preferences: nextPrefs };
}
