"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { joinPlannedMatchAction, type MatchActionState } from "@/lib/actions/matches";

const initialState: MatchActionState = {};

type JoinMatchButtonProps = {
  matchId: string;
  team?: 1 | 2;
  label?: string;
};

export function JoinMatchButton({
  matchId,
  team,
  label = "Katıl",
}: JoinMatchButtonProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(joinPlannedMatchAction, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="matchId" value={matchId} />
      {team ? <input type="hidden" name="team" value={String(team)} /> : null}
      <button type="submit" className="btn btn-secondary btn-sm" disabled={isPending}>
        {isPending ? "Katılıyor…" : label}
      </button>
      {state.error ? <p className="form-error mt-1 text-xs">{state.error}</p> : null}
      {state.success ? (
        <p className="mt-1 text-xs text-green">{state.success}</p>
      ) : null}
    </form>
  );
}
