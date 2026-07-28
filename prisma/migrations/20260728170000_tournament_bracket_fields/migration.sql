-- AlterTable
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "tournamentRound" INTEGER;
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "bracketSlot" INTEGER;

-- AlterTable
ALTER TABLE "TournamentParticipant" ADD COLUMN IF NOT EXISTS "seed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TournamentParticipant" ADD COLUMN IF NOT EXISTS "pairIndex" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TournamentParticipant_tournamentId_seed_idx" ON "TournamentParticipant"("tournamentId", "seed");
