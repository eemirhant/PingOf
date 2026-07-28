import { describe, expect, it } from "vitest";

import {
  ROUND_ROBIN_LOSS_POINTS,
  ROUND_ROBIN_WIN_POINTS,
} from "@/domain/constants";
import {
  advanceTournamentBracket,
  buildKnockoutBracket,
  buildRoundRobinPairings,
  calculateRoundRobinStandings,
  isRoundRobinComplete,
  knockoutMatchId,
  knockoutRoundLabel,
  nextPowerOfTwo,
  nextRoundTarget,
  padToPowerOfTwo,
} from "@/domain/tournament";

describe("pad / power of two", () => {
  it("pads to next power of two with BYE nulls", () => {
    expect(nextPowerOfTwo(3)).toBe(4);
    expect(nextPowerOfTwo(5)).toBe(8);
    expect(padToPowerOfTwo(["a", "b", "c"])).toEqual(["a", "b", "c", null]);
  });

  it("leaves exact powers unchanged", () => {
    expect(padToPowerOfTwo(["a", "b", "c", "d"])).toEqual(["a", "b", "c", "d"]);
  });
});

describe("buildKnockoutBracket", () => {
  it("builds 4-entry bracket without BYE", () => {
    const { size, rounds, matches } = buildKnockoutBracket([
      "a",
      "b",
      "c",
      "d",
    ]);
    expect(size).toBe(4);
    expect(rounds).toBe(2);
    expect(matches).toHaveLength(3);

    const r1 = matches.filter((m) => m.round === 1);
    expect(r1).toHaveLength(2);
    expect(r1.every((m) => m.status === "PENDING")).toBe(true);

    const final = matches.find((m) => m.round === 2)!;
    expect(final.status).toBe("WAITING");
    expect(final.team1EntryId).toBeNull();
  });

  it("auto-completes BYE for 3 entries", () => {
    const { matches } = buildKnockoutBracket(["a", "b", "c"]);
    const r1 = matches.filter((m) => m.round === 1);
    const byeMatch = r1.find((m) => m.team2EntryId === null || m.team1EntryId === null);
    expect(byeMatch?.status).toBe("COMPLETED");
    expect(byeMatch?.winnerEntryId).toBeTruthy();

    const final = matches.find((m) => m.round === 2)!;
    // BYE winner should already be seeded into the final
    expect(
      final.team1EntryId === byeMatch!.winnerEntryId ||
        final.team2EntryId === byeMatch!.winnerEntryId,
    ).toBe(true);
  });

  it("rejects fewer than 2 entries", () => {
    expect(() => buildKnockoutBracket(["only"])).toThrow();
  });

  it("builds 8-entry tree", () => {
    const ids = ["1", "2", "3", "4", "5", "6", "7", "8"];
    const { size, rounds, matches } = buildKnockoutBracket(ids);
    expect(size).toBe(8);
    expect(rounds).toBe(3);
    expect(matches.filter((m) => m.round === 1)).toHaveLength(4);
    expect(matches.filter((m) => m.round === 2)).toHaveLength(2);
    expect(matches.filter((m) => m.round === 3)).toHaveLength(1);
  });
});

