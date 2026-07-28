import { describe, expect, it } from "vitest";

import {
  computePlayerStats,
  type StatsMatch,
} from "@/domain/player-stats";

function singlesMatch(
  id: string,
  p1: string,
  p2: string,
  winnerTeam: 1 | 2,
  sets: Array<[number, number]>,
  playedAt: Date,
): StatsMatch {
  const team1SetsWon = sets.filter(([a, b]) => a > b).length;
  const team2SetsWon = sets.filter(([a, b]) => b > a).length;
  return {
    id,
    format: "SINGLES",
    playedAt,
    winnerTeam,
    team1SetsWon,
    team2SetsWon,
    participants: [
      { userId: p1, team: 1, fullName: p1 },
      { userId: p2, team: 2, fullName: p2 },
    ],
    sets: sets.map(([team1Score, team2Score]) => ({ team1Score, team2Score })),
  };
}

function doublesMatch(
  id: string,
  t1: [string, string],
  t2: [string, string],
  winnerTeam: 1 | 2,
  sets: Array<[number, number]>,
  playedAt: Date,
): StatsMatch {
  const team1SetsWon = sets.filter(([a, b]) => a > b).length;
  const team2SetsWon = sets.filter(([a, b]) => b > a).length;
  return {
    id,
    format: "DOUBLES",
    playedAt,
    winnerTeam,
    team1SetsWon,
    team2SetsWon,
    participants: [
      { userId: t1[0], team: 1, fullName: t1[0] },
      { userId: t1[1], team: 1, fullName: t1[1] },
      { userId: t2[0], team: 2, fullName: t2[0] },
      { userId: t2[1], team: 2, fullName: t2[1] },
    ],
    sets: sets.map(([team1Score, team2Score]) => ({ team1Score, team2Score })),
  };
}

const day = (n: number) => new Date(`2026-01-${String(n).padStart(2, "0")}T12:00:00Z`);

describe("computePlayerStats", () => {
  it("counts 1v1 wins and losses", () => {
    const matches = [
      singlesMatch("1", "a", "b", 1, [[11, 5], [11, 4], [11, 3]], day(1)),
      singlesMatch("2", "a", "b", 2, [[5, 11], [4, 11], [3, 11]], day(2)),
    ];
    const stats = computePlayerStats("a", matches);
    expect(stats.overall).toEqual({ played: 2, wins: 1, losses: 1, winRate: 50 });
    expect(stats.singles.wins).toBe(1);
    expect(stats.doubles.played).toBe(0);
  });

  it("counts 2v2 from player team perspective", () => {
    const matches = [
      doublesMatch("d1", ["a", "p"], ["x", "y"], 1, [[11, 5], [11, 4], [11, 3]], day(1)),
    ];
    const stats = computePlayerStats("a", matches);
    expect(stats.doubles).toEqual({ played: 1, wins: 1, losses: 0, winRate: 100 });
    expect(stats.topPartner?.userId).toBe("p");
    expect(stats.topPartner?.wins).toBe(1);
  });

  it("computes set and point averages for team 2 player", () => {
    const matches = [
      singlesMatch("1", "b", "a", 2, [[5, 11], [4, 11], [3, 11]], day(1)),
    ];
    const stats = computePlayerStats("a", matches);
    expect(stats.sets).toEqual({ won: 3, lost: 0, average: 3 });
    expect(stats.points.won).toBe(33);
    expect(stats.points.lost).toBe(12);
    expect(stats.points.average).toBe(21);
  });

  it("builds recent form newest first and streak", () => {
    const matches = [
      singlesMatch("1", "a", "b", 1, [[11, 5], [11, 4], [11, 3]], day(1)),
      singlesMatch("2", "a", "b", 1, [[11, 5], [11, 4], [11, 3]], day(2)),
      singlesMatch("3", "a", "b", 2, [[5, 11], [4, 11], [3, 11]], day(3)),
      singlesMatch("4", "a", "b", 1, [[11, 5], [11, 4], [11, 3]], day(4)),
      singlesMatch("5", "a", "b", 1, [[11, 5], [11, 4], [11, 3]], day(5)),
      singlesMatch("6", "a", "b", 1, [[11, 5], [11, 4], [11, 3]], day(6)),
    ];
    const stats = computePlayerStats("a", matches);
    expect(stats.recentForm).toEqual(["W", "W", "W", "L", "W"]);
    expect(stats.currentStreak).toEqual({ type: "W", count: 3 });
  });

  it("picks most-played opponent", () => {
    const matches = [
      singlesMatch("1", "a", "b", 1, [[11, 5], [11, 4], [11, 3]], day(1)),
      singlesMatch("2", "a", "b", 2, [[5, 11], [4, 11], [3, 11]], day(2)),
      singlesMatch("3", "a", "c", 1, [[11, 5], [11, 4], [11, 3]], day(3)),
    ];
    const stats = computePlayerStats("a", matches);
    expect(stats.topOpponent?.userId).toBe("b");
    expect(stats.topOpponent?.played).toBe(2);
    expect(stats.topOpponent?.wins).toBe(1);
    expect(stats.topOpponent?.losses).toBe(1);
  });

  it("ignores matches the player did not play", () => {
    const matches = [
      singlesMatch("1", "x", "y", 1, [[11, 5], [11, 4], [11, 3]], day(1)),
    ];
    const stats = computePlayerStats("a", matches);
    expect(stats.overall.played).toBe(0);
    expect(stats.matchHistory).toHaveLength(0);
  });
});
