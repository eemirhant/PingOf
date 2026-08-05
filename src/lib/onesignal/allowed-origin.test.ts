import { describe, expect, it } from "vitest";

import {
  describeAllowedOneSignalOrigins,
  extractConfiguredSiteUrl,
  isAllowedOneSignalOrigin,
  isWrongSiteUrlError,
} from "@/lib/onesignal/allowed-origin";

describe("isAllowedOneSignalOrigin (development)", () => {
  const prevEnv = process.env.NEXT_PUBLIC_ENVIRONMENT;

  it("allows localhost origins", () => {
    process.env.NEXT_PUBLIC_ENVIRONMENT = "development";
    expect(isAllowedOneSignalOrigin("http://localhost:3000")).toBe(true);
    expect(isAllowedOneSignalOrigin("http://127.0.0.1:3000")).toBe(true);
    expect(isAllowedOneSignalOrigin("https://random.example.com")).toBe(false);
    process.env.NEXT_PUBLIC_ENVIRONMENT = prevEnv;
  });

  it("describes allowed origins", () => {
    process.env.NEXT_PUBLIC_ENVIRONMENT = "development";
    expect(describeAllowedOneSignalOrigins()).toContain("localhost");
    process.env.NEXT_PUBLIC_ENVIRONMENT = prevEnv;
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
