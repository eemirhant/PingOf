import { NextResponse } from "next/server";

import {
  getFirebaseVapidKey,
  getFirebaseWebConfig,
  isFirebaseWebConfigured,
} from "@/lib/firebase/config";

export const runtime = "nodejs";

/** Public Firebase web config for the client (no secrets). */
export async function GET() {
  if (!isFirebaseWebConfigured()) {
    return NextResponse.json(
      { configured: false },
      { status: 200 },
    );
  }

  return NextResponse.json({
    configured: true,
    config: getFirebaseWebConfig(),
    vapidKey: getFirebaseVapidKey(),
  });
}
