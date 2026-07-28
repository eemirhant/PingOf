"use client";

import { useActionState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  setStakeSettledAction,
  type MatchActionState,
} from "@/lib/actions/matches";

const initialState: MatchActionState = {};

type StakeSettleControlsProps = {
  matchId: string;
  stakeNote: string;
  stakeSettled: boolean;
};

export function StakeSettleControls({
  matchId,
  stakeNote,
  stakeSettled,
}: StakeSettleControlsProps) {
  const [state, action, pending] = useActionState(
    setStakeSettledAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      window.location.reload();
    }
  }, [state.success]);

  return (
    <div className="card mt-4 space-y-3 border border-orange/25">
      <div>
        <div className="text-text-muted text-xs font-bold uppercase tracking-wider">
          İddia
        </div>
        <p className="mt-1 text-sm font-semibold text-text-primary">{stakeNote}</p>
        <p className="text-text-secondary mt-1 text-xs">
          Durum:{" "}
          <span className={stakeSettled ? "text-emerald-400" : "text-orange-300"}>
            {stakeSettled ? "Ödendi" : "Ödenmedi"}
          </span>
        </p>
      </div>
      <form action={action} className="flex flex-wrap gap-2">
        <input type="hidden" name="matchId" value={matchId} />
        <input
          type="hidden"
          name="settled"
          value={stakeSettled ? "false" : "true"}
        />
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending
            ? "Güncelleniyor…"
            : stakeSettled
              ? "Ödenmedi olarak işaretle"
              : "Ödendi olarak işaretle"}
        </Button>
      </form>
      {state.error ? (
        <p className="text-sm text-rose-400" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}

/** Read-only stake badge for lists / non-participants. */
export function StakeNoteBadge({
  stakeNote,
  stakeSettled,
  completed,
}: {
  stakeNote: string | null | undefined;
  stakeSettled?: boolean;
  completed?: boolean;
}) {
  if (!stakeNote) return null;
  const label =
    completed && stakeSettled
      ? "İddia · Ödendi"
      : completed
        ? "İddia · Ödenmedi"
        : "İddia";
  return (
    <span className="badge" title={stakeNote}>
      {label}
    </span>
  );
}
