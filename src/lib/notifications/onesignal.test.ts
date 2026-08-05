import { describe, expect, it } from "vitest";

import { isOneSignalConfigured } from "@/lib/notifications/onesignal";

describe("OneSignal provider config", () => {
  it("reports not configured without env", () => {
    const prevApp = process.env.ONESIGNAL_APP_ID;
    const prevPublic = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    const prevKey = process.env.ONESIGNAL_REST_API_KEY;
    delete process.env.ONESIGNAL_APP_ID;
    delete process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    delete process.env.ONESIGNAL_REST_API_KEY;

    expect(isOneSignalConfigured()).toBe(false);

    if (prevApp !== undefined) process.env.ONESIGNAL_APP_ID = prevApp;
    if (prevPublic !== undefined) process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID = prevPublic;
    if (prevKey !== undefined) process.env.ONESIGNAL_REST_API_KEY = prevKey;
  });
});
