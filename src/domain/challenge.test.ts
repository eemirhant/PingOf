import { describe, expect, it } from "vitest";

import { CHALLENGE_EXPIRY_DAYS } from "@/domain/constants";
import {
  canCancelChallenge,
  canRespondToChallenge,
  challengeExpiresAt,
  challengeStatusLabel,
  isChallengeExpired,
  resolveChallengeMatchScheduledAt,
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

  it("does not change ACCEPTED/DECLINED/CANCELLED", () => {
    const now = new Date("2026-08-01T12:00:00Z");
    expect(resolveChallengeStatus("ACCEPTED", created, now)).toBe("ACCEPTED");
    expect(resolveChallengeStatus("DECLINED", created, now)).toBe("DECLINED");
    expect(resolveChallengeStatus("CANCELLED", created, now)).toBe("CANCELLED");
    expect(canRespondToChallenge("ACCEPTED", created, now)).toBe(false);
    expect(canRespondToChallenge("CANCELLED", created, now)).toBe(false);
  });

  it("computes expiresAt", () => {
    expect(challengeExpiresAt(created).toISOString()).toBe("2026-07-08T12:00:00.000Z");
  });
});

describe("resolveChallengeMatchScheduledAt", () => {
  const now = new Date("2026-08-04T12:00:00Z");

  it("returns null when proposedAt is missing", () => {
    expect(resolveChallengeMatchScheduledAt(null, now)).toBeNull();
    expect(resolveChallengeMatchScheduledAt(undefined, now)).toBeNull();
  });

  it("returns null when proposedAt is in the past (no default time)", () => {
    expect(
      resolveChallengeMatchScheduledAt(new Date("2026-08-04T11:00:00Z"), now),
    ).toBeNull();
  });

  it("keeps a future proposedAt as scheduledAt", () => {
    const proposed = new Date("2026-08-04T15:30:00Z");
    expect(resolveChallengeMatchScheduledAt(proposed, now)).toEqual(proposed);
  });

  it("never invents +1 hour or midnight defaults", () => {
    expect(resolveChallengeMatchScheduledAt(null, now)).toBeNull();
    expect(resolveChallengeMatchScheduledAt(null, now)?.getHours()).toBeUndefined();
  });
});

describe("canCancelChallenge", () => {
  const created = new Date("2026-07-01T12:00:00Z");
  const sender = "user-sender";
  const receiver = "user-receiver";

  it("allows sender to cancel a pending challenge", () => {
    const now = new Date("2026-07-02T12:00:00Z");
    expect(canCancelChallenge("PENDING", created, sender, sender, now)).toBe(true);
  });

  it("blocks recipient and other users", () => {
    const now = new Date("2026-07-02T12:00:00Z");
    expect(canCancelChallenge("PENDING", created, receiver, sender, now)).toBe(false);
    expect(canCancelChallenge("PENDING", created, "someone-else", sender, now)).toBe(
      false,
    );
  });

  it("blocks non-pending statuses", () => {
    const now = new Date("2026-07-02T12:00:00Z");
    for (const status of ["ACCEPTED", "DECLINED", "EXPIRED", "CANCELLED"] as const) {
      expect(canCancelChallenge(status, created, sender, sender, now)).toBe(false);
    }
  });

  it("blocks expired pending challenges", () => {
    const now = new Date("2026-07-08T12:00:00Z");
    expect(canCancelChallenge("PENDING", created, sender, sender, now)).toBe(false);
  });

  it("labels cancelled challenges in Turkish", () => {
    expect(challengeStatusLabel("CANCELLED")).toBe("İptal edildi");
  });

  it("labels declined challenges as Kabul edilmedi", () => {
    expect(challengeStatusLabel("DECLINED")).toBe("Kabul edilmedi");
  });
});
