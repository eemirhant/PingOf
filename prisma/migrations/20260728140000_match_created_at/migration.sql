-- AlterTable
ALTER TABLE "Match" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill existing rows: treat previous updatedAt as creation time so
-- "edited" detection (updatedAt - createdAt > 2s) stays false until a real edit.
UPDATE "Match" SET "createdAt" = COALESCE("playedAt", "updatedAt");
