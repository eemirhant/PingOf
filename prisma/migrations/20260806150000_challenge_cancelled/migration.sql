-- Allow sender to cancel a pending challenge (US-11 extension).

ALTER TYPE "ChallengeStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
