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
  | "onesignal_user_lookup"
  | "push_subscription_lookup"
  | "onesignal_api_called"
  | "onesignal_api_response"
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
  onesignal?: {
    statusCode?: number;
    requestBody?: unknown;
    responseBody?: unknown;
    errorMessage?: string | null;
    durationMs?: number;
    notificationId?: string | null;
  };
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

export type ClientSubscriptionReport = {
  at: string;
  userId: string;
  organizationId: string;
  externalId: string;
  onesignalUserId?: string | null;
  subscriptionId?: string | null;
  pushToken?: string | null;
  permission?: string | null;
  optedIn?: boolean | null;
  sdkInitialized?: boolean;
  serviceWorkerRegistered?: boolean;
  issues: string[];
};
