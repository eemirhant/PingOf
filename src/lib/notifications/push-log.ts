/**
 * Structured push delivery logs (stable event names for log filters).
 */

type LogData = Record<string, unknown>;

function emit(
  level: "info" | "warn" | "error",
  event: string,
  data?: LogData,
): void {
  const payload = { event, ...(data ?? {}), at: new Date().toISOString() };
  if (level === "error") {
    console.error("[push]", payload);
  } else if (level === "warn") {
    console.warn("[push]", payload);
  } else {
    console.info("[push]", payload);
  }
}

export const pushLog = {
  requested(data?: LogData) {
    emit("info", "push_requested", data);
  },
  sent(data?: LogData) {
    emit("info", "push_sent", data);
  },
  failed(data?: LogData) {
    emit("error", "push_failed", data);
  },
  invalidTokenRemoved(data?: LogData) {
    emit("warn", "invalid_token_removed", data);
  },
  tokenRefreshed(data?: LogData) {
    emit("info", "token_refreshed", data);
  },
  deviceRegistered(data?: LogData) {
    emit("info", "device_registered", data);
  },
  deviceDeactivated(data?: LogData) {
    emit("info", "device_deactivated", data);
  },
  skipped(data?: LogData) {
    emit("info", "push_skipped", data);
  },
  opened(data?: LogData) {
    emit("info", "push_opened", data);
  },
  notificationClicked(data?: LogData) {
    emit("info", "notification_clicked", data);
  },
  navigation(data?: LogData) {
    emit("info", "notification_navigation", data);
  },
  markRead(data?: LogData) {
    emit("info", "notification_mark_read", data);
  },
  deepLinkFailed(data?: LogData) {
    emit("error", "deep_link_failed", data);
  },
};
