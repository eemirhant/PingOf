"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  NotificationError,
  clearAllNotifications,
  deleteNotification,
  deleteReadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/service";
import { toSafeInternalPath } from "@/lib/url/safe-path";

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
      redirect(
        toSafeInternalPath(notification.linkUrl, "/notifications"),
      );
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
  const fallback = toSafeInternalPath(
    formData.get("linkUrl"),
    "/notifications",
  );

  try {
    const notification = await markNotificationRead(session.user.id, notificationId);
    revalidateNotificationPaths();
    redirect(toSafeInternalPath(notification.linkUrl, fallback));
  } catch (error) {
    if (error instanceof NotificationError) {
      redirect("/notifications");
    }
    throw error;
  }
}

export async function deleteNotificationAction(
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
    await deleteNotification(session.user.id, notificationId);
    revalidateNotificationPaths();
    return { success: "Bildirim silindi." };
  } catch (error) {
    if (error instanceof NotificationError) {
      return { error: error.message };
    }
    return { error: "Bildirim silinirken bir hata oluştu." };
  }
}

export async function deleteReadNotificationsAction(
  _prev: NotificationActionState,
  _formData: FormData,
): Promise<NotificationActionState> {
  void _prev;
  void _formData;
  const session = await auth();
  if (!session?.user) {
    return { error: "Oturum bulunamadı" };
  }

  try {
    const result = await deleteReadNotifications(session.user.id);
    revalidateNotificationPaths();
    return {
      success:
        result.count > 0
          ? `${result.count} okunmuş bildirim temizlendi.`
          : "Temizlenecek okunmuş bildirim yok.",
    };
  } catch {
    return { error: "Bildirimler temizlenirken bir hata oluştu." };
  }
}

export async function clearAllNotificationsAction(
  _prev: NotificationActionState,
  _formData: FormData,
): Promise<NotificationActionState> {
  void _prev;
  void _formData;
  const session = await auth();
  if (!session?.user) {
    return { error: "Oturum bulunamadı" };
  }

  try {
    await clearAllNotifications(session.user.id);
    revalidateNotificationPaths();
    return { success: "Tüm bildirimler temizlendi." };
  } catch {
    return { error: "Bildirimler temizlenirken bir hata oluştu." };
  }
}
