/**
 * One-shot: add Organization.logoUrl if missing (when migrate deploy is awkward).
 * Run: node scripts/apply-logo-url.js
 */
const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT`,
    );
    console.log("OK: Organization.logoUrl ready");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
