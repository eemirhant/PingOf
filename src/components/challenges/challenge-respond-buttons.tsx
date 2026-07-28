"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  acceptChallengeAction,
  declineChallengeAction,
  type ChallengeActionState,
} from "@/lib/actions/challenges";

const initialState: ChallengeActionState = {};

type ChallengeRespondButtonsProps = {
  challengeId: string;
};

export function ChallengeRespondButtons({ challengeId }: ChallengeRespondButtonsProps) {
  const router = useRouter();
  const [acceptState, acceptAction, acceptPending] = useActionState(
    acceptChallengeAction,
    initialState,
  );
  const [declineState, declineAction, declinePending] = useActionState(
    declineChallengeAction,
    initialState,
  );

  useEffect(() => {
    if (declineState.success) {
      router.refresh();
    }
  }, [declineState.success, router]);

  const pending = acceptPending || declinePending;
  const error = acceptState.error ?? declineState.error;

  return (
    <div className="flex flex-wrap gap-2">
      <form action={acceptAction}>
        <input type="hidden" name="challengeId" value={challengeId} />
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
          {acceptPending ? "Kabul…" : "Kabul Et"}
        </button>
      </form>
      <form action={declineAction}>
        <input type="hidden" name="challengeId" value={challengeId} />
        <button type="submit" className="btn btn-danger btn-sm" disabled={pending}>
          {declinePending ? "Red…" : "Reddet"}
        </button>
      </form>
      {error ? <p className="form-error w-full text-xs">{error}</p> : null}
      {declineState.success ? (
        <p className="w-full text-xs text-green">{declineState.success}</p>
      ) : null}
    </div>
  );
}
