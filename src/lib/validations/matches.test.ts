import { describe, expect, it } from "vitest";

import { instantMatchSchema, teamNameSchema } from "@/lib/validations/matches";

describe("teamNameSchema", () => {
  it("trims and accepts Turkish characters", () => {
    const result = teamNameSchema.safeParse("  Kırmızı Şimşekler  ");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("Kırmızı Şimşekler");
  });

  it("converts blank strings to null", () => {
    expect(teamNameSchema.safeParse("   ").success).toBe(true);
    expect(teamNameSchema.parse("   ")).toBeNull();
    expect(teamNameSchema.parse(null)).toBeNull();
  });

  it("rejects names longer than 50 characters", () => {
    expect(teamNameSchema.safeParse("x".repeat(51)).success).toBe(false);
  });
});

describe("instantMatchSchema team names", () => {
  const baseSets = [
    { team1Score: 11, team2Score: 5 },
    { team1Score: 11, team2Score: 7 },
    { team1Score: 11, team2Score: 9 },
  ];

  it("allows doubles without team names", () => {
    const result = instantMatchSchema.safeParse({
      format: "DOUBLES",
      team1PlayerIds: ["a", "b"],
      team2PlayerIds: ["c", "d"],
      sets: baseSets,
      stakeNote: "",
      team1Name: "",
      team2Name: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.team1Name).toBeNull();
      expect(result.data.team2Name).toBeNull();
    }
  });

  it("stores doubles team names", () => {
    const result = instantMatchSchema.safeParse({
      format: "DOUBLES",
      team1PlayerIds: ["a", "b"],
      team2PlayerIds: ["c", "d"],
      sets: baseSets,
      stakeNote: null,
      team1Name: "Kırmızı Şimşekler",
      team2Name: "Mavi Kaplanlar",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.team1Name).toBe("Kırmızı Şimşekler");
      expect(result.data.team2Name).toBe("Mavi Kaplanlar");
    }
  });

  it("clears team names for singles", () => {
    const result = instantMatchSchema.safeParse({
      format: "SINGLES",
      team1PlayerIds: ["a"],
      team2PlayerIds: ["b"],
      sets: baseSets,
      stakeNote: null,
      team1Name: "ShouldNotPersist",
      team2Name: "AlsoNo",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.team1Name).toBeNull();
      expect(result.data.team2Name).toBeNull();
    }
  });
});
