export type BracketMatchTone = "active" | "completed" | "pending" | "cancelled";

export type BracketPlayerView = {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  avatarColor: string | null;
};

export type BracketSideView = {
  label: string;
  isWinner: boolean;
  isLoser: boolean;
  isEmpty: boolean;
  players: BracketPlayerView[];
  /** e.g. "Seri #1" when tournament seed is known */
  seedLabel: string | null;
};

export type BracketMatchCardProps = {
  matchId: string;
  href: string;
  side1: BracketSideView;
  side2: BracketSideView;
  scoreLabel: string | null;
  metaLine: string | null;
  tone: BracketMatchTone;
  statusLabel: string;
  isBye?: boolean;
};
