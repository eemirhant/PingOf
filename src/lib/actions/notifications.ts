"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  NotificationError,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/service";

export type NotificationActionState = {
  error?: string;
  success?: string;
};

function revalidateNotificationPaths() {
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

export async function markNotificationReadAction(
  _prev: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Oturum bulunamadı" };
  }

  const notificationId = String(formData.get("notificationId") ?? "").trim();
  if (!notificationId) {
    return { error: "Bildirim bulunamadı" };
  }

  try {
    const notification = await markNotificationRead(session.user.id, notificationId);
    revalidateNotificationPaths();
    if (notification.linkUrl) {
      redirect(notification.linkUrl);
    }
    return { success: "Okundu işaretlendi." };
  } catch (error) {
    if (error instanceof NotificationError) {
      return { error: error.message };
    }
    // Next.js redirect throws; rethrow
    throw error;
  }
}

export async function markAllNotificationsReadAction(
  _prevState: NotificationActionState,
  _formData: FormData,
): Promise<NotificationActionState> {
  void _prevState;
  void _formData;
  const session = await auth();
  if (!session?.user) {
    return { error: "Oturum bulunamadı" };
  }

  try {
    await markAllNotificationsRead(session.user.id);
    revalidateNotificationPaths();
    return { success: "Tüm bildirimler okundu işaretlendi." };
  } catch {
    return { error: "Bildirimler güncellenirken bir hata oluştu." };
  }
}

/** Click handler: mark read then navigate (used from link form). */
export async function openNotificationAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const notificationId = String(formData.get("notificationId") ?? "").trim();
  const fallback = String(formData.get("linkUrl") ?? "").trim() || "/notifications";

  try {
    const notification = await markNotificationRead(session.user.id, notificationId);
    revalidateNotificationPaths();
    redirect(notification.linkUrl || fallback);
  } catch (error) {
    if (error instanceof NotificationError) {
      redirect("/notifications");
    }
    throw error;
  }
}
