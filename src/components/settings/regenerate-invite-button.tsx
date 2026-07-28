"use client";

import { useActionState, useEffect, useState } from "react";

import {
  regenerateInviteAction,
  type RegenerateInviteState,
} from "@/lib/actions/join";

const initialState: RegenerateInviteState = {};

type RegenerateInviteButtonProps = {
  currentInviteCode: string;
};

export function RegenerateInviteButton({ currentInviteCode }: RegenerateInviteButtonProps) {
  const [state, formAction, isPending] = useActionState(regenerateInviteAction, initialState);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (state.success) {
      setShowConfirm(false);
    }
  }, [state.success, state.inviteCode]);

  if (!showConfirm) {
    return (
      <div className="flex-1">
        <button
          type="button"
          className="btn btn-danger btn-sm w-full"
          onClick={() => setShowConfirm(true)}
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
          </svg>
          Linki Sıfırla
        </button>
        {state.success ? (
          <p className="mt-2 text-xs text-green">{state.success}</p>
        ) : null}
        {state.error ? <p className="form-error mt-2">{state.error}</p> : null}
        {!state.success && !state.error ? (
          <p className="text-text-muted mt-1 text-[0.7rem]">Kod: {currentInviteCode}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="flex-1 rounded-md border p-3"
      style={{
        background: "rgba(244,63,94,0.06)",
        borderColor: "rgba(244,63,94,0.25)",
      }}
    >
      <p className="mb-3 text-xs text-text-secondary">
        Davet linkini sıfırlamak istediğine emin misin? Eski link geçersiz olacak.
      </p>
      <form action={formAction} className="flex gap-2">
        <button
          type="button"
          className="btn btn-secondary btn-sm flex-1"
          onClick={() => setShowConfirm(false)}
          disabled={isPending}
        >
          Vazgeç
        </button>
        <button type="submit" className="btn btn-danger btn-sm flex-1" disabled={isPending}>
          {isPending ? "Sıfırlanıyor…" : "Evet, sıfırla"}
        </button>
      </form>
    </div>
  );
}
