import { describe, expect, it } from "vitest";

import {
  ACHIEVEMENT_DEFINITIONS,
  ACHIEVEMENT_WIN_RATE_MIN_MATCHES,
  computeBestWinStreak,
  evaluateAchievements,
  type TournamentAchievementHint,
} from "@/domain/achievements";
import type { StatsMatch } from "@/domain/player-stats";

function singles(
  id: string,
  p1: string,
  p2: string,
  winnerTeam: 1 | 2,
  playedAt: Date,
  points: [number, number] = [11, 5],
): StatsMatch {
  return {
    id,
    format: "SINGLES",
    playedAt,
    winnerTeam,
    team1SetsWon: winnerTeam === 1 ? 3 : 0,
    team2SetsWon: winnerTeam === 2 ? 3 : 0,
    participants: [
      { userId: p1, team: 1, fullName: p1 },
      { userId: p2, team: 2, fullName: p2 },
    ],
    sets: [
      { team1Score: points[0], team2Score: points[1] },
      { team1Score: points[0], team2Score: points[1] },
      { team1Score: points[0], team2Score: points[1] },
    ],
  };
}

describe("achievements", () => {
  it("defines the expected catalog size", () => {
    expect(ACHIEVEMENT_DEFINITIONS).toHaveLength(22);
  });

  it("unlocks first match and first win", () => {
    const matches = [
      singles("m1", "a", "b", 1, new Date("2026-01-01T12:00:00")),
    ];
    const progress = evaluateAchievements("a", matches);
    const byId = Object.fromEntries(progress.map((p) => [p.id, p]));

    expect(byId.first_match?.unlocked).toBe(true);
    expect(byId.first_win?.unlocked).toBe(true);
    expect(byId.wins_10?.unlocked).toBe(false);
    expect(byId.wins_10?.current).toBe(1);
    expect(byId.wins_10?.percent).toBe(10);
  });

  it("tracks best win streak across history", () => {
    const day = (n: number) => new Date(`2026-01-${String(n).padStart(2, "0")}T12:00:00`);
    const matches = [
      singles("1", "a", "b", 1, day(1)),
      singles("2", "a", "b", 1, day(2)),
      singles("3", "a", "b", 1, day(3)),
      singles("4", "a", "b", 2, day(4)),
      singles("5", "a", "b", 1, day(5)),
      singles("6", "a", "b", 1, day(6)),
    ];
    expect(computeBestWinStreak("a", matches)).toBe(3);
    const progress = evaluateAchievements("a", matches);
    expect(progress.find((p) => p.id === "streak_3")?.unlocked).toBe(true);
    expect(progress.find((p) => p.id === "streak_5")?.unlocked).toBe(false);
  });

  it("counts active days and championships from tournament hints", () => {
    const matches = [
      singles("1", "a", "b", 1, new Date("2026-01-01T12:00:00")),
      singles("2", "a", "b", 1, new Date("2026-01-02T12:00:00")),
    ];
    const tournaments: TournamentAchievementHint[] = [
      {
        id: "t1",
        type: "KNOCKOUT",
        status: "COMPLETED",
        participantUserIds: ["a", "b"],
        championUserIds: ["a"],
        playerRecords: [
          { userId: "a", played: 2, wins: 2, losses: 0 },
          { userId: "b", played: 2, wins: 0, losses: 2 },
        ],
      },
    ];
    const progress = evaluateAchievements("a", matches, tournaments);
    const byId = Object.fromEntries(progress.map((p) => [p.id, p]));

    expect(byId.active_days_7?.current).toBe(2);
    expect(byId.first_tournament?.unlocked).toBe(true);
    expect(byId.first_championship?.unlocked).toBe(true);
    expect(byId.undefeated_tournament?.unlocked).toBe(true);
  });

  it("gates 90% win rate behind minimum matches", () => {
    const matches = Array.from({ length: 5 }, (_, i) =>
      singles(`m${i}`, "a", "b", 1, new Date(`2026-02-0${i + 1}T12:00:00`)),
    );
    const early = evaluateAchievements("a", matches);
    expect(early.find((p) => p.id === "win_rate_90")?.unlocked).toBe(false);

    while (matches.length < ACHIEVEMENT_WIN_RATE_MIN_MATCHES) {
      const i = matches.length;
      matches.push(
        singles(
          `extra${i}`,
          "a",
          "b",
          1,
          new Date(`2026-03-${String(i + 1).padStart(2, "0")}T12:00:00`),
        ),
      );
    }
    const ready = evaluateAchievements("a", matches);
    expect(ready.find((p) => p.id === "win_rate_90")?.unlocked).toBe(true);
  });

  it("unlocks 100 points from set scores", () => {
    // 3 sets × 11 = 33 points per match → 4 matches = 132
    const matches = Array.from({ length: 4 }, (_, i) =>
      singles(
        `p${i}`,
        "a",
        "b",
        1,
        new Date(`2026-04-0${i + 1}T12:00:00`),
        [11, 3],
      ),
    );
    const progress = evaluateAchievements("a", matches);
    expect(progress.find((p) => p.id === "points_100")?.unlocked).toBe(true);
    expect(progress.find((p) => p.id === "points_100")?.current).toBe(132);
  });
});
