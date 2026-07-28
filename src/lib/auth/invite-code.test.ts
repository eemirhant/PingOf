import { describe, expect, it } from "vitest";

import { generateInviteCode } from "@/lib/auth/invite-code";

describe("generateInviteCode", () => {
  it("returns an 8-character alphanumeric code", () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[A-Za-z0-9]+$/);
  });

  it("avoids ambiguous characters (0, O, 1, I, l)", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateInviteCode();
      expect(code).not.toMatch(/[01OIl]/);
    }
  });

  it("produces varying codes", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateInviteCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});
