"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
  /** Winning-side participant who may mark as paid. */
  canSettle: boolean;
};

export function StakeSettleControls({
  matchId,
  stakeNote,
  stakeSettled,
  canSettle,
}: StakeSettleControlsProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    setStakeSettledAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

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

      {stakeSettled ? (
        <span className="badge badge-win">Ödendi</span>
      ) : canSettle ? (
        <form action={action} className="flex flex-wrap gap-2">
          <input type="hidden" name="matchId" value={matchId} />
          <input type="hidden" name="settled" value="true" />
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            {pending ? "Güncelleniyor…" : "İddiayı Ödendi Olarak İşaretle"}
          </Button>
        </form>
      ) : (
        <p className="text-text-muted text-xs" role="note">
          İddianın ödendiğini yalnızca kazanan taraf onaylayabilir.
        </p>
      )}

      {state.error ? (
        <p className="text-sm text-rose-400" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-400" role="status">
          {state.success}
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
    <span className={`badge ${completed && stakeSettled ? "badge-win" : ""}`} title={stakeNote}>
      {label}
    </span>
  );
}
