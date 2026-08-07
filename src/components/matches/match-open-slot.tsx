"use client";

import { useState } from "react";

import { JoinMatchButton } from "@/components/matches/join-match-button";

type MatchOpenSlotProps = {
  matchId: string;
  team: 1 | 2;
  canJoin: boolean;
};

/**
 * Open roster slot: "Oyuncu Bekleniyor" → "Oyuncu Hazır" after join settles.
 * Keep the join form mounted until success so the action can complete.
 */
export function MatchOpenSlot({ matchId, team, canJoin }: MatchOpenSlotProps) {
  const [ready, setReady] = useState(false);
  const [joining, setJoining] = useState(false);

  if (ready) {
    return (
      <div className="mb-2 flex flex-col items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-2 py-3 live-card--pulse">
        <div className="text-sm font-semibold text-emerald-400">Oyuncu Hazır</div>
      </div>
    );
  }

  return (
    <div className="mb-2 flex flex-col items-center gap-2 rounded-md border border-dashed border-border px-2 py-3 live-card">
      <div className="text-text-muted text-sm">
        {joining ? "Katılıyor…" : "Oyuncu Bekleniyor"}
      </div>
      {canJoin ? (
        <JoinMatchButton
          matchId={matchId}
          team={team}
          label="Bu tarafa katıl"
          onOptimisticStart={() => setJoining(true)}
          onOptimisticRollback={() => setJoining(false)}
          onJoined={() => {
            setJoining(false);
            setReady(true);
          }}
        />
      ) : (
        <span className="text-text-muted text-xs">Slot açık</span>
      )}
    </div>
  );
}
