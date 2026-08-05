import { describe, expect, it } from "vitest";

import {
  describeAllowedOneSignalOrigins,
  extractConfiguredSiteUrl,
  isAllowedOneSignalOrigin,
  isWrongSiteUrlError,
} from "@/lib/onesignal/allowed-origin";

describe("isAllowedOneSignalOrigin", () => {
  it("allows localhost and Vercel preview hosts", () => {
    expect(isAllowedOneSignalOrigin("http://localhost:3000")).toBe(true);
    expect(isAllowedOneSignalOrigin("http://127.0.0.1:3000")).toBe(true);
    expect(
      isAllowedOneSignalOrigin("https://ping-ljs8k2ehw-emirhan12.vercel.app"),
    ).toBe(true);
    expect(isAllowedOneSignalOrigin("https://random.example.com")).toBe(true);
  });

  it("describes allowed origins", () => {
    expect(describeAllowedOneSignalOrigins()).toContain("vercel.app");
  });
});

describe("wrong-site-url helpers", () => {
  it("detects Can only be used on errors", () => {
    expect(
      isWrongSiteUrlError(new Error("Can only be used on: http://localhost:3000")),
    ).toBe(true);
    expect(
      extractConfiguredSiteUrl(
        new Error("Can only be used on: http://localhost:3000"),
      ),
    ).toBe("http://localhost:3000");
  });
});
