export type CelebrationVariant = "win" | "loss" | "champion";

export type CelebrationPlayer = {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
};

export type CelebrationPayload = {
  /** Match the form was submitted for (create may use "pending"). */
  matchId: string;
  variant: CelebrationVariant;
  /** e.g. "3-1" */
  scoreLabel: string;
  /** Winning / celebrating player (current user when they won). */
  player?: CelebrationPlayer;
  tournamentName?: string | null;
  createdAt: number;
};

export const CELEBRATION_STORAGE_KEY = "pingof:match-celebration";
export const CELEBRATION_TTL_MS = 45_000;
