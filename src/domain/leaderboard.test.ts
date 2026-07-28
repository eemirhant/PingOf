import { describe, expect, it } from "vitest";

import { MIN_MATCHES_FOR_RANKING } from "@/domain/constants";
import { calculateLeaderboard, findPlayerRank } from "@/domain/leaderboard";
import type { StatsMatch } from "@/domain/player-stats";

function singles(
  id: string,
  p1: string,
  p2: string,
  winnerTeam: 1 | 2,
  day: number,
): StatsMatch {
  const finalSets =
    winnerTeam === 1
      ? [
          [11, 5],
          [11, 4],
          [11, 3],
        ]
      : [
          [5, 11],
          [4, 11],
          [3, 11],
        ];
  return {
    id,
    format: "SINGLES",
    playedAt: new Date(`2026-02-${String(day).padStart(2, "0")}T12:00:00Z`),
    winnerTeam,
    team1SetsWon: winnerTeam === 1 ? 3 : 0,
    team2SetsWon: winnerTeam === 2 ? 3 : 0,
    participants: [
      { userId: p1, team: 1, fullName: p1 },
      { userId: p2, team: 2, fullName: p2 },
    ],
    sets: finalSets.map(([team1Score, team2Score]) => ({ team1Score, team2Score })),
  };
}

describe("calculateLeaderboard", () => {
  it("exposes MIN_MATCHES_FOR_RANKING as 3", () => {
    expect(MIN_MATCHES_FOR_RANKING).toBe(3);
  });

  it("puts players with fewer than 3 matches in unranked", () => {
    const players = [
      { id: "a", fullName: "Ada" },
      { id: "b", fullName: "Bora" },
    ];
    const matches = [
      singles("1", "a", "b", 1, 1),
      singles("2", "a", "b", 1, 2),
    ];
    const result = calculateLeaderboard(players, matches, "ALL");
    expect(result.ranked).toHaveLength(0);
    expect(result.unranked.map((e) => e.userId).sort()).toEqual(["a", "b"]);
    expect(result.unranked.find((e) => e.userId === "a")?.played).toBe(2);
  });

  it("ranks by wins then win rate then set avg then point avg then name", () => {
    const players = [
      { id: "a", fullName: "Ada" },
      { id: "b", fullName: "Bora" },
      { id: "c", fullName: "Cem" },
    ];
    // a: 3 wins, b: 2 wins 1 loss vs a? need 3 matches each
    // a beats b, a beats c, b beats c → a 2W, b 1W1L, c 0W2L — need 3 each
    // a beats b, a beats c, a beats b again; b beats c twice
    const matches = [
      singles("1", "a", "b", 1, 1),
      singles("2", "a", "c", 1, 2),
      singles("3", "a", "b", 1, 3),
      singles("4", "b", "c", 1, 4),
      singles("5", "b", "c", 1, 5),
      singles("6", "c", "a", 2, 6), // a wins as team 2 — wait p1=c team1, winnerTeam 2 means a wins
    ];
    // a played: 1,2,3,6 → 4 wins
    // b played: 1,3,4,5 → 2 wins 2 losses
    // c played: 2,4,5,6 → 0 wins 4 losses
    const result = calculateLeaderboard(players, matches, "ALL");
    expect(result.ranked.map((e) => e.userId)).toEqual(["a", "b", "c"]);
    expect(result.ranked[0]?.rank).toBe(1);
    expect(result.ranked[0]?.wins).toBe(4);
    expect(result.unranked).toHaveLength(0);
  });

  it("breaks ties alphabetically when records equal", () => {
    const players = [
      { id: "b", fullName: "Bora" },
      { id: "a", fullName: "Ada" },
    ];
    // Identical 3-0 records with same set/point totals
    const matches = [
      singles("1", "a", "x", 1, 1),
      singles("2", "a", "x", 1, 2),
      singles("3", "a", "x", 1, 3),
      singles("4", "b", "x", 1, 4),
      singles("5", "b", "x", 1, 5),
      singles("6", "b", "x", 1, 6),
    ];
    const withX = [...players, { id: "x", fullName: "Zed" }];
    const result = calculateLeaderboard(withX, matches, "ALL");
    const rankedIds = result.ranked.map((e) => e.userId);
    expect(rankedIds.indexOf("a")).toBeLessThan(rankedIds.indexOf("b"));
  });

  it("filters by SINGLES format", () => {
    const players = [
      { id: "a", fullName: "Ada" },
      { id: "b", fullName: "Bora" },
    ];
    const matches: StatsMatch[] = [
      singles("1", "a", "b", 1, 1),
      singles("2", "a", "b", 1, 2),
      singles("3", "a", "b", 1, 3),
      {
        id: "d1",
        format: "DOUBLES",
        playedAt: new Date("2026-02-10T12:00:00Z"),
        winnerTeam: 1,
        team1SetsWon: 3,
        team2SetsWon: 0,
        participants: [
          { userId: "a", team: 1, fullName: "Ada" },
          { userId: "p", team: 1, fullName: "Partner" },
          { userId: "b", team: 2, fullName: "Bora" },
          { userId: "q", team: 2, fullName: "Q" },
        ],
        sets: [
          { team1Score: 11, team2Score: 5 },
          { team1Score: 11, team2Score: 4 },
          { team1Score: 11, team2Score: 3 },
        ],
      },
    ];
    const singlesBoard = calculateLeaderboard(players, matches, "SINGLES");
    expect(singlesBoard.ranked.find((e) => e.userId === "a")?.played).toBe(3);
    const allBoard = calculateLeaderboard(players, matches, "ALL");
    expect(allBoard.ranked.find((e) => e.userId === "a")?.played).toBe(4);
  });

  it("findPlayerRank returns null when under barrier", () => {
    const players = [
      { id: "a", fullName: "Ada" },
      { id: "b", fullName: "Bora" },
    ];
    const matches = [singles("1", "a", "b", 1, 1)];
    expect(findPlayerRank("a", players, matches)).toBeNull();
  });
});
