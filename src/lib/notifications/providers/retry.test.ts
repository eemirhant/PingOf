import { describe, expect, it, vi } from "vitest";

import {
  isFcmPayloadValidationError,
  isInvalidFcmTokenError,
  withExponentialBackoff,
} from "@/lib/notifications/providers/retry";

describe("withExponentialBackoff", () => {
  it("returns on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(withExponentialBackoff(fn, { maxAttempts: 3 })).resolves.toBe(
      "ok",
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries transient failures then succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("boom"), { code: "UNAVAILABLE" }))
      .mockResolvedValueOnce("ok");

    await expect(
      withExponentialBackoff(fn, { maxAttempts: 3, baseDelayMs: 1 }),
    ).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-transient errors", async () => {
    const fn = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error("bad"), {
          code: "messaging/invalid-registration-token",
        }),
      );

    await expect(
      withExponentialBackoff(fn, { maxAttempts: 3, baseDelayMs: 1 }),
    ).rejects.toThrow("bad");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("isInvalidFcmTokenError", () => {
  it("detects registration-token-not-registered", () => {
    expect(
      isInvalidFcmTokenError(
        Object.assign(new Error("gone"), {
          code: "messaging/registration-token-not-registered",
        }),
      ),
    ).toBe(true);
  });

  it("does not treat invalid-argument as a dead token", () => {
    expect(
      isInvalidFcmTokenError(
        Object.assign(new Error("bad payload"), {
          code: "messaging/invalid-argument",
        }),
      ),
    ).toBe(false);
  });

  it("returns false for unrelated errors", () => {
    expect(isInvalidFcmTokenError(new Error("network"))).toBe(false);
  });
});

describe("isFcmPayloadValidationError", () => {
  it("detects invalid-argument", () => {
    expect(
      isFcmPayloadValidationError(
        Object.assign(new Error("bad"), {
          code: "messaging/invalid-argument",
        }),
      ),
    ).toBe(true);
  });
});
