import { describe, expect, it } from "vitest";

import {
  RealtimeEventType,
  eventTypesForPath,
  eventsMatchPath,
  filterEventsSince,
} from "@/domain/realtime";

describe("eventTypesForPath", () => {
  it("maps challenges path", () => {
    expect(eventTypesForPath("/challenges")).toContain(
      RealtimeEventType.CHALLENGE_UPDATED,
    );
  });

  it("maps home dashboard broadly", () => {
    const types = eventTypesForPath("/");
    expect(types).toContain(RealtimeEventType.MATCH_RESULT);
    expect(types).toContain(RealtimeEventType.NOTIFICATION);
  });

  it("maps tournament and leaderboard", () => {
    expect(eventTypesForPath("/tournaments/abc")).toContain(
      RealtimeEventType.TOURNAMENT_UPDATED,
    );
    expect(eventTypesForPath("/leaderboard")).toContain(
      RealtimeEventType.LEADERBOARD_DIRTY,
    );
  });

  it("maps players and settings", () => {
    expect(eventTypesForPath("/players")).toContain(RealtimeEventType.MEMBER_JOINED);
    expect(eventTypesForPath("/settings")).toContain(
      RealtimeEventType.PROFILE_UPDATED,
    );
  });
});

describe("eventsMatchPath", () => {
  it("returns true when an event is relevant", () => {
    expect(
      eventsMatchPath([RealtimeEventType.CHALLENGE_UPDATED], "/challenges"),
    ).toBe(true);
  });

  it("returns false when none match", () => {
    expect(
      eventsMatchPath([RealtimeEventType.PROFILE_UPDATED], "/challenges"),
    ).toBe(false);
  });
});

describe("filterEventsSince", () => {
  const events = [
    { id: "1", createdAt: "2026-08-04T10:00:00.000Z" },
    { id: "2", createdAt: "2026-08-04T10:00:05.000Z" },
    { id: "3", createdAt: "2026-08-04T10:00:10.000Z" },
  ];

  it("returns all when cursor is null", () => {
    expect(filterEventsSince(events, null)).toHaveLength(3);
  });

  it("excludes events at or before cursor", () => {
    const filtered = filterEventsSince(events, "2026-08-04T10:00:05.000Z");
    expect(filtered.map((e) => e.id)).toEqual(["3"]);
  });
});
