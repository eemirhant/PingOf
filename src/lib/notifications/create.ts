import { prisma } from "@/lib/db";
import { getPublicAppUrl } from "@/lib/dev/public-url";
import { hasMatchClockTime } from "@/domain/match-status";
import { allowsInApp, allowsPush } from "@/domain/notification-preferences";
import { RealtimeEventType } from "@/domain/realtime";
import {
  appendDiagStep,
  getAlsContext,
  isNotificationDiagVerbose,
  notificationDiagAls,
  recordDiagEvent,
  startNotificationTrace,
  updateTrace,
} from "@/lib/notifications/diagnostics/store";
import { sendPushToUsers } from "@/lib/notifications/push";
import { getResolvedNotificationSettingsForUsers } from "@/lib/notifications/preferences";
import { pushDebug, pushDebugError } from "@/lib/notifications/push-debug";
import { publishOrgEvent } from "@/lib/realtime/publish";

export type CreateNotificationInput = {
  userIds: string[];
  type: string;
  title: string;
  body: string;
  linkUrl?: string | null;
  entityId?: string | null;
  organizationId?: string | null;
  image?: string | null;
};

function toAbsoluteAppUrl(pathOrUrl: string | null | undefined): string {
  const base = getPublicAppUrl();
  const raw = (pathOrUrl ?? "/notifications").trim() || "/notifications";
  try {
    if (/^https?:\/\//i.test(raw)) return raw;
    const path = raw.startsWith("/") ? raw : `/${raw}`;
    return new URL(path, `${base}/`).toString();
  } catch {
    return `${base}/notifications`;
  }
}

/**
 * Time-based match reminders (e.g. "starts in 30 minutes") require a real clock time.
 * Call this before scheduling any reminder — never invent 00:00 / now+1h defaults.
 */
export function canCreateMatchTimeReminder(
  scheduledAt: Date | null | undefined,
): boolean {
  return hasMatchClockTime(scheduledAt);
}

/**
 * Central notification service:
 * 1) Preference filter (in-app / push + DND)
 * 2) Persist in-app Notification rows
 * 3) Publish realtime NOTIFICATION event (badge / list refresh)
 * 4) Deliver push via abstracted provider (FCM)
 *
 * Diagnostic steps are recorded in development (or when a debug ALS context exists).
 */
export async function createNotificationsForUsers(
  input: CreateNotificationInput,
): Promise<number> {
  const uniqueIds = [...new Set(input.userIds.filter(Boolean))];

  pushDebug("Event tetiklendi", {
    type: input.type,
    title: input.title,
    body: input.body,
    linkUrl: input.linkUrl ?? null,
    requestedUserIds: input.userIds,
    uniqueTargetUserIds: uniqueIds,
    targetExternalIds: uniqueIds,
  });

  if (uniqueIds.length === 0) {
    pushDebug("Bildirim oluşturulmadı — hedef kullanıcı yok", {
      type: input.type,
    });
    return 0;
  }

  const existingAls = getAlsContext();
  const shouldDiag = Boolean(existingAls?.traceId) || isNotificationDiagVerbose();

  const run = async (): Promise<number> => {
    const trace = shouldDiag
      ? startNotificationTrace({
          eventType: input.type,
          title: input.title,
          body: input.body,
          recipientUserIds: uniqueIds,
        })
      : null;
    const traceId = trace?.id;

    if (traceId) {
      appendDiagStep(traceId, {
        name: "event_created",
        status: "ok",
        message: `Event: ${input.type}`,
        detail: { type: input.type, recipientCount: uniqueIds.length },
      });
      appendDiagStep(traceId, {
        name: "notification_created",
        status: "ok",
        message: "Notification payload hazırlandı",
        detail: {
          title: input.title,
          body: input.body,
          linkUrl: input.linkUrl,
        },
      });
    }

    const settingsByUser =
      await getResolvedNotificationSettingsForUsers(uniqueIds);

    const inAppRecipients = uniqueIds.filter((userId) => {
      const settings = settingsByUser.get(userId);
      if (!settings) return true;
      return allowsInApp(settings.preferences, input.type);
    });

    const pushRecipients = uniqueIds.filter((userId) => {
      const settings = settingsByUser.get(userId);
      if (!settings) return true;
      return allowsPush(settings.preferences, input.type);
    });

    const skippedInApp = uniqueIds.filter(
      (id) => !inAppRecipients.includes(id),
    );
    const skippedPush = uniqueIds.filter((id) => !pushRecipients.includes(id));

    pushDebug("Tercih filtresi uygulandı", {
      type: input.type,
      targetUserIds: uniqueIds,
      targetExternalIds: uniqueIds,
      inAppRecipients,
      pushRecipients,
      skippedInApp,
      skippedPush,
      perUser: uniqueIds.map((userId) => {
        const settings = settingsByUser.get(userId);
        return {
          userId,
          externalId: userId,
          inApp: !settings || allowsInApp(settings.preferences, input.type),
          push: !settings || allowsPush(settings.preferences, input.type),
        };
      }),
    });

    if (traceId) {
      updateTrace(traceId, { inAppRecipients, pushRecipients });
      appendDiagStep(traceId, {
        name: "preferences_checked",
        status:
          skippedPush.length > 0 && pushRecipients.length === 0 ? "skip" : "ok",
        message: `In-app: ${inAppRecipients.length}, Push: ${pushRecipients.length}`,
        reasonCode:
          skippedPush.length > 0
            ? "Kullanıcının bildirimi kapalı"
            : undefined,
        detail: {
          inAppRecipients,
          pushRecipients,
          skippedInApp,
          skippedPush,
          perUser: uniqueIds.map((userId) => {
            const settings = settingsByUser.get(userId);
            return {
              userId,
              inApp:
                !settings || allowsInApp(settings.preferences, input.type),
              push:
                !settings || allowsPush(settings.preferences, input.type),
            };
          }),
        },
      });
    }

    let count = 0;
    let resolvedOrganizationId = input.organizationId ?? null;

    if (inAppRecipients.length > 0) {
      const result = await prisma.notification.createMany({
        data: inAppRecipients.map((userId) => ({
          userId,
          type: input.type,
          title: input.title,
          body: input.body,
          linkUrl: input.linkUrl ?? null,
          isRead: false,
        })),
      });
      count = result.count;

      pushDebug("Bildirim oluşturuldu (DB)", {
        type: input.type,
        createdCount: count,
        targetUserIds: inAppRecipients,
        targetExternalIds: inAppRecipients,
        title: input.title,
        body: input.body,
        linkUrl: input.linkUrl ?? null,
      });

      if (traceId) {
        appendDiagStep(traceId, {
          name: "db_saved",
          status: "ok",
          message: `${count} bildirim DB'ye yazıldı`,
          detail: { count, userIds: inAppRecipients },
        });
      }

      const firstUser = await prisma.user.findFirst({
        where: { id: inAppRecipients[0] },
        select: { organizationId: true },
      });
      if (firstUser) {
        resolvedOrganizationId =
          resolvedOrganizationId ?? firstUser.organizationId;
        if (traceId) {
          updateTrace(traceId, { organizationId: firstUser.organizationId });
        }
        await publishOrgEvent(
          firstUser.organizationId,
          RealtimeEventType.NOTIFICATION,
          {
            entityId: input.entityId ?? inAppRecipients[0],
          },
        );
      }
    } else {
      pushDebug("Bildirim oluşturulmadı (DB) — in-app alıcı yok", {
        type: input.type,
        skippedInApp,
      });
      if (traceId) {
        appendDiagStep(traceId, {
          name: "db_saved",
          status: "skip",
          message: "In-app alıcı yok — DB yazılmadı",
          reasonCode: "Kullanıcının bildirimi kapalı",
        });
      }
    }

    if (
      !resolvedOrganizationId &&
      (pushRecipients[0] ?? uniqueIds[0])
    ) {
      const orgUser = await prisma.user.findFirst({
        where: { id: pushRecipients[0] ?? uniqueIds[0] },
        select: { organizationId: true },
      });
      resolvedOrganizationId = orgUser?.organizationId ?? null;
    }

    if (pushRecipients.length > 0) {
      const absoluteUrl = toAbsoluteAppUrl(input.linkUrl);
      const absoluteIcon = toAbsoluteAppUrl("/icons/icon-192.png");
      const absoluteImage = input.image
        ? toAbsoluteAppUrl(input.image)
        : undefined;

      console.info("[push-diag] Tercih sonrası push alıcıları", {
        type: input.type,
        pushRecipients,
        skippedPush,
      });

      pushDebug("Push gönderimi çağrılacak", {
        type: input.type,
        targetUserIds: pushRecipients,
        targetExternalIds: pushRecipients,
        title: input.title,
        body: input.body,
        url: absoluteUrl,
        tag: `pingof-${input.type}`,
      });

      try {
        const pushResult = await sendPushToUsers(pushRecipients, {
          title: input.title,
          body: input.body,
          url: absoluteUrl,
          tag: `pingof-${input.type}`,
          notificationType: input.type,
          icon: absoluteIcon,
          badge: absoluteIcon,
          image: absoluteImage,
          entityId: input.entityId ?? null,
          organizationId: resolvedOrganizationId,
          priority: "high",
        });

        pushDebug("Push gönderim tamamlandı", {
          type: input.type,
          targetUserIds: pushRecipients,
          targetExternalIds: pushRecipients,
          sentBatches: pushResult.sentBatches,
          skipped: pushResult.skipped,
        });

        if (traceId) {
          appendDiagStep(traceId, {
            name: "push_sent",
            status: pushResult.skipped ? "skip" : "ok",
            message: pushResult.skipped
              ? "Push altyapısı henüz yapılandırılmamış (FCM bekleniyor)"
              : `Push gönderildi (${pushResult.sentBatches} batch)`,
            detail: {
              sentBatches: pushResult.sentBatches,
              skipped: pushResult.skipped,
            },
          });
          updateTrace(traceId, {
            pushSent: pushResult.sentBatches > 0 && !pushResult.skipped,
            success:
              count > 0 || (pushResult.sentBatches > 0 && !pushResult.skipped),
          });
        }
      } catch (error) {
        pushDebugError("Push gönderim hatası", error, {
          type: input.type,
          targetUserIds: pushRecipients,
          targetExternalIds: pushRecipients,
        });
        console.error("[push] batch send error", error);
        if (traceId) {
          appendDiagStep(traceId, {
            name: "push_sent",
            status: "fail",
            message: "Push gönderim hatası",
            reasonCode: "Push API hatası",
            detail: {
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : null,
            },
          });
        }
      }
    } else {
      console.info("[push-diag] Push alıcı yok — tercih veya boş liste", {
        type: input.type,
        targetUserIds: uniqueIds,
        skippedPush,
        reason:
          skippedPush.length > 0
            ? "Kullanıcı push tercihi kapalı veya DND"
            : "Hedef kullanıcı yok",
      });
      pushDebug("Push gönderilmedi — push alıcı yok", {
        type: input.type,
        skippedPush,
        reason: "preference_or_empty",
      });
      if (traceId) {
        appendDiagStep(traceId, {
          name: "push_sent",
          status: "skip",
          message: "Push alıcı yok — gönderici çağrılmadı",
          reasonCode: "Kullanıcının bildirimi kapalı",
        });
        updateTrace(traceId, {
          pushSent: false,
          success: count > 0,
        });
      }
    }

    if (traceId) {
      recordDiagEvent({
        eventName: input.type,
        notificationType: input.type,
        recipientUserIds: uniqueIds,
        organizationId: trace?.organizationId,
        pushSent: pushRecipients.length > 0 ? null : false,
        traceId,
        meta: { title: input.title },
      });
    }

    return count;
  };

  if (shouldDiag && !existingAls?.traceId) {
    const trace = startNotificationTrace({
      eventType: input.type,
      title: input.title,
      body: input.body,
      recipientUserIds: uniqueIds,
    });
    return notificationDiagAls.run({ traceId: trace.id }, run);
  }

  return run();
}
