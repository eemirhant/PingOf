import { describe, expect, it } from "vitest";

import { pushSubscriptionSchema } from "@/lib/validations/push";

const valid = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
  keys: {
    p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpDtUbVlUc_-aGRSPQBuNpT5vIEeDfnpa1yVzoOMPvq2Uw",
    auth: "tBHItJI5svbpez7KI4CCXg",
  },
};

describe("pushSubscriptionSchema", () => {
  it("accepts a valid PushSubscription payload", () => {
    const result = pushSubscriptionSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects a non-URL endpoint", () => {
    const result = pushSubscriptionSchema.safeParse({
      ...valid,
      endpoint: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing p256dh", () => {
    const result = pushSubscriptionSchema.safeParse({
      endpoint: valid.endpoint,
      keys: { auth: valid.keys.auth },
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty auth", () => {
    const result = pushSubscriptionSchema.safeParse({
      ...valid,
      keys: { ...valid.keys, auth: "" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing keys object", () => {
    const result = pushSubscriptionSchema.safeParse({
      endpoint: valid.endpoint,
    });
    expect(result.success).toBe(false);
  });
});
