-- CreateTable
CREATE TABLE "OrgRealtimeEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entityId" TEXT,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgRealtimeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrgRealtimeEvent_organizationId_createdAt_idx" ON "OrgRealtimeEvent"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "OrgRealtimeEvent" ADD CONSTRAINT "OrgRealtimeEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
