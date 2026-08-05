import { describe, expect, it } from "vitest";

import {
  sanitizeScoreInput,
  syncSetRows,
  type SetDraft,
} from "@/components/matches/set-score-draft";

describe("sanitizeScoreInput", () => {
  it("keeps only digits and does not invent values", () => {
    expect(sanitizeScoreInput("11")).toBe("11");
    expect(sanitizeScoreInput("7")).toBe("7");
    expect(sanitizeScoreInput("13")).toBe("13");
    expect(sanitizeScoreInput("1a9")).toBe("19");
    expect(sanitizeScoreInput("")).toBe("");
    expect(sanitizeScoreInput("9")).toBe("9");
  });
});

describe("syncSetRows", () => {
  it("preserves partial typing on the open set", () => {
    const sets: SetDraft[] = [{ team1Score: "1", team2Score: "" }];
    expect(syncSetRows(sets)).toEqual([{ team1Score: "1", team2Score: "" }]);
  });

  it("preserves multi-digit typing before the other side is filled", () => {
    expect(syncSetRows([{ team1Score: "11", team2Score: "" }])).toEqual([
      { team1Score: "11", team2Score: "" },
    ]);
    expect(syncSetRows([{ team1Score: "", team2Score: "9" }])).toEqual([
      { team1Score: "", team2Score: "9" },
    ]);
    expect(syncSetRows([{ team1Score: "13", team2Score: "" }])).toEqual([
      { team1Score: "13", team2Score: "" },
    ]);
  });

  it("does not replace a typed value with empty or 9", () => {
    const next = syncSetRows([{ team1Score: "7", team2Score: "" }]);
    expect(next[0]?.team1Score).toBe("7");
    expect(next[0]?.team1Score).not.toBe("9");
    expect(next[0]?.team1Score).not.toBe("");
  });

  it("allows clearing and retyping", () => {
    expect(syncSetRows([{ team1Score: "", team2Score: "" }])).toEqual([
      { team1Score: "", team2Score: "" },
    ]);
    expect(syncSetRows([{ team1Score: "1", team2Score: "" }])).toEqual([
      { team1Score: "1", team2Score: "" },
    ]);
  });

  it("adds a new empty row after a valid completed set", () => {
    const result = syncSetRows([{ team1Score: "11", team2Score: "7" }]);
    expect(result).toEqual([
      { team1Score: "11", team2Score: "7" },
      { team1Score: "", team2Score: "" },
    ]);
  });

  it("keeps invalid both-filled scores editable without rewriting", () => {
    expect(syncSetRows([{ team1Score: "10", team2Score: "9" }])).toEqual([
      { team1Score: "10", team2Score: "9" },
    ]);
    expect(syncSetRows([{ team1Score: "12", team2Score: "9" }])).toEqual([
      { team1Score: "12", team2Score: "9" },
    ]);
  });

  it("preserves partial typing after a completed set", () => {
    expect(
      syncSetRows([
        { team1Score: "11", team2Score: "5" },
        { team1Score: "1", team2Score: "" },
      ]),
    ).toEqual([
      { team1Score: "11", team2Score: "5" },
      { team1Score: "1", team2Score: "" },
    ]);
  });
});
