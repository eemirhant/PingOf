"use client";

import { useCallback, useMemo } from "react";

import {
  ChallengeListCard,
  type ChallengeCardData,
  type ChallengeCardUser,
} from "@/components/challenges/challenge-list-card";
import { EmptyState } from "@/components/ui/empty-state";
import { useLiveEvents } from "@/hooks/use-live-events";
import { RealtimeEventType } from "@/domain/realtime";

type ChallengesBoardProps = {
  tab: "incoming" | "outgoing";
  challenges: ChallengeCardData[];
  currentUserId: string;
  selfUser: ChallengeCardUser;
  focusChallengeId: string | null;
};

export function ChallengesBoard({
  tab,
  challenges,
  currentUserId,
  selfUser,
  focusChallengeId,
}: ChallengesBoardProps) {
  const types = useMemo(
    () => [RealtimeEventType.CHALLENGE_UPDATED, RealtimeEventType.MATCH_UPSERTED],
    [],
  );

  const onEvents = useCallback(() => {
    /* RealtimeProvider already soft-refreshes this path */
  }, []);

  useLiveEvents(types, onEvents);

  if (challenges.length === 0) {
    return (
      <EmptyState
        className="mt-6"
        icon="⚔️"
        title={
          tab === "incoming" ? "Gelen teklif yok" : "Gönderilmiş teklif yok"
        }
        description={
          tab === "incoming"
            ? "Birisi sana meydan okuduğunda burada görünür."
            : "Maç Ekle → Meydan Oku ile 1v1 teklif gönderebilirsin."
        }
        actionHref="/matches/new?type=challenge"
        actionLabel="Meydan Oku"
      />
    );
  }

  return (
    <ul className="mt-6 space-y-4">
      {challenges.map((challenge) => (
        <ChallengeListCard
          key={challenge.id}
          challenge={challenge}
          tab={tab}
          currentUserId={currentUserId}
          selfUser={selfUser}
          focused={focusChallengeId === challenge.id}
        />
      ))}
    </ul>
  );
}
