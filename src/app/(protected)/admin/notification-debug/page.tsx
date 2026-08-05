import { notFound } from "next/navigation";

import { NotificationDebugClient } from "@/components/admin/notification-debug-client";
import { isNotificationDebugUiEnabled } from "@/lib/notifications/diagnostics/store";

export default function NotificationDebugPage() {
  if (!isNotificationDebugUiEnabled()) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-text-primary mb-1 text-2xl font-semibold">
        Bildirim Tanılama
      </h1>
      <p className="text-text-secondary mb-6 text-sm">
        Development-only. Push zincirini adım adım gözlemlemek için kullan.
        Mevcut iş mantığını değiştirmez.
      </p>
      <NotificationDebugClient />
    </div>
  );
}
