const { config } = require("dotenv");
const { PrismaClient } = require("@prisma/client");
const path = require("path");

// Force .env over any inherited shell DATABASE_URL
config({ path: path.join(__dirname, ".env"), override: true });

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Challenge"
      ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log("OK: Challenge.createdAt ready");

    // Also ensure Match.createdAt exists (US-8 migration may be pending)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Match"
      ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log("OK: Match.createdAt ready");

    // Mark migrations applied if table exists
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
        SELECT gen_random_uuid()::text, '', NOW(), '20260728150000_challenge_created_at', NULL, NULL, NOW(), 1
        WHERE NOT EXISTS (
          SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20260728150000_challenge_created_at'
        );
      `);
      console.log("OK: migration record noted");
    } catch (e) {
      console.log("NOTE: could not update _prisma_migrations (" + (e.code || "skip") + ")");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("FAIL:", e.code || e.message);
  process.exit(1);
});
