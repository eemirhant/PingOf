"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  cancelChallengeAction,
  type ChallengeActionState,
} from "@/lib/actions/challenges";

const initialState: ChallengeActionState = {};

type ChallengeCancelButtonProps = {
  challengeId: string;
  onCancelled?: () => void;
};

export function ChallengeCancelButton({
  challengeId,
  onCancelled,
}: ChallengeCancelButtonProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [, startTransition] = useTransition();

  const [state, formAction, isPending] = useActionState(
    cancelChallengeAction,
    initialState,
  );

  useEffect(() => {
    if (state.error) {
      setCancelled(false);
      startTransition(() => {
        router.refresh();
      });
    }
  }, [state.error, router]);

  useEffect(() => {
    if (state.success) {
      setCancelled(true);
      setShowConfirm(false);
      onCancelled?.();
    }
  }, [state.success, onCancelled]);

  if (cancelled || state.success) {
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="badge badge-loss live-card--pulse" role="status">
          İptal edildi
        </span>
        {state.success ? (
          <p className="text-xs text-green" role="status">
            {state.success}
          </p>
        ) : null}
      </div>
    );
  }

  if (!showConfirm) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          className="btn btn-danger btn-sm min-h-11"
          onClick={() => setShowConfirm(true)}
          disabled={isPending}
        >
          Meydan Okumayı İptal Et
        </button>
        {state.error ? (
          <p className="form-error text-xs" role="alert">
            {state.error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-xs rounded-md border p-3 sm:w-auto"
      style={{
        background: "rgba(244,63,94,0.06)",
        borderColor: "rgba(244,63,94,0.25)",
      }}
    >
      <p className="mb-3 text-xs text-text-secondary">
        Bu meydan okumayı iptal etmek istediğinize emin misiniz?
      </p>
      <form
        action={(fd) => {
          setCancelled(true);
          onCancelled?.();
          formAction(fd);
        }}
        className="flex gap-2"
      >
        <input type="hidden" name="challengeId" value={challengeId} />
        <button
          type="button"
          className="btn btn-secondary btn-sm min-h-11 flex-1"
          onClick={() => setShowConfirm(false)}
          disabled={isPending}
        >
          Vazgeç
        </button>
        <button
          type="submit"
          className="btn btn-danger btn-sm min-h-11 flex-1"
          disabled={isPending}
        >
          {isPending ? "İptal ediliyor…" : "İptal"}
        </button>
      </form>
      {state.error ? (
        <p className="form-error mt-2 text-xs" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
