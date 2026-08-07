"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  acceptChallengeAction,
  declineChallengeAction,
  type ChallengeActionState,
} from "@/lib/actions/challenges";
import { useRealtime } from "@/components/realtime/realtime-provider";

const initialState: ChallengeActionState = {};

type ChallengeRespondButtonsProps = {
  challengeId: string;
  onOutcome?: (outcome: "accepted" | "declined") => void;
};

type LocalOutcome = "accepted" | "declined" | null;

export function ChallengeRespondButtons({
  challengeId,
  onOutcome,
}: ChallengeRespondButtonsProps) {
  const router = useRouter();
  const { setPendingChallengesOptimistic } = useRealtime();
  const [outcome, setOutcome] = useState<LocalOutcome>(null);
  const [, startTransition] = useTransition();

  const [acceptState, acceptAction, acceptPending] = useActionState(
    acceptChallengeAction,
    initialState,
  );
  const [declineState, declineAction, declinePending] = useActionState(
    declineChallengeAction,
    initialState,
  );

  useEffect(() => {
    if (acceptState.error || declineState.error) {
      setOutcome(null);
      setPendingChallengesOptimistic((n) => n + 1);
      startTransition(() => {
        router.refresh();
      });
    }
  }, [
    acceptState.error,
    declineState.error,
    router,
    setPendingChallengesOptimistic,
  ]);

  const pending = acceptPending || declinePending;
  const error = acceptState.error ?? declineState.error;
  const locked = pending || outcome != null;

  if (outcome === "accepted") {
    return (
      <span className="badge badge-win live-card--pulse" role="status">
        Kabul edildi
      </span>
    );
  }

  if (outcome === "declined") {
    return (
      <span className="badge badge-loss live-card--pulse" role="status">
        Kabul edilmedi
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <form
        action={(fd) => {
          setOutcome("accepted");
          setPendingChallengesOptimistic((n) => Math.max(0, n - 1));
          onOutcome?.("accepted");
          acceptAction(fd);
        }}
      >
        <input type="hidden" name="challengeId" value={challengeId} />
        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={locked}
        >
          {acceptPending ? "Kabul…" : "Kabul Et"}
        </button>
      </form>
      <form
        action={(fd) => {
          setOutcome("declined");
          setPendingChallengesOptimistic((n) => Math.max(0, n - 1));
          onOutcome?.("declined");
          declineAction(fd);
        }}
      >
        <input type="hidden" name="challengeId" value={challengeId} />
        <button
          type="submit"
          className="btn btn-danger btn-sm"
          disabled={locked}
        >
          {declinePending ? "Red…" : "Reddet"}
        </button>
      </form>
      {error ? <p className="form-error w-full text-xs">{error}</p> : null}
    </div>
  );
}
