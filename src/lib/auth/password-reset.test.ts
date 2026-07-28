import { createHash, randomBytes } from "crypto";
import { describe, expect, it } from "vitest";

import { PASSWORD_RESET_TTL_MS } from "@/lib/auth/password-reset";

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

describe("password reset token helpers", () => {
  it("hashes tokens deterministically with SHA-256", () => {
    const raw = "abc123";
    expect(hashToken(raw)).toBe(hashToken(raw));
    expect(hashToken(raw)).not.toBe(raw);
    expect(hashToken(raw)).toHaveLength(64);
  });

  it("produces different hashes for different tokens", () => {
    expect(hashToken("token-a")).not.toBe(hashToken("token-b"));
  });

  it("generates high-entropy raw tokens", () => {
    const a = randomBytes(32).toString("hex");
    const b = randomBytes(32).toString("hex");
    expect(a).toHaveLength(64);
    expect(a).not.toBe(b);
  });

  it("uses a 1-hour TTL", () => {
    expect(PASSWORD_RESET_TTL_MS).toBe(60 * 60 * 1000);
  });
});
