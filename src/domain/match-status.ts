/**
 * Match status state machine (PRD US-10 / KK-10).
 * Pure functions — no UI / Prisma / React dependencies.
 */

export type MatchStatusValue = "PLANNED" | "PENDING" | "COMPLETED" | "CANCELLED";
export type MatchFormatValue = "SINGLES" | "DOUBLES";

/**
 * Lazy promotion: PLANNED becomes PENDING when scheduledAt has arrived,
 * or immediately when no scheduledAt is set (no clock to wait for).
 * Other statuses are unchanged.
 */
export function resolveMatchStatus(
  status: MatchStatusValue,
  scheduledAt: Date | null | undefined,
  now: Date = new Date(),
): MatchStatusValue {
  if (status !== "PLANNED") return status;
  if (!scheduledAt) return "PENDING";
  if (scheduledAt.getTime() <= now.getTime()) return "PENDING";
  return status;
}

/**
 * True when a match belongs in "Yaklaşan" lists:
 * future scheduledAt, not completed/cancelled (caller filters status).
 */
export function isFutureScheduledMatch(
  scheduledAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!scheduledAt) return false;
  return scheduledAt.getTime() > now.getTime();
}

/** True when time-based reminders / "starts soon" logic may run. */
export function hasMatchClockTime(scheduledAt: Date | null | undefined): boolean {
  return scheduledAt != null && !Number.isNaN(scheduledAt.getTime());
}

export function canCancelMatch(status: MatchStatusValue): boolean {
  return status === "PLANNED" || status === "PENDING";
}

export function requiredPlayersForFormat(format: MatchFormatValue): number {
  return format === "SINGLES" ? 2 : 4;
}

export function playersPerTeam(format: MatchFormatValue): number {
  return format === "SINGLES" ? 1 : 2;
}

export function isRosterFull(
  format: MatchFormatValue,
  participantCount: number,
): boolean {
  return participantCount >= requiredPlayersForFormat(format);
}

/**
 * Result entry only after match time (PENDING), never while still PLANNED.
 * Challenge / planned matches stay locked until scheduledAt arrives.
 */
export function canEnterResult(
  status: MatchStatusValue,
  format: MatchFormatValue,
  participantCount: number,
): boolean {
  if (status !== "PENDING") return false;
  return isRosterFull(format, participantCount);
}

/** True when roster is full but match time has not started yet. */
export function isWaitingForMatchTime(
  status: MatchStatusValue,
  format: MatchFormatValue,
  participantCount: number,
): boolean {
  return (
    status === "PLANNED" && isRosterFull(format, participantCount)
  );
}

export function canJoinOpenSlot(
  status: MatchStatusValue,
  format: MatchFormatValue,
  participantCount: number,
  alreadyParticipant: boolean,
): boolean {
  if (alreadyParticipant) return false;
  if (status !== "PLANNED" && status !== "PENDING") return false;
  return participantCount < requiredPlayersForFormat(format);
}

/**
 * Pick next team for an open join: prefer team with fewer players,
 * tie → team 1. Returns null if full.
 */
export function nextOpenTeam(
  format: MatchFormatValue,
  team1Count: number,
  team2Count: number,
): 1 | 2 | null {
  const perTeam = playersPerTeam(format);
  if (team1Count < perTeam) return 1;
  if (team2Count < perTeam) return 2;
  return null;
}

export function matchStatusLabel(status: MatchStatusValue): string {
  switch (status) {
    case "PLANNED":
      return "Planlandı";
    case "PENDING":
      return "Oynanmayı bekliyor";
    case "COMPLETED":
      return "Tamamlandı";
    case "CANCELLED":
      return "İptal";
    default:
      return status;
  }
}
