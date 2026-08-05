import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { isNotificationDebugUiEnabled } from "@/lib/notifications/diagnostics/store";

/** Dev-only gate for notification diagnostic routes. */
export async function requireNotificationDebugAccess(): Promise<
  | { ok: true; userId: string; organizationId: string; role: string }
  | { ok: false; response: NextResponse }
> {
  if (!isNotificationDebugUiEnabled()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Yalnızca development ortamında kullanılabilir." },
        { status: 404 },
      ),
    };
  }

  const session = await auth();
  if (!session?.user?.id || !session.user.organizationId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Oturum gerekli." }, { status: 401 }),
    };
  }

  return {
    ok: true,
    userId: session.user.id,
    organizationId: session.user.organizationId,
    role: session.user.role,
  };
}
