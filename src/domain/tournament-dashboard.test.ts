import { describe, expect, it } from "vitest";

import {
  computeTournamentDashboardStats,
  computeTournamentSummary,
  type TournamentDashboardMatch,
} from "@/domain/tournament-dashboard";

function match(
  partial: Partial<TournamentDashboardMatch> & { id: string; status: string },
): TournamentDashboardMatch {
  const base = new Date("2026-01-01T10:00:00");
  return {
    winnerTeam: 1,
    scheduledAt: base,
    playedAt: new Date(base.getTime() + 25 * 60 * 1000),
    createdAt: base,
    updatedAt: new Date(base.getTime() + 25 * 60 * 1000),
    participants: [
      {
        userId: "a",
        team: 1,
        fullName: "Ali",
        avatarUrl: null,
        avatarColor: "#111",
      },
      {
        userId: "b",
        team: 2,
        fullName: "Ayşe",
        avatarUrl: null,
        avatarColor: "#222",
      },
    ],
    sets: [
      { team1Score: 11, team2Score: 5 },
      { team1Score: 11, team2Score: 7 },
      { team1Score: 11, team2Score: 9 },
    ],
    ...partial,
  };
}

describe("tournament-dashboard", () => {
  it("computes summary and progress", () => {
    const matches = [
      match({ id: "1", status: "COMPLETED" }),
      match({ id: "2", status: "PENDING", winnerTeam: null, playedAt: null }),
      match({ id: "3", status: "CANCELLED", winnerTeam: null }),
    ];
    const summary = computeTournamentSummary({
      participantCount: 4,
      startedAt: new Date("2026-01-01"),
      matches,
      championLabels: [],
    });
    expect(summary.totalMatches).toBe(3);
    expect(summary.completedMatches).toBe(1);
    expect(summary.remainingMatches).toBe(1);
    expect(summary.progressPercent).toBe(50);
    expect(summary.championLabel).toBeNull();
  });

  it("picks leaders from completed matches", () => {
    const matches = [
      match({ id: "1", status: "COMPLETED" }),
      match({
        id: "2",
        status: "COMPLETED",
        winnerTeam: 1,
        playedAt: new Date("2026-01-01T10:15:00"),
        updatedAt: new Date("2026-01-01T10:15:00"),
      }),
    ];
    const stats = computeTournamentDashboardStats(matches);
    expect(stats.mostWins?.player?.fullName).toBe("Ali");
    expect(stats.mostWins?.valueLabel).toBe("2G");
    expect(stats.mostPoints?.player?.fullName).toBe("Ali");
    expect(stats.mostActive?.valueLabel).toBe("2 maç");
    expect(stats.averageDuration).not.toBeNull();
  });
});
