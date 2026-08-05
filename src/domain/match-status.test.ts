import { describe, expect, it } from "vitest";

import {
  canCancelMatch,
  canEnterResult,
  canJoinOpenSlot,
  hasMatchClockTime,
  isFutureScheduledMatch,
  isWaitingForMatchTime,
  nextOpenTeam,
  resolveMatchStatus,
} from "@/domain/match-status";

describe("resolveMatchStatus", () => {
  const now = new Date("2026-07-28T12:00:00Z");

  it("promotes PLANNED to PENDING when scheduledAt has passed", () => {
    expect(
      resolveMatchStatus("PLANNED", new Date("2026-07-28T11:00:00Z"), now),
    ).toBe("PENDING");
  });

  it("keeps PLANNED when scheduledAt is in the future", () => {
    expect(
      resolveMatchStatus("PLANNED", new Date("2026-07-28T13:00:00Z"), now),
    ).toBe("PLANNED");
  });

  it("promotes PLANNED to PENDING when scheduledAt is null (no clock time)", () => {
    expect(resolveMatchStatus("PLANNED", null, now)).toBe("PENDING");
    expect(resolveMatchStatus("PLANNED", undefined, now)).toBe("PENDING");
  });

  it("does not change COMPLETED or CANCELLED", () => {
    expect(resolveMatchStatus("COMPLETED", new Date("2026-07-28T11:00:00Z"), now)).toBe(
      "COMPLETED",
    );
    expect(resolveMatchStatus("CANCELLED", new Date("2026-07-28T11:00:00Z"), now)).toBe(
      "CANCELLED",
    );
  });
});

describe("hasMatchClockTime", () => {
  it("is true only when a real scheduledAt exists", () => {
    expect(hasMatchClockTime(new Date("2026-08-04T15:00:00Z"))).toBe(true);
    expect(hasMatchClockTime(null)).toBe(false);
    expect(hasMatchClockTime(undefined)).toBe(false);
  });
});

describe("isFutureScheduledMatch", () => {
  const now = new Date("2026-08-04T12:00:00Z");

  it("excludes past and missing schedules from upcoming", () => {
    expect(isFutureScheduledMatch(new Date("2026-08-04T11:00:00Z"), now)).toBe(false);
    expect(isFutureScheduledMatch(null, now)).toBe(false);
    expect(isFutureScheduledMatch(undefined, now)).toBe(false);
  });

  it("includes only future scheduledAt", () => {
    expect(isFutureScheduledMatch(new Date("2026-08-04T13:00:00Z"), now)).toBe(true);
  });
});

describe("canCancelMatch", () => {
  it("allows PLANNED and PENDING only", () => {
    expect(canCancelMatch("PLANNED")).toBe(true);
    expect(canCancelMatch("PENDING")).toBe(true);
    expect(canCancelMatch("COMPLETED")).toBe(false);
    expect(canCancelMatch("CANCELLED")).toBe(false);
  });
});

describe("canEnterResult", () => {
  it("allows only PENDING with full roster (not PLANNED before match time)", () => {
    expect(canEnterResult("PENDING", "SINGLES", 2)).toBe(true);
    expect(canEnterResult("PLANNED", "SINGLES", 2)).toBe(false);
    expect(canEnterResult("PLANNED", "SINGLES", 1)).toBe(false);
    expect(canEnterResult("PENDING", "DOUBLES", 4)).toBe(true);
    expect(canEnterResult("PENDING", "DOUBLES", 3)).toBe(false);
    expect(canEnterResult("COMPLETED", "SINGLES", 2)).toBe(false);
  });
});

describe("isWaitingForMatchTime", () => {
  it("is true when PLANNED and roster full", () => {
    expect(isWaitingForMatchTime("PLANNED", "SINGLES", 2)).toBe(true);
    expect(isWaitingForMatchTime("PLANNED", "SINGLES", 1)).toBe(false);
    expect(isWaitingForMatchTime("PENDING", "SINGLES", 2)).toBe(false);
  });
});

describe("canJoinOpenSlot / nextOpenTeam", () => {
  it("allows join when slot open", () => {
    expect(canJoinOpenSlot("PLANNED", "SINGLES", 1, false)).toBe(true);
    expect(canJoinOpenSlot("PLANNED", "SINGLES", 2, false)).toBe(false);
    expect(canJoinOpenSlot("PLANNED", "SINGLES", 1, true)).toBe(false);
    expect(canJoinOpenSlot("COMPLETED", "SINGLES", 1, false)).toBe(false);
  });

  it("picks team with fewer players", () => {
    expect(nextOpenTeam("SINGLES", 0, 0)).toBe(1);
    expect(nextOpenTeam("SINGLES", 1, 0)).toBe(2);
    expect(nextOpenTeam("SINGLES", 1, 1)).toBeNull();
    expect(nextOpenTeam("DOUBLES", 2, 1)).toBe(2);
  });
});
