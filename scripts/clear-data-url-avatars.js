/**
 * Clear base64 data-URL avatars/logos from DB (they break JWT cookies).
 * Users keep color initials until they re-upload a file-based photo.
 */
const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({ select: { id: true, avatarUrl: true } });
    let clearedUsers = 0;
    for (const user of users) {
      if (user.avatarUrl && user.avatarUrl.startsWith("data:")) {
        await prisma.user.update({
          where: { id: user.id },
          data: { avatarUrl: null },
        });
        clearedUsers += 1;
      }
    }

    const orgs = await prisma.organization.findMany({ select: { id: true, logoUrl: true } });
    let clearedOrgs = 0;
    for (const org of orgs) {
      if (org.logoUrl && org.logoUrl.startsWith("data:")) {
        await prisma.organization.update({
          where: { id: org.id },
          data: { logoUrl: null },
        });
        clearedOrgs += 1;
      }
    }

    console.log(`Cleared ${clearedUsers} user avatar(s), ${clearedOrgs} org logo(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
