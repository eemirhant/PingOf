import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

import type {
  NotificationDiagEvent,
  NotificationDiagStep,
  NotificationDiagTrace,
} from "@/lib/notifications/diagnostics/types";

const MAX_TRACES = 50;
const MAX_EVENTS = 100;

type AlsContext = {
  traceId: string;
  /** When true, createNotifications awaits push delivery (debug tests only). */
  awaitPush?: boolean;
};

type GlobalDiagState = {
  traces: NotificationDiagTrace[];
  events: NotificationDiagEvent[];
};

const g = globalThis as typeof globalThis & {
  __pingofNotificationDiag?: GlobalDiagState;
};

function state(): GlobalDiagState {
  if (!g.__pingofNotificationDiag) {
    g.__pingofNotificationDiag = {
      traces: [],
      events: [],
    };
  }
  return g.__pingofNotificationDiag;
}

export const notificationDiagAls = new AsyncLocalStorage<AlsContext>();

export function isNotificationDiagVerbose(): boolean {
  return process.env.NODE_ENV === "development";
}

function consoleDiag(
  level: "debug" | "info" | "warn" | "error",
  message: string,
  detail?: unknown,
): void {
  const verbose = isNotificationDiagVerbose();
  if (!verbose && level !== "error" && level !== "warn") return;

  const prefix = "[notif-diag]";
  if (level === "error") {
    console.error(prefix, message, detail ?? "");
  } else if (level === "warn") {
    console.warn(prefix, message, detail ?? "");
  } else if (verbose) {
    console.info(prefix, message, detail ?? "");
  }
}

export function getAlsContext(): AlsContext | undefined {
  return notificationDiagAls.getStore();
}

export function startNotificationTrace(input: {
  eventType: string;
  title: string;
  body: string;
  recipientUserIds: string[];
  organizationId?: string | null;
  senderUserId?: string | null;
}): NotificationDiagTrace {
  const existingId = notificationDiagAls.getStore()?.traceId;
  const s = state();

  if (existingId) {
    const existing = s.traces.find((t) => t.id === existingId);
    if (existing) {
      existing.updatedAt = new Date().toISOString();
      if (!existing.eventType) existing.eventType = input.eventType;
      if (input.organizationId) existing.organizationId = input.organizationId;
      if (input.senderUserId) existing.senderUserId = input.senderUserId;
      return existing;
    }
  }

  const id = existingId ?? randomUUID();
  const now = new Date().toISOString();
  const trace: NotificationDiagTrace = {
    id,
    startedAt: now,
    updatedAt: now,
    eventType: input.eventType,
    title: input.title,
    body: input.body,
    organizationId: input.organizationId ?? null,
    senderUserId: input.senderUserId ?? null,
    recipientUserIds: [...input.recipientUserIds],
    inAppRecipients: [],
    pushRecipients: [],
    steps: [],
    pushSent: false,
    success: false,
    failureReasons: [],
  };

  s.traces.unshift(trace);
  if (s.traces.length > MAX_TRACES) s.traces.length = MAX_TRACES;

  consoleDiag("info", `trace start ${id}`, {
    eventType: input.eventType,
    recipients: input.recipientUserIds.length,
  });
  return trace;
}

export function getTrace(traceId: string): NotificationDiagTrace | undefined {
  return state().traces.find((t) => t.id === traceId);
}

export function getRecentTraces(limit = 50): NotificationDiagTrace[] {
  return state().traces.slice(0, limit);
}

export function appendDiagStep(
  traceId: string,
  step: Omit<NotificationDiagStep, "at"> & { at?: string },
): void {
  const trace = getTrace(traceId);
  if (!trace) return;

  const full: NotificationDiagStep = {
    ...step,
    at: step.at ?? new Date().toISOString(),
  };
  trace.steps.push(full);
  trace.updatedAt = full.at;

  if (step.status === "fail" && step.message) {
    if (!trace.failureReasons.includes(step.message)) {
      trace.failureReasons.push(step.message);
    }
    if (step.reasonCode && !trace.failureReasons.includes(step.reasonCode)) {
      trace.failureReasons.push(step.reasonCode);
    }
  }

  const level =
    step.status === "fail" ? "error" : step.status === "skip" ? "warn" : "info";
  consoleDiag(level, `${traceId.slice(0, 8)} ${step.name}: ${step.status}`, {
    message: step.message,
    reasonCode: step.reasonCode,
    detail: step.detail,
  });
}

export function updateTrace(
  traceId: string,
  patch: Partial<
    Pick<
      NotificationDiagTrace,
      | "inAppRecipients"
      | "pushRecipients"
      | "pushSent"
      | "success"
      | "organizationId"
      | "failureReasons"
    >
  >,
): void {
  const trace = getTrace(traceId);
  if (!trace) return;
  Object.assign(trace, patch);
  trace.updatedAt = new Date().toISOString();
}

export function recordDiagEvent(
  event: Omit<NotificationDiagEvent, "id" | "at"> & { at?: string },
): NotificationDiagEvent {
  const full: NotificationDiagEvent = {
    id: randomUUID(),
    at: event.at ?? new Date().toISOString(),
    eventName: event.eventName,
    senderUserId: event.senderUserId ?? null,
    recipientUserIds: event.recipientUserIds,
    organizationId: event.organizationId ?? null,
    notificationType: event.notificationType,
    pushSent: event.pushSent,
    traceId: event.traceId ?? null,
    meta: event.meta,
  };
  const s = state();
  s.events.unshift(full);
  if (s.events.length > MAX_EVENTS) s.events.length = MAX_EVENTS;
  consoleDiag("info", `event ${full.eventName}`, {
    type: full.notificationType,
    recipients: full.recipientUserIds,
    pushSent: full.pushSent,
  });
  return full;
}

export function getRecentEvents(limit = 50): NotificationDiagEvent[] {
  return state().events.slice(0, limit);
}

export async function runWithNotificationTrace<T>(
  options: {
    eventType: string;
    title: string;
    body: string;
    recipientUserIds: string[];
    organizationId?: string | null;
    senderUserId?: string | null;
    awaitPush?: boolean;
  },
  fn: () => Promise<T>,
): Promise<{ result: T; traceId: string }> {
  const trace = startNotificationTrace(options);
  const result = await notificationDiagAls.run(
    { traceId: trace.id, awaitPush: options.awaitPush === true },
    fn,
  );
  return { result, traceId: trace.id };
}
