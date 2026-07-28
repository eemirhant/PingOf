import { describe, expect, it } from "vitest";

import {
  canAddAnotherSet,
  determineMatchWinner,
  formatMatchSummary,
  getMatchProgressSummary,
  validateSetScore,
} from "@/domain/match-scoring";

describe("validateSetScore", () => {
  it("accepts a normal 11-x win with margin >= 2", () => {
    expect(validateSetScore(11, 7)).toEqual({
      ok: true,
      set: { team1Score: 11, team2Score: 7, winnerTeam: 1 },
    });
    expect(validateSetScore(9, 11).ok).toBe(true);
    expect(validateSetScore(11, 0).ok).toBe(true);
  });

  it("accepts deuce scores with exact margin of 2", () => {
    expect(validateSetScore(12, 10).ok).toBe(true);
    expect(validateSetScore(13, 11).ok).toBe(true);
    expect(validateSetScore(15, 13).ok).toBe(true);
    expect(validateSetScore(11, 13)).toMatchObject({
      ok: true,
      set: { winnerTeam: 2 },
    });
  });

  it("rejects empty / null / undefined scores", () => {
    expect(validateSetScore(null, 11).ok).toBe(false);
    expect(validateSetScore(11, undefined).ok).toBe(false);
    expect(validateSetScore(null, null).ok).toBe(false);
  });

  it("rejects negative or non-integer scores", () => {
    expect(validateSetScore(-1, 11).ok).toBe(false);
    expect(validateSetScore(11, -3).ok).toBe(false);
    expect(validateSetScore(11.5, 9).ok).toBe(false);
    expect(validateSetScore(NaN, 11).ok).toBe(false);
  });

  it("rejects when winner has fewer than 11 points", () => {
    expect(validateSetScore(10, 8).ok).toBe(false);
    expect(validateSetScore(9, 7).ok).toBe(false);
  });

  it("rejects margin of 0 or 1", () => {
    expect(validateSetScore(11, 11).ok).toBe(false);
    expect(validateSetScore(11, 10).ok).toBe(false);
    expect(validateSetScore(12, 11).ok).toBe(false);
  });

  it("rejects winner > 11 when margin is not exactly 2 (e.g. 13-9)", () => {
    expect(validateSetScore(13, 9).ok).toBe(false);
    expect(validateSetScore(14, 10).ok).toBe(false);
    expect(validateSetScore(16, 12).ok).toBe(false);
  });

  it("accepts 11-9 but rejects 12-9", () => {
    expect(validateSetScore(11, 9).ok).toBe(true);
    expect(validateSetScore(12, 9).ok).toBe(false);
  });
});

describe("determineMatchWinner", () => {
  it("returns incomplete empty state for no sets", () => {
    const result = determineMatchWinner([]);
    expect(result.ok).toBe(true);
    if (result.ok && !result.complete) {
      expect(result.summary).toBe("Henüz set girilmedi");
    }
  });

  it("determines 3-0 winner", () => {
    const result = determineMatchWinner([
      { team1Score: 11, team2Score: 5 },
      { team1Score: 11, team2Score: 7 },
      { team1Score: 11, team2Score: 9 },
    ]);

    expect(result).toMatchObject({
      ok: true,
      complete: true,
      winnerTeam: 1,
      team1SetsWon: 3,
      team2SetsWon: 0,
    });
  });

  it("determines 3-1 winner", () => {
    const result = determineMatchWinner([
      { team1Score: 11, team2Score: 8 },
      { team1Score: 7, team2Score: 11 },
      { team1Score: 11, team2Score: 6 },
      { team1Score: 12, team2Score: 10 },
    ]);

    expect(result).toMatchObject({
      ok: true,
      complete: true,
      winnerTeam: 1,
      team1SetsWon: 3,
      team2SetsWon: 1,
    });
  });

  it("determines 3-2 winner with deuce sets", () => {
    const result = determineMatchWinner([
      { team1Score: 11, team2Score: 9 },
      { team1Score: 8, team2Score: 11 },
      { team1Score: 13, team2Score: 11 },
      { team1Score: 9, team2Score: 11 },
      { team1Score: 15, team2Score: 13 },
    ]);

    expect(result).toMatchObject({
      ok: true,
      complete: true,
      winnerTeam: 1,
      team1SetsWon: 3,
      team2SetsWon: 2,
    });
  });

  it("rejects adding a set after a team already reached 3", () => {
    const result = determineMatchWinner([
      { team1Score: 11, team2Score: 5 },
      { team1Score: 11, team2Score: 6 },
      { team1Score: 11, team2Score: 7 },
      { team1Score: 11, team2Score: 8 },
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("ek set");
    }
  });

  it("rejects more than 5 sets", () => {
    const result = determineMatchWinner([
      { team1Score: 11, team2Score: 9 },
      { team1Score: 9, team2Score: 11 },
      { team1Score: 11, team2Score: 8 },
      { team1Score: 8, team2Score: 11 },
      { team1Score: 11, team2Score: 7 },
      { team1Score: 11, team2Score: 6 },
    ]);

    expect(result.ok).toBe(false);
  });

  it("rejects invalid set inside the list with set number in error", () => {
    const result = determineMatchWinner([
      { team1Score: 11, team2Score: 7 },
      { team1Score: 13, team2Score: 9 },
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Set 2");
    }
  });

  it("returns incomplete progress summary while match is ongoing", () => {
    const result = determineMatchWinner([
      { team1Score: 11, team2Score: 7 },
      { team1Score: 8, team2Score: 11 },
    ]);

    expect(result).toMatchObject({
      ok: true,
      complete: false,
      team1SetsWon: 1,
      team2SetsWon: 1,
      summary: "1-1 eşit",
      leadingTeam: null,
    });
  });

  it("shows which team is ahead mid-match", () => {
    const result = determineMatchWinner([
      { team1Score: 11, team2Score: 5 },
      { team1Score: 11, team2Score: 8 },
    ]);

    expect(result).toMatchObject({
      ok: true,
      complete: false,
      leadingTeam: 1,
      summary: "2-0 Takım 1 önde",
    });
  });

  it("requires at least 3 sets to complete — 2 sets is incomplete even if 2-0", () => {
    const result = determineMatchWinner([
      { team1Score: 11, team2Score: 5 },
      { team1Score: 11, team2Score: 6 },
    ]);

    expect(result.ok && !result.complete).toBe(true);
    if (result.ok && !result.complete) {
      expect(result.team1SetsWon).toBe(2);
    }
  });
});

describe("helpers", () => {
  it("canAddAnotherSet respects 3-set win and max 5", () => {
    expect(canAddAnotherSet(2, 2, 4)).toBe(true);
    expect(canAddAnotherSet(3, 1, 4)).toBe(false);
    expect(canAddAnotherSet(2, 2, 5)).toBe(false);
    expect(canAddAnotherSet(0, 0, 0)).toBe(true);
  });

  it("formatMatchSummary and getMatchProgressSummary produce Turkish text", () => {
    expect(formatMatchSummary(0, 0)).toBe("Henüz set girilmedi");
    expect(formatMatchSummary(2, 1)).toBe("2-1 Takım 1 önde");
    expect(getMatchProgressSummary([{ team1Score: 11, team2Score: 5 }])).toBe(
      "1-0 Takım 1 önde",
    );
    expect(
      getMatchProgressSummary([
        { team1Score: 11, team2Score: 5 },
        { team1Score: 11, team2Score: 6 },
        { team1Score: 11, team2Score: 7 },
      ]),
    ).toBe("3-0 Takım 1 kazandı");
  });
});
