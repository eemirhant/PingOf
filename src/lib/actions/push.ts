"use server";

import { auth } from "@/auth";
import {
  PushError,
  removePushSubscription,
  savePushSubscription,
  userHasPushSubscription,
} from "@/lib/push/service";
import { getVapidPublicKey } from "@/lib/push/vapid";
import { pushSubscriptionSchema } from "@/lib/validations/push";

export type PushActionState = {
  error?: string;
  success?: string;
  enabled?: boolean;
};

export async function getPushPublicKeyAction(): Promise<{
  publicKey: string | null;
  configured: boolean;
}> {
  const publicKey = getVapidPublicKey();
  return { publicKey, configured: Boolean(publicKey) };
}

export async function getPushStatusAction(): Promise<{
  hasSubscription: boolean;
  configured: boolean;
}> {
  const session = await auth();
  const configured = Boolean(getVapidPublicKey());
  if (!session?.user) {
    return { hasSubscription: false, configured };
  }
  const hasSubscription = await userHasPushSubscription(session.user.id);
  return { hasSubscription, configured };
}

export async function subscribePushAction(
  raw: unknown,
  userAgent?: string | null,
): Promise<PushActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Oturum bulunamadı" };
  }

  if (!getVapidPublicKey()) {
    return { error: "Web Push sunucuda yapılandırılmamış." };
  }

  const parsed = pushSubscriptionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Geçersiz abonelik bilgisi." };
  }

  try {
    await savePushSubscription(session.user.id, parsed.data, userAgent);
    return { success: "Tarayıcı bildirimleri açıldı.", enabled: true };
  } catch (error) {
    if (error instanceof PushError) {
      return { error: error.message };
    }
    return { error: "Abonelik kaydedilemedi." };
  }
}

export async function unsubscribePushAction(
  endpoint: string,
): Promise<PushActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Oturum bulunamadı" };
  }

  const trimmed = endpoint.trim();
  if (!trimmed) {
    return { error: "Abonelik bulunamadı." };
  }

  try {
    await removePushSubscription(session.user.id, trimmed);
    return { success: "Tarayıcı bildirimleri kapatıldı.", enabled: false };
  } catch (error) {
    if (error instanceof PushError) {
      return { error: error.message };
    }
    return { error: "Abonelik kaldırılamadı." };
  }
}
