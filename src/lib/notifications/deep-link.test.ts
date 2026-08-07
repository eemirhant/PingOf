import { describe, expect, it } from "vitest";

import { NotificationType } from "@/domain/notification";
import {
  buildNotificationDeepLink,
  extractRefsFromLinkUrl,
  getListFallbackForNotificationType,
  getNotificationDestination,
  parseNotificationDeepLink,
  toNotificationNavPath,
  withEntityMissingFlag,
} from "@/lib/notifications/deep-link";

describe("getNotificationDestination", () => {
  it("routes challenge received to challenges with highlight", () => {
    expect(
      getNotificationDestination(NotificationType.CHALLENGE_RECEIVED, {
        challengeId: "ch1",
      }),
    ).toBe("/challenges?highlight=ch1&id=ch1&challengeId=ch1");
  });

  it("routes challenge accepted to challenges highlight", () => {
    expect(
      getNotificationDestination(NotificationType.CHALLENGE_ACCEPTED, {
        matchId: "m1",
        challengeId: "ch1",
      }),
    ).toBe("/challenges?highlight=ch1&id=ch1&challengeId=ch1");
  });

  it("routes match created to matches list highlight", () => {
    expect(
      getNotificationDestination(NotificationType.MATCH_CREATED, {
        entityId: "m9",
      }),
    ).toBe("/matches?highlight=m9");
  });

  it("routes match result to past matches with highlight", () => {
    expect(
      getNotificationDestination(NotificationType.MATCH_RESULT, {
        entityId: "m9",
      }),
    ).toBe("/matches?time=PAST&highlight=m9");
  });

  it("routes tournament notifications to tournament detail", () => {
    expect(
      getNotificationDestination(NotificationType.TOURNAMENT_STARTED, {
        tournamentId: "t1",
      }),
    ).toBe("/tournaments/t1");
  });

  it("normalizes lowercase snake types", () => {
    expect(
      getNotificationDestination("challenge_received", { entityId: "ch2" }),
    ).toBe("/challenges?highlight=ch2&id=ch2&challengeId=ch2");
  });

  it("falls back to notifications when no refs", () => {
    expect(getNotificationDestination("UNKNOWN_TYPE", {})).toBe(
      "/notifications",
    );
  });
});

describe("buildNotificationDeepLink", () => {
  it("ignores stale /notifications linkUrl for challenge types", () => {
    expect(
      buildNotificationDeepLink({
        type: NotificationType.CHALLENGE_RECEIVED,
        linkUrl: "/notifications",
        challengeId: "ch99",
      }),
    ).toBe("/challenges?highlight=ch99&id=ch99&challengeId=ch99");
  });

  it("rebuilds match created from match path", () => {
    expect(
      buildNotificationDeepLink({
        type: NotificationType.MATCH_CREATED,
        linkUrl: "/matches/abc",
      }),
    ).toBe("/matches?highlight=abc");
  });
});

describe("toNotificationNavPath", () => {
  it("keeps relative paths", () => {
    expect(toNotificationNavPath("/challenges?highlight=x")).toBe(
      "/challenges?highlight=x",
    );
  });

  it("strips origin from absolute urls", () => {
    expect(
      toNotificationNavPath("https://other.example/challenges?highlight=x"),
    ).toBe("/challenges?highlight=x");
  });
});

describe("parseNotificationDeepLink", () => {
  it("parses challenge highlight query", () => {
    const parsed = parseNotificationDeepLink(
      "/challenges?highlight=ch1&id=ch1&challengeId=ch1",
    );
    expect(parsed.challengeId).toBe("ch1");
    expect(parsed.highlightId).toBe("ch1");
    expect(parsed.focusId).toBe("ch1");
  });

  it("extractRefsFromLinkUrl reads match path", () => {
    expect(extractRefsFromLinkUrl("/matches/m1")?.matchId).toBe("m1");
  });
});

describe("entity missing helpers", () => {
  it("lists challenge fallback", () => {
    expect(getListFallbackForNotificationType("CHALLENGE_RECEIVED")).toBe(
      "/challenges",
    );
  });

  it("appends entityMissing flag", () => {
    expect(withEntityMissingFlag("/challenges")).toBe(
      "/challenges?entityMissing=1",
    );
  });
});
