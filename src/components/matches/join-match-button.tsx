"use client";

import { useActionState, useEffect, useState } from "react";

import { joinPlannedMatchAction, type MatchActionState } from "@/lib/actions/matches";

const initialState: MatchActionState = {};

type JoinMatchButtonProps = {
  matchId: string;
  team?: 1 | 2;
  label?: string;
  onJoined?: () => void;
  onOptimisticStart?: () => void;
  onOptimisticRollback?: () => void;
};

export function JoinMatchButton({
  matchId,
  team,
  label = "Katıl",
  onJoined,
  onOptimisticStart,
  onOptimisticRollback,
}: JoinMatchButtonProps) {
  const [state, formAction, isPending] = useActionState(
    joinPlannedMatchAction,
    initialState,
  );
  const [optimisticJoined, setOptimisticJoined] = useState(false);

  useEffect(() => {
    if (state.error) {
      setOptimisticJoined(false);
      onOptimisticRollback?.();
    }
  }, [state.error, onOptimisticRollback]);

  useEffect(() => {
    if (state.success) {
      setOptimisticJoined(true);
      onJoined?.();
    }
  }, [state.success, onJoined]);

  if (optimisticJoined || state.success) {
    return (
      <div className="live-card--pulse text-center" role="status">
        <span className="badge badge-win">Oyuncu Hazır</span>
        <p className="mt-1 text-xs text-emerald-400">Katıldın</p>
      </div>
    );
  }

  return (
    <form
      action={(fd) => {
        setOptimisticJoined(true);
        onOptimisticStart?.();
        formAction(fd);
      }}
      className="inline"
    >
      <input type="hidden" name="matchId" value={matchId} />
      {team ? <input type="hidden" name="team" value={String(team)} /> : null}
      <button
        type="submit"
        className="btn btn-secondary btn-sm"
        disabled={isPending || optimisticJoined}
      >
        {isPending ? "Katılıyor…" : label}
      </button>
      {state.error ? (
        <p className="form-error mt-1 text-xs">{state.error}</p>
      ) : null}
    </form>
  );
}
