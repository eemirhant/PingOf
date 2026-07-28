import { describe, expect, it } from "vitest";

import {
  endOfMonth,
  endOfToday,
  endOfWeek,
  getMatchTimeRange,
  startOfMonth,
  startOfToday,
  startOfWeek,
  zonedMidnight,
} from "@/domain/match-time-filter";

const TZ = "Europe/Istanbul";

describe("zonedMidnight / day bounds (Europe/Istanbul)", () => {
  it("maps local midnight to correct UTC offset (UTC+3 summer)", () => {
    // 2026-07-28 00:00 Istanbul = 2026-07-27 21:00 UTC
    const midnight = zonedMidnight(2026, 7, 28, TZ);
    expect(midnight.toISOString()).toBe("2026-07-27T21:00:00.000Z");
  });

  it("start/end of today cover the local calendar day", () => {
    const now = new Date("2026-07-28T10:30:00.000Z"); // 13:30 Istanbul
    const start = startOfToday(now, TZ);
    const end = endOfToday(now, TZ);
    expect(start.toISOString()).toBe("2026-07-27T21:00:00.000Z");
    expect(end.toISOString()).toBe("2026-07-28T21:00:00.000Z");
    expect(getMatchTimeRange("TODAY", now, TZ)).toEqual({ start, end });
  });
});

describe("week / month bounds", () => {
  it("week starts Monday Istanbul", () => {
    // Tuesday 2026-07-28
    const now = new Date("2026-07-28T10:00:00.000Z");
    const start = startOfWeek(now, TZ);
    const end = endOfWeek(now, TZ);
    // Monday 2026-07-27 00:00 Istanbul
    expect(start.toISOString()).toBe("2026-07-26T21:00:00.000Z");
    // Monday 2026-08-03 00:00 Istanbul
    expect(end.toISOString()).toBe("2026-08-02T21:00:00.000Z");
  });

  it("month starts on the 1st", () => {
    const now = new Date("2026-07-28T10:00:00.000Z");
    const start = startOfMonth(now, TZ);
    const end = endOfMonth(now, TZ);
    expect(start.toISOString()).toBe("2026-06-30T21:00:00.000Z");
    expect(end.toISOString()).toBe("2026-07-31T21:00:00.000Z");
  });

  it("UPCOMING/PAST/ALL have no calendar range", () => {
    const now = new Date();
    expect(getMatchTimeRange("ALL", now, TZ)).toBeNull();
    expect(getMatchTimeRange("UPCOMING", now, TZ)).toBeNull();
    expect(getMatchTimeRange("PAST", now, TZ)).toBeNull();
  });
});
