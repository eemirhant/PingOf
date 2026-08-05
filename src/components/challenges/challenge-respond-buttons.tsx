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
};

type LocalOutcome = "accepted" | "declined" | null;

export function ChallengeRespondButtons({ challengeId }: ChallengeRespondButtonsProps) {
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

  useEffect(() => {
    if (declineState.success || acceptState.success) {
      startTransition(() => {
        router.refresh();
      });
    }
  }, [declineState.success, acceptState.success, router]);

  const pending = acceptPending || declinePending;
  const error = acceptState.error ?? declineState.error;

  if (outcome === "accepted") {
    return (
      <span className="badge badge-win" role="status">
        Kabul edildi
      </span>
    );
  }

  if (outcome === "declined") {
    return (
      <span className="badge badge-loss" role="status">
        Reddedildi
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <form
        action={(fd) => {
          setOutcome("accepted");
          setPendingChallengesOptimistic((n) => Math.max(0, n - 1));
          acceptAction(fd);
        }}
      >
        <input type="hidden" name="challengeId" value={challengeId} />
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
          {acceptPending ? "Kabul…" : "Kabul Et"}
        </button>
      </form>
      <form
        action={(fd) => {
          setOutcome("declined");
          setPendingChallengesOptimistic((n) => Math.max(0, n - 1));
          declineAction(fd);
        }}
      >
        <input type="hidden" name="challengeId" value={challengeId} />
        <button type="submit" className="btn btn-danger btn-sm" disabled={pending}>
          {declinePending ? "Red…" : "Reddet"}
        </button>
      </form>
      {error ? <p className="form-error w-full text-xs">{error}</p> : null}
    </div>
  );
}
