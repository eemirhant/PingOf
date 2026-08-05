import {
  REALTIME_EVENT_TTL_MS,
  type RealtimeEventTypeValue,
} from "@/domain/realtime";
import { prisma } from "@/lib/db";

export type PublishOrgEventOptions = {
  entityId?: string | null;
  actorUserId?: string | null;
};

/**
 * Best-effort org event publish for realtime polling.
 * Never throws to callers — realtime must not break business writes.
 */
export async function publishOrgEvent(
  organizationId: string,
  type: RealtimeEventTypeValue,
  options: PublishOrgEventOptions = {},
): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - REALTIME_EVENT_TTL_MS);

    await prisma.$transaction([
      prisma.orgRealtimeEvent.deleteMany({
        where: {
          organizationId,
          createdAt: { lt: cutoff },
        },
      }),
      prisma.orgRealtimeEvent.create({
        data: {
          organizationId,
          type,
          entityId: options.entityId ?? null,
          actorUserId: options.actorUserId ?? null,
        },
      }),
    ]);
  } catch (error) {
    console.error("[realtime] publishOrgEvent failed", type, error);
  }
}
