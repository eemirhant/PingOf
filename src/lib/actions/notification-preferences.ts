"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import type { NotificationPreferenceKey } from "@/domain/notification-preferences";
import {
  getResolvedNotificationSettings,
  updateNotificationSettings,
} from "@/lib/notifications/preferences";
import { updateNotificationPreferencesSchema } from "@/lib/validations/notification-preferences";

export type NotificationPreferencesActionState = {
  error?: string;
  success?: string;
};

export async function getNotificationPreferencesAction() {
  const session = await auth();
  if (!session?.user) return null;
  return getResolvedNotificationSettings(session.user.id);
}

export async function updateNotificationPreferencesAction(
  _prev: NotificationPreferencesActionState,
  formData: FormData,
): Promise<NotificationPreferencesActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Oturum bulunamadı" };
  }

  const raw = String(formData.get("payload") ?? "");
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return { error: "Geçersiz istek" };
  }

  const parsed = updateNotificationPreferencesSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return { error: "Tercihler doğrulanamadı" };
  }

  try {
    await updateNotificationSettings(
      session.user.organizationId,
      session.user.id,
      {
        preferences: parsed.data.preferences as
          | Partial<
              Record<NotificationPreferenceKey, { inApp: boolean; push: boolean }>
            >
          | undefined,
      },
    );
    revalidatePath("/settings");
    return { success: "Bildirim tercihleri kaydedildi" };
  } catch {
    return { error: "Tercihler kaydedilirken bir hata oluştu" };
  }
}
