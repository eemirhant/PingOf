import { describe, expect, it } from "vitest";

import { NotificationType } from "@/domain/notification";
import {
  MANAGED_NOTIFICATION_TYPES,
  NOTIFICATION_PREFERENCE_CATEGORIES,
  allowsInApp,
  allowsPush,
  buildDefaultPreferences,
  defaultChannelPreference,
  isNotificationPreferenceKey,
  mergePreferences,
} from "@/domain/notification-preferences";

describe("notification preference catalog integrity", () => {
  const uiKeys = NOTIFICATION_PREFERENCE_CATEGORIES.flatMap((c) =>
    c.items.map((i) => i.key),
  );

  it("has exactly four categories", () => {
    expect(NOTIFICATION_PREFERENCE_CATEGORIES.map((c) => c.id)).toEqual([
      "challenges",
      "matches",
      "tournaments",
      "leaderboard",
    ]);
  });

  it("MANAGED_NOTIFICATION_TYPES matches UI items 1:1", () => {
    expect([...MANAGED_NOTIFICATION_TYPES].sort()).toEqual(
      [...uiKeys].sort(),
    );
    expect(new Set(uiKeys).size).toBe(uiKeys.length);
  });

  it("lists expected challenge preferences (no CHALLENGE_UPDATED)", () => {
    const challenges = NOTIFICATION_PREFERENCE_CATEGORIES.find(
      (c) => c.id === "challenges",
    )!;
    expect(challenges.items.map((i) => i.key)).toEqual([
      NotificationType.CHALLENGE_RECEIVED,
      NotificationType.CHALLENGE_ACCEPTED,
      NotificationType.CHALLENGE_DECLINED,
      NotificationType.CHALLENGE_CANCELLED,
    ]);
  });

  it("lists expected match preferences", () => {
    const matches = NOTIFICATION_PREFERENCE_CATEGORIES.find(
      (c) => c.id === "matches",
    )!;
    expect(matches.items.map((i) => i.key)).toEqual([
      NotificationType.MATCH_CREATED,
      NotificationType.MATCH_SCHEDULE_CHANGED,
      NotificationType.MATCH_REMINDER,
      NotificationType.MATCH_CANCELLED,
      NotificationType.MATCH_RESULT,
    ]);
  });

  it("lists expected tournament preferences (no TOURNAMENT_CREATED)", () => {
    const tournaments = NOTIFICATION_PREFERENCE_CATEGORIES.find(
      (c) => c.id === "tournaments",
    )!;
    expect(tournaments.items.map((i) => i.key)).toEqual([
      NotificationType.TOURNAMENT_ADDED,
      NotificationType.TOURNAMENT_STARTED,
      NotificationType.TOURNAMENT_MATCH_READY,
      NotificationType.TOURNAMENT_MATCH_CREATED,
      NotificationType.TOURNAMENT_COMPLETED,
    ]);
  });

  it("lists expected leaderboard preferences (no OVERTAKEN)", () => {
    const leaderboard = NOTIFICATION_PREFERENCE_CATEGORIES.find(
      (c) => c.id === "leaderboard",
    )!;
    expect(leaderboard.items.map((i) => i.key)).toEqual([
      NotificationType.LEADERBOARD_RANK_CHANGED,
      NotificationType.LEADERBOARD_TOP3,
      NotificationType.LEADERBOARD_STREAK,
    ]);
  });

  it("does not expose removed categories or types", () => {
    const allLabels = NOTIFICATION_PREFERENCE_CATEGORIES.flatMap((c) =>
      c.items.map((i) => i.label),
    );
    expect(allLabels.join(" ")).not.toMatch(/iddia/i);
    expect(allLabels.join(" ")).not.toMatch(/duyuru/i);
    expect(allLabels.join(" ")).not.toMatch(/bakım/i);
    expect(isNotificationPreferenceKey("STAKE_CREATED")).toBe(false);
    expect(isNotificationPreferenceKey("MEMBER_JOINED")).toBe(false);
    expect(isNotificationPreferenceKey("CHALLENGE_UPDATED")).toBe(false);
    expect(isNotificationPreferenceKey("ANNOUNCEMENT")).toBe(false);
  });
});

describe("defaults for every managed preference", () => {
  it("leaderboard off; everything else on", () => {
    const prefs = buildDefaultPreferences();
    for (const key of MANAGED_NOTIFICATION_TYPES) {
      const expected = defaultChannelPreference(key);
      expect(prefs[key]).toEqual(expected);
    }
    expect(prefs.LEADERBOARD_RANK_CHANGED).toEqual({
      inApp: false,
      push: false,
    });
    expect(prefs.LEADERBOARD_TOP3).toEqual({ inApp: false, push: false });
    expect(prefs.LEADERBOARD_STREAK).toEqual({ inApp: false, push: false });
    expect(prefs.CHALLENGE_RECEIVED).toEqual({ inApp: true, push: true });
    expect(prefs.MATCH_CREATED).toEqual({ inApp: true, push: true });
    expect(prefs.TOURNAMENT_ADDED).toEqual({ inApp: true, push: true });
  });
});

describe("allowsInApp / allowsPush for all managed types", () => {
  it("respects per-type toggles", () => {
    const prefs = buildDefaultPreferences();
    for (const key of MANAGED_NOTIFICATION_TYPES) {
      prefs[key] = { inApp: true, push: false };
      expect(allowsInApp(prefs, key)).toBe(true);
      expect(allowsPush(prefs, key)).toBe(false);
      prefs[key] = { inApp: false, push: true };
      expect(allowsInApp(prefs, key)).toBe(false);
      expect(allowsPush(prefs, key)).toBe(true);
    }
  });

  it("always allows unmanaged emitted types", () => {
    const prefs = buildDefaultPreferences();
    for (const type of [
      NotificationType.STAKE_CREATED,
      NotificationType.STAKE_SETTLED,
      NotificationType.MEMBER_JOINED,
      NotificationType.TOURNAMENT_CREATED,
      NotificationType.LEADERBOARD_OVERTAKEN,
    ]) {
      expect(allowsInApp(prefs, type)).toBe(true);
      expect(allowsPush(prefs, type)).toBe(true);
    }
  });
});

describe("mergePreferences", () => {
  it("keeps all managed keys after partial merge", () => {
    const merged = mergePreferences({
      [NotificationType.MATCH_RESULT]: { inApp: false, push: false },
    });
    expect(Object.keys(merged).sort()).toEqual(
      [...MANAGED_NOTIFICATION_TYPES].sort(),
    );
    expect(merged.MATCH_RESULT).toEqual({ inApp: false, push: false });
    expect(merged.CHALLENGE_RECEIVED).toEqual({ inApp: true, push: true });
  });
});
