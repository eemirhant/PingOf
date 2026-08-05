import { describe, expect, it } from "vitest";

import {
  canMarkStakeSettled,
  isWinningStakeParticipant,
  stakeSettleDenialReason,
} from "@/domain/stake";

const singles = [
  { userId: "winner", team: 1 },
  { userId: "loser", team: 2 },
];

const doubles = [
  { userId: "w1", team: 1 },
  { userId: "w2", team: 1 },
  { userId: "l1", team: 2 },
  { userId: "l2", team: 2 },
];

describe("isWinningStakeParticipant", () => {
  it("detects 1v1 winner", () => {
    expect(isWinningStakeParticipant("winner", 1, singles)).toBe(true);
    expect(isWinningStakeParticipant("loser", 1, singles)).toBe(false);
  });

  it("detects 2v2 winning team members", () => {
    expect(isWinningStakeParticipant("w1", 1, doubles)).toBe(true);
    expect(isWinningStakeParticipant("w2", 1, doubles)).toBe(true);
    expect(isWinningStakeParticipant("l1", 1, doubles)).toBe(false);
    expect(isWinningStakeParticipant("l2", 1, doubles)).toBe(false);
  });

  it("rejects missing winner team", () => {
    expect(isWinningStakeParticipant("winner", null, singles)).toBe(false);
  });
});

describe("canMarkStakeSettled", () => {
  const base = {
    matchStatus: "COMPLETED" as const,
    stakeNote: "Kahve",
    stakeSettled: false,
    winnerTeam: 1,
    participants: singles,
  };

  it("allows winning player when unpaid", () => {
    expect(canMarkStakeSettled({ ...base, actorUserId: "winner" })).toBe(true);
  });

  it("denies loser", () => {
    expect(canMarkStakeSettled({ ...base, actorUserId: "loser" })).toBe(false);
  });

  it("denies when already settled", () => {
    expect(
      canMarkStakeSettled({ ...base, actorUserId: "winner", stakeSettled: true }),
    ).toBe(false);
  });

  it("denies incomplete matches", () => {
    expect(
      canMarkStakeSettled({
        ...base,
        actorUserId: "winner",
        matchStatus: "PENDING",
      }),
    ).toBe(false);
  });

  it("allows both winners in doubles", () => {
    expect(
      canMarkStakeSettled({
        ...base,
        participants: doubles,
        actorUserId: "w1",
      }),
    ).toBe(true);
    expect(
      canMarkStakeSettled({
        ...base,
        participants: doubles,
        actorUserId: "w2",
      }),
    ).toBe(true);
    expect(
      canMarkStakeSettled({
        ...base,
        participants: doubles,
        actorUserId: "l1",
      }),
    ).toBe(false);
  });
});

describe("stakeSettleDenialReason", () => {
  it("explains winner-only rule", () => {
    expect(
      stakeSettleDenialReason({
        matchStatus: "COMPLETED",
        stakeNote: "Kahve",
        stakeSettled: false,
        winnerTeam: 1,
        actorUserId: "loser",
        participants: singles,
      }),
    ).toBe("İddianın ödendiğini yalnızca kazanan taraf onaylayabilir");
  });

  it("explains already settled", () => {
    expect(
      stakeSettleDenialReason({
        matchStatus: "COMPLETED",
        stakeNote: "Kahve",
        stakeSettled: true,
        winnerTeam: 1,
        actorUserId: "winner",
        participants: singles,
      }),
    ).toBe("İddia zaten ödendi olarak işaretlenmiş");
  });
});
