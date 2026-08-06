import "server-only";

import { isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { FirebasePushProvider } from "@/lib/notifications/providers/firebase-push-provider";
import type { PushProvider } from "@/lib/notifications/providers/types";

export type {
  PushNotificationPayload,
  PushProvider,
  PushSendResult,
  PushPriority,
} from "@/lib/notifications/providers/types";

export { FirebasePushProvider } from "@/lib/notifications/providers/firebase-push-provider";

/**
 * Resolve the active push provider.
 * Swap/add providers here without touching createNotificationsForUsers.
 */
export function getPushProvider(): PushProvider | null {
  if (!isFirebaseAdminConfigured()) {
    return null;
  }
  return new FirebasePushProvider();
}
