import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  deactivateDeviceToken,
  registerDeviceToken,
} from "@/lib/notifications/device-tokens";
import {
  deactivateDeviceTokenSchema,
  registerDeviceTokenSchema,
} from "@/lib/validations/push";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const parsed = registerDeviceTokenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz cihaz bilgisi" },
      { status: 400 },
    );
  }

  try {
    const result = await registerDeviceToken({
      userId: session.user.id,
      organizationId: session.user.organizationId,
      deviceId: parsed.data.deviceId,
      fcmToken: parsed.data.fcmToken,
      platform: parsed.data.platform,
      browser: parsed.data.browser,
      deviceName: parsed.data.deviceName,
    });

    return NextResponse.json({
      ok: true,
      id: result.id,
      refreshed: result.refreshed,
    });
  } catch (error) {
    console.error("[push/register]", error);
    return NextResponse.json(
      { error: "Cihaz kaydı başarısız" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = deactivateDeviceTokenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz istek" },
      { status: 400 },
    );
  }

  try {
    const count = await deactivateDeviceToken({
      userId: session.user.id,
      organizationId: session.user.organizationId,
      deviceId: parsed.data.deviceId,
      fcmToken: parsed.data.fcmToken,
    });
    return NextResponse.json({ ok: true, count });
  } catch (error) {
    console.error("[push/register DELETE]", error);
    return NextResponse.json(
      { error: "Cihaz kaydı kapatılamadı" },
      { status: 500 },
    );
  }
}
