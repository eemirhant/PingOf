import { describe, expect, it } from "vitest";

import { toSafeInternalPath } from "@/lib/url/safe-path";

describe("toSafeInternalPath", () => {
  it("keeps relative paths", () => {
    expect(toSafeInternalPath("/matches/1")).toBe("/matches/1");
    expect(toSafeInternalPath("/login?cleared=1")).toBe("/login?cleared=1");
  });

  it("strips localhost absolute origins to path", () => {
    expect(toSafeInternalPath("http://localhost:3000/")).toBe("/");
    expect(toSafeInternalPath("http://localhost:3000/matches")).toBe("/matches");
    expect(
      toSafeInternalPath("http://127.0.0.1:3000/settings?tab=1"),
    ).toBe("/settings?tab=1");
  });

  it("strips absolute origins to path", () => {
    expect(
      toSafeInternalPath(
        "https://example.com/challenges",
      ),
    ).toBe("/challenges");
  });

  it("rejects protocol-relative and non-path values", () => {
    expect(toSafeInternalPath("//evil.example/phish")).toBe("/");
    expect(toSafeInternalPath("javascript:alert(1)")).toBe("/");
    expect(toSafeInternalPath("")).toBe("/");
  });
});
