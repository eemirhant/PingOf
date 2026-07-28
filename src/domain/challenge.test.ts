import { describe, expect, it } from "vitest";

import { CHALLENGE_EXPIRY_DAYS } from "@/domain/constants";
import {
  canRespondToChallenge,
  challengeExpiresAt,
  isChallengeExpired,
  resolveChallengeStatus,
} from "@/domain/challenge";

describe("challenge expiry", () => {
  const created = new Date("2026-07-01T12:00:00Z");

  it("exposes 7 day constant", () => {
    expect(CHALLENGE_EXPIRY_DAYS).toBe(7);
  });

  it("is not expired before 7 days", () => {
    const now = new Date("2026-07-08T11:59:00Z");
    expect(isChallengeExpired(created, now)).toBe(false);
    expect(canRespondToChallenge("PENDING", created, now)).toBe(true);
  });

  it("is expired at or after 7 days", () => {
    const now = new Date("2026-07-08T12:00:00Z");
    expect(isChallengeExpired(created, now)).toBe(true);
    expect(canRespondToChallenge("PENDING", created, now)).toBe(false);
    expect(resolveChallengeStatus("PENDING", created, now)).toBe("EXPIRED");
  });

  it("does not change ACCEPTED/DECLINED", () => {
    const now = new Date("2026-08-01T12:00:00Z");
    expect(resolveChallengeStatus("ACCEPTED", created, now)).toBe("ACCEPTED");
    expect(resolveChallengeStatus("DECLINED", created, now)).toBe("DECLINED");
    expect(canRespondToChallenge("ACCEPTED", created, now)).toBe(false);
  });

  it("computes expiresAt", () => {
    expect(challengeExpiresAt(created).toISOString()).toBe("2026-07-08T12:00:00.000Z");
  });
});
