import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { sendMatchRemindersForOrganization } from "@/lib/notifications/match-reminders";

export const runtime = "nodejs";

/**
 * Cron-friendly match reminder endpoint.
 * Protect with CRON_SECRET header when configured.
 */
export async function GET(request: Request) {
  console.log("[Runtime Info]", {
    runtime: process.env.NEXT_RUNTIME,
    nodeEnv: process.env.NODE_ENV,
    apiKeyExists: !!process.env.ONESIGNAL_REST_API_KEY,
  });

  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
  }

  const orgs = await prisma.organization.findMany({ select: { id: true } });
  let total = 0;
  for (const org of orgs) {
    total += await sendMatchRemindersForOrganization(org.id);
  }

  return NextResponse.json({ ok: true, sent: total });
}
