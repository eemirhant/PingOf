"use client";

import { useActionState, useState } from "react";

import { cancelMatchAction, type MatchActionState } from "@/lib/actions/matches";

const initialState: MatchActionState = {};

type CancelMatchButtonProps = {
  matchId: string;
};

export function CancelMatchButton({ matchId }: CancelMatchButtonProps) {
  const [state, formAction, isPending] = useActionState(cancelMatchAction, initialState);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!showConfirm) {
    return (
      <div>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={() => setShowConfirm(true)}
        >
          İptal Et
        </button>
        {state.error ? <p className="form-error mt-2">{state.error}</p> : null}
      </div>
    );
  }

  return (
    <div
      className="rounded-md border p-3"
      style={{
        background: "rgba(244,63,94,0.06)",
        borderColor: "rgba(244,63,94,0.25)",
      }}
    >
      <p className="mb-3 text-xs text-text-secondary">
        Bu planlanan maçı iptal etmek istediğine emin misin? Katılımcılara bildirim gider.
      </p>
      <form action={formAction} className="flex gap-2">
        <input type="hidden" name="matchId" value={matchId} />
        <button
          type="button"
          className="btn btn-secondary btn-sm flex-1"
          onClick={() => setShowConfirm(false)}
          disabled={isPending}
        >
          Vazgeç
        </button>
        <button type="submit" className="btn btn-danger btn-sm flex-1" disabled={isPending}>
          {isPending ? "İptal ediliyor…" : "Evet, iptal et"}
        </button>
      </form>
      {state.error ? <p className="form-error mt-2">{state.error}</p> : null}
    </div>
  );
}
