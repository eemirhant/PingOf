import { z } from "zod";

import { MANAGED_NOTIFICATION_TYPES } from "@/domain/notification-preferences";

const preferenceKeySchema = z.enum(
  MANAGED_NOTIFICATION_TYPES as unknown as [string, ...string[]],
);

export const channelPreferenceSchema = z.object({
  inApp: z.boolean(),
  push: z.boolean(),
});

export const updateNotificationPreferencesSchema = z.object({
  preferences: z.record(preferenceKeySchema, channelPreferenceSchema).optional(),
});

export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;
