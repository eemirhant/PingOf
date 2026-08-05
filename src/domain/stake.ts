/**
 * Stake (iddia) settlement authorization — pure helpers.
 * Only the winning side may mark a stake as paid.
 */

export type StakeParticipant = {
  userId: string;
  team: number;
};

export type StakeSettleContext = {
  matchStatus: "PLANNED" | "PENDING" | "COMPLETED" | "CANCELLED";
  stakeNote: string | null | undefined;
  stakeSettled: boolean;
  winnerTeam: number | null | undefined;
  actorUserId: string;
  participants: StakeParticipant[];
};

/** True when the actor is on the winning team of a completed match. */
export function isWinningStakeParticipant(
  actorUserId: string,
  winnerTeam: number | null | undefined,
  participants: StakeParticipant[],
): boolean {
  if (winnerTeam !== 1 && winnerTeam !== 2) return false;
  return participants.some(
    (p) => p.userId === actorUserId && p.team === winnerTeam,
  );
}

/**
 * Whether the actor may mark the stake as paid (Ödendi).
 * Unsettling is not allowed — once paid, it stays paid.
 */
export function canMarkStakeSettled(ctx: StakeSettleContext): boolean {
  if (!ctx.stakeNote) return false;
  if (ctx.stakeSettled) return false;
  if (ctx.matchStatus !== "COMPLETED") return false;
  return isWinningStakeParticipant(
    ctx.actorUserId,
    ctx.winnerTeam,
    ctx.participants,
  );
}

/** Turkish denial reason for UI / API errors (null when allowed). */
export function stakeSettleDenialReason(ctx: StakeSettleContext): string | null {
  if (!ctx.stakeNote) {
    return "Bu maçta iddia yok";
  }
  if (ctx.matchStatus !== "COMPLETED") {
    return "İddia yalnızca tamamlanmış maçlarda işaretlenebilir";
  }
  if (ctx.stakeSettled) {
    return "İddia zaten ödendi olarak işaretlenmiş";
  }
  const isParticipant = ctx.participants.some((p) => p.userId === ctx.actorUserId);
  if (!isParticipant) {
    return "İddiayı yalnızca maçın tarafları işaretleyebilir";
  }
  if (!isWinningStakeParticipant(ctx.actorUserId, ctx.winnerTeam, ctx.participants)) {
    return "İddianın ödendiğini yalnızca kazanan taraf onaylayabilir";
  }
  return null;
}
