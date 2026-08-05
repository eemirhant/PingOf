import { describe, expect, it } from "vitest";

import {
  formatMatchDefeatNotificationBody,
  formatTeamLabel,
  formatWinnerLabel,
} from "@/lib/matches/display";

const doublesParticipants = [
  { team: 1, user: { fullName: "Emirhan" } },
  { team: 1, user: { fullName: "Ahmet" } },
  { team: 2, user: { fullName: "Mehmet" } },
  { team: 2, user: { fullName: "Can" } },
];

describe("formatTeamLabel", () => {
  it("joins both player names when no team name is set", () => {
    expect(formatTeamLabel(doublesParticipants, 1)).toBe("Emirhan & Ahmet");
    expect(formatTeamLabel(doublesParticipants, 2)).toBe("Mehmet & Can");
  });

  it("prefers custom team name when provided", () => {
    expect(formatTeamLabel(doublesParticipants, 1, "Kırmızı Şimşekler")).toBe(
      "Kırmızı Şimşekler",
    );
  });

  it("ignores blank team names", () => {
    expect(formatTeamLabel(doublesParticipants, 1, "   ")).toBe("Emirhan & Ahmet");
  });

  it("does not affect singles (single name)", () => {
    const singles = [
      { team: 1, user: { fullName: "Emirhan" } },
      { team: 2, user: { fullName: "Ahmet" } },
    ];
    expect(formatTeamLabel(singles, 1)).toBe("Emirhan");
    expect(formatTeamLabel(singles, 1, null)).toBe("Emirhan");
  });
});

describe("formatWinnerLabel", () => {
  it("uses both winners when no team name", () => {
    expect(formatWinnerLabel(doublesParticipants, 1)).toBe("Emirhan & Ahmet kazandı");
  });

  it("uses team name when set", () => {
    expect(
      formatWinnerLabel(doublesParticipants, 1, {
        team1Name: "Kırmızı Şimşekler",
        team2Name: "Mavi Kaplanlar",
      }),
    ).toBe("Kırmızı Şimşekler kazandı");
  });
});

describe("formatMatchDefeatNotificationBody", () => {
  it("uses team names for doubles when present", () => {
    expect(
      formatMatchDefeatNotificationBody({
        participants: doublesParticipants,
        winnerTeam: 1,
        team1SetsWon: 3,
        team2SetsWon: 1,
        teamNames: {
          team1Name: "Kırmızı Şimşekler",
          team2Name: "Mavi Kaplanlar",
        },
        format: "DOUBLES",
      }),
    ).toBe("Kırmızı Şimşekler, Mavi Kaplanlar takımını 3-1 mağlup etti.");
  });

  it("falls back to player names for doubles", () => {
    expect(
      formatMatchDefeatNotificationBody({
        participants: doublesParticipants,
        winnerTeam: 1,
        team1SetsWon: 3,
        team2SetsWon: 1,
        format: "DOUBLES",
      }),
    ).toBe("Emirhan & Ahmet, Mehmet & Can takımını 3-1 mağlup etti.");
  });
});
