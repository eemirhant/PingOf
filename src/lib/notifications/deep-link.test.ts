import { describe, expect, it } from "vitest";

import { NotificationType } from "@/domain/notification";
import {
  buildNotificationDeepLink,
  extractRefsFromLinkUrl,
  getNotificationDestination,
  parseNotificationDeepLink,
} from "@/lib/notifications/deep-link";

describe("getNotificationDestination", () => {
  it("routes challenge received to challenges with id", () => {
    expect(
      getNotificationDestination(NotificationType.CHALLENGE_RECEIVED, {
        challengeId: "ch1",
      }),
    ).toBe("/challenges?id=ch1&challengeId=ch1");
  });

  it("routes challenge accepted to match detail", () => {
    expect(
      getNotificationDestination(NotificationType.CHALLENGE_ACCEPTED, {
        matchId: "m1",
        challengeId: "ch1",
      }),
    ).toBe("/matches/m1");
  });

  it("routes match result to match detail", () => {
    expect(
      getNotificationDestination(NotificationType.MATCH_RESULT, {
        entityId: "m9",
      }),
    ).toBe("/matches/m9");
  });

  it("routes tournament notifications to tournament detail", () => {
    expect(
      getNotificationDestination(NotificationType.TOURNAMENT_STARTED, {
        tournamentId: "t1",
      }),
    ).toBe("/tournaments/t1");
  });

  it("routes tournament match to tournament when only tournamentId/entityId present", () => {
    expect(
      getNotificationDestination(NotificationType.TOURNAMENT_MATCH_READY, {
        entityId: "t1",
        tournamentId: "t1",
      }),
    ).toBe("/tournaments/t1");
  });

  it("routes tournament match to match when matchId present", () => {
    expect(
      getNotificationDestination(NotificationType.TOURNAMENT_MATCH_CREATED, {
        matchId: "m2",
        tournamentId: "t1",
      }),
    ).toBe("/matches/m2");
  });

  it("falls back to notifications when no refs", () => {
    expect(getNotificationDestination("UNKNOWN_TYPE", {})).toBe(
      "/notifications",
    );
  });
});

describe("buildNotificationDeepLink", () => {
  it("rebuilds from legacy linkUrl match path", () => {
    expect(
      buildNotificationDeepLink({
        type: NotificationType.MATCH_CREATED,
        linkUrl: "/matches/abc",
      }),
    ).toBe("/matches/abc");
  });

  it("prefers explicit challengeId over bare /challenges", () => {
    expect(
      buildNotificationDeepLink({
        type: NotificationType.CHALLENGE_RECEIVED,
        linkUrl: "/challenges",
        challengeId: "ch99",
      }),
    ).toBe("/challenges?id=ch99&challengeId=ch99");
  });
});

describe("parseNotificationDeepLink", () => {
  it("parses challenge focus query", () => {
    const parsed = parseNotificationDeepLink(
      "/challenges?id=ch1&challengeId=ch1",
    );
    expect(parsed.challengeId).toBe("ch1");
    expect(parsed.focusId).toBe("ch1");
  });

  it("extractRefsFromLinkUrl reads match path", () => {
    expect(extractRefsFromLinkUrl("/matches/xyz")).toEqual(
      expect.objectContaining({ matchId: "xyz", entityId: "xyz" }),
    );
  });
});
