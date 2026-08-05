-- CreateTable
CREATE TABLE "UserNotificationSettings" (
    "userId" TEXT NOT NULL,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "dndEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dndStartMin" INTEGER NOT NULL DEFAULT 1320,
    "dndEndMin" INTEGER NOT NULL DEFAULT 480,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotificationSettings_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "UserNotificationSettings" ADD CONSTRAINT "UserNotificationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
