/**
 * Notification pipeline diagnostic types (dev observability).
 * Does not change delivery semantics.
 */

export type DiagStepStatus = "ok" | "fail" | "skip" | "info";

export type DiagStepName =
  | "event_created"
  | "notification_created"
  | "preferences_checked"
  | "db_saved"
  | "push_subscription_lookup"
  | "push_sent";

export type NotificationDiagStep = {
  name: DiagStepName | string;
  status: DiagStepStatus;
  at: string;
  message: string;
  detail?: unknown;
  reasonCode?: string;
};

export type NotificationDiagTrace = {
  id: string;
  startedAt: string;
  updatedAt: string;
  eventType: string;
  title: string;
  body: string;
  organizationId?: string | null;
  senderUserId?: string | null;
  recipientUserIds: string[];
  inAppRecipients: string[];
  pushRecipients: string[];
  steps: NotificationDiagStep[];
  pushSent: boolean;
  success: boolean;
  failureReasons: string[];
};

export type NotificationDiagEvent = {
  id: string;
  at: string;
  eventName: string;
  senderUserId?: string | null;
  recipientUserIds: string[];
  organizationId?: string | null;
  notificationType: string;
  pushSent: boolean | null;
  traceId?: string | null;
  meta?: unknown;
};