describe("advanceTournamentBracket", () => {
  it("advances winner to next round and marks newly ready", () => {
    const { matches } = buildKnockoutBracket(["a", "b", "c", "d"]);
    const m0 = matches.find((m) => m.id === knockoutMatchId(1, 0))!;
    const m1 = matches.find((m) => m.id === knockoutMatchId(1, 1))!;

    const step1 = advanceTournamentBracket({
      matches,
      completedMatchId: m0.id,
      winnerEntryId: "a",
    });
    expect(step1.championEntryId).toBeNull();
    const finalAfter1 = step1.matches.find((m) => m.round === 2)!;
    expect(finalAfter1.team1EntryId).toBe("a");
    expect(finalAfter1.status).toBe("WAITING");
    expect(step1.newlyReadyMatchIds).toEqual([]);

    const step2 = advanceTournamentBracket({
      matches: step1.matches,
      completedMatchId: m1.id,
      winnerEntryId: "c",
    });
    const final = step2.matches.find((m) => m.round === 2)!;
    expect(final.team1EntryId).toBe("a");
    expect(final.team2EntryId).toBe("c");
    expect(final.status).toBe("PENDING");
    expect(step2.newlyReadyMatchIds).toEqual([final.id]);

    const step3 = advanceTournamentBracket({
      matches: step2.matches,
      completedMatchId: final.id,
      winnerEntryId: "a",
    });
    expect(step3.championEntryId).toBe("a");
  });

  it("rejects winner not in match", () => {
    const { matches } = buildKnockoutBracket(["a", "b", "c", "d"]);
    expect(() =>
      advanceTournamentBracket({
        matches,
        completedMatchId: knockoutMatchId(1, 0),
        winnerEntryId: "z",
      }),
    ).toThrow();
  });

  it("nextRoundTarget maps slots correctly", () => {
    expect(nextRoundTarget(1, 0)).toEqual({
      round: 2,
      bracketSlot: 0,
      team: 1,
    });
    expect(nextRoundTarget(1, 1)).toEqual({
      round: 2,
      bracketSlot: 0,
      team: 2,
    });
  });
});

describe("round robin", () => {
  it("builds all unique pairings", () => {
    const pairings = buildRoundRobinPairings(["a", "b", "c"]);
    expect(pairings).toHaveLength(3);
    expect(isRoundRobinComplete(3, 3)).toBe(true);
    expect(isRoundRobinComplete(3, 2)).toBe(false);
  });

  it("awards 3 points for a win", () => {
    expect(ROUND_ROBIN_WIN_POINTS).toBe(3);
    expect(ROUND_ROBIN_LOSS_POINTS).toBe(0);

    const standings = calculateRoundRobinStandings(
      ["a", "b", "c"],
      [
        {
          team1EntryId: "a",
          team2EntryId: "b",
          winnerEntryId: "a",
          team1SetsWon: 3,
          team2SetsWon: 1,
          team1PointsScored: 40,
          team2PointsScored: 30,
        },
        {
          team1EntryId: "a",
          team2EntryId: "c",
          winnerEntryId: "a",
          team1SetsWon: 3,
          team2SetsWon: 0,
          team1PointsScored: 33,
          team2PointsScored: 20,
        },
        {
          team1EntryId: "b",
          team2EntryId: "c",
          winnerEntryId: "b",
          team1SetsWon: 3,
          team2SetsWon: 2,
          team1PointsScored: 50,
          team2PointsScored: 48,
        },
      ],
      { a: "Ali", b: "Bora", c: "Cem" },
    );

    expect(standings[0]!.entryId).toBe("a");
    expect(standings[0]!.points).toBe(6);
    expect(standings[0]!.rank).toBe(1);
    expect(standings[1]!.entryId).toBe("b");
    expect(standings[1]!.points).toBe(3);
  });

  it("breaks ties by set then point then name", () => {
    const standings = calculateRoundRobinStandings(
      ["b", "a"],
      [
        {
          team1EntryId: "a",
          team2EntryId: "b",
          winnerEntryId: "a",
          team1SetsWon: 3,
          team2SetsWon: 0,
          team1PointsScored: 33,
          team2PointsScored: 20,
        },
        {
          // imaginary second result so both have same points? skip — one win each needs 2 matches
          team1EntryId: "a",
          team2EntryId: "b",
          winnerEntryId: "b",
          team1SetsWon: 1,
          team2SetsWon: 3,
          team1PointsScored: 25,
          team2PointsScored: 35,
        },
      ],
      { a: "Zeynep", b: "Ahmet" },
    );
    // Both 3 pts; setDiff: a = (3-0)+(1-3)=1, b = (0-3)+(3-1)=-1 → a first
    expect(standings[0]!.entryId).toBe("a");
    expect(standings[0]!.setDiff).toBe(1);
  });
});

describe("labels", () => {
  it("labels knockout rounds", () => {
    expect(knockoutRoundLabel(3, 3)).toBe("Final");
    expect(knockoutRoundLabel(2, 3)).toBe("Yarı final");
    expect(knockoutRoundLabel(1, 3)).toBe("Çeyrek final");
    expect(knockoutRoundLabel(1, 4)).toBe("1. Tur");
  });
});
