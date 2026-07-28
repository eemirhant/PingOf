"use client";

import { useActionState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  cancelTournamentAction,
  shuffleTournamentAction,
  startTournamentAction,
  type TournamentActionState,
} from "@/lib/actions/tournaments";

const initialState: TournamentActionState = {};

function ActionFeedback({ state }: { state: TournamentActionState }) {
  if (state.error) {
    return (
      <p className="text-sm font-medium text-rose-400" role="alert">
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p className="text-sm font-medium text-emerald-400" role="status">
        {state.success}
      </p>
    );
  }
  return null;
}

export function TournamentDraftActions({
  tournamentId,
  canCancel,
}: {
  tournamentId: string;
  canCancel: boolean;
}) {
  const [startState, startAction, startPending] = useActionState(
    startTournamentAction,
    initialState,
  );
  const [shuffleState, shuffleAction, shufflePending] = useActionState(
    shuffleTournamentAction,
    initialState,
  );
  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelTournamentAction,
    initialState,
  );

  useEffect(() => {
    if (startState.success || shuffleState.success || cancelState.success) {
      window.location.reload();
    }
  }, [startState.success, shuffleState.success, cancelState.success]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <form action={startAction}>
          <input type="hidden" name="tournamentId" value={tournamentId} />
          <Button type="submit" disabled={startPending}>
            {startPending ? "Başlatılıyor…" : "Turnuvayı başlat"}
          </Button>
        </form>
        <form action={shuffleAction}>
          <input type="hidden" name="tournamentId" value={tournamentId} />
          <Button type="submit" variant="secondary" disabled={shufflePending}>
            {shufflePending ? "Karıştırılıyor…" : "Eşleşmeleri karıştır"}
          </Button>
        </form>
        {canCancel ? (
          <form
            action={cancelAction}
            onSubmit={(e) => {
              if (!window.confirm("Turnuvayı iptal etmek istediğine emin misin?")) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="tournamentId" value={tournamentId} />
            <Button type="submit" variant="secondary" disabled={cancelPending}>
              {cancelPending ? "İptal ediliyor…" : "İptal et"}
            </Button>
          </form>
        ) : null}
      </div>
      <ActionFeedback state={startState} />
      <ActionFeedback state={shuffleState} />
      <ActionFeedback state={cancelState} />
    </div>
  );
}

export function TournamentCancelButton({
  tournamentId,
}: {
  tournamentId: string;
}) {
  const [state, action, pending] = useActionState(
    cancelTournamentAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) window.location.reload();
  }, [state.success]);

  return (
    <div className="space-y-2">
      <form
        action={action}
        onSubmit={(e) => {
          if (!window.confirm("Turnuvayı iptal etmek istediğine emin misin?")) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="tournamentId" value={tournamentId} />
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "İptal ediliyor…" : "Turnuvayı iptal et"}
        </Button>
      </form>
      <ActionFeedback state={state} />
    </div>
  );
}
