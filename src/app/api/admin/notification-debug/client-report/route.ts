import { NextResponse } from "next/server";
import { z } from "zod";

import { requireNotificationDebugAccess } from "@/lib/notifications/diagnostics/access";
import { recordClientSubscriptionReport } from "@/lib/notifications/diagnostics/store";

const reportSchema = z.object({
  onesignalUserId: z.string().nullable().optional(),
  subscriptionId: z.string().nullable().optional(),
  pushToken: z.string().nullable().optional(),
  permission: z.string().nullable().optional(),
  optedIn: z.boolean().nullable().optional(),
  sdkInitialized: z.boolean().optional(),
  serviceWorkerRegistered: z.boolean().optional(),
  issues: z.array(z.string()).default([]),
});

export async function POST(req: Request) {
  const access = await requireNotificationDebugAccess();
  if (!access.ok) return access.response;

  const json = await req.json().catch(() => null);
  const parsed = reportSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz rapor." }, { status: 400 });
  }

  const data = parsed.data;
  recordClientSubscriptionReport({
    at: new Date().toISOString(),
    userId: access.userId,
    organizationId: access.organizationId,
    externalId: access.userId,
    onesignalUserId: data.onesignalUserId ?? null,
    subscriptionId: data.subscriptionId ?? null,
    pushToken: data.pushToken ?? null,
    permission: data.permission ?? null,
    optedIn: data.optedIn ?? null,
    sdkInitialized: data.sdkInitialized,
    serviceWorkerRegistered: data.serviceWorkerRegistered,
    issues: data.issues,
  });

  return NextResponse.json({ ok: true });
}
