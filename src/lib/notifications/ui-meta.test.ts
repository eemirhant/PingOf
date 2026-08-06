import { describe, expect, it } from "vitest";

import { NotificationType } from "@/domain/notification";
import {
  matchesNotificationFilter,
  notificationDateGroup,
  notificationUiCategory,
} from "@/lib/notifications/ui-meta";

describe("notificationUiCategory", () => {
  it("maps challenge / match / stake", () => {
    expect(notificationUiCategory(NotificationType.CHALLENGE_RECEIVED)).toBe(
      "challenge",
    );
    expect(notificationUiCategory(NotificationType.MATCH_RESULT)).toBe("match");
    expect(notificationUiCategory(NotificationType.STAKE_CREATED)).toBe("stake");
    expect(notificationUiCategory(NotificationType.MEMBER_JOINED)).toBe("system");
  });
});

describe("notificationDateGroup", () => {
  const now = new Date("2026-08-06T15:00:00");

  it("groups today / yesterday / week / older", () => {
    expect(notificationDateGroup(new Date("2026-08-06T10:00:00"), now)).toBe(
      "today",
    );
    expect(notificationDateGroup(new Date("2026-08-05T10:00:00"), now)).toBe(
      "yesterday",
    );
    expect(notificationDateGroup(new Date("2026-08-03T10:00:00"), now)).toBe(
      "week",
    );
    expect(notificationDateGroup(new Date("2026-07-01T10:00:00"), now)).toBe(
      "older",
    );
  });
});

describe("matchesNotificationFilter", () => {
  it("filters unread and categories", () => {
    expect(
      matchesNotificationFilter("unread", {
        type: NotificationType.MATCH_RESULT,
        isRead: false,
      }),
    ).toBe(true);
    expect(
      matchesNotificationFilter("challenge", {
        type: NotificationType.CHALLENGE_RECEIVED,
        isRead: true,
      }),
    ).toBe(true);
    expect(
      matchesNotificationFilter("match", {
        type: NotificationType.CHALLENGE_RECEIVED,
        isRead: true,
      }),
    ).toBe(false);
  });
});
