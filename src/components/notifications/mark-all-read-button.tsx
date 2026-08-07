"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  markAllNotificationsReadAction,
  type NotificationActionState,
} from "@/lib/actions/notifications";
import { useRealtime } from "@/components/realtime/realtime-provider";

const initialState: NotificationActionState = {};

export function MarkAllReadButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const { unreadNotifications, setUnreadNotificationsOptimistic } = useRealtime();
  const [state, formAction, isPending] = useActionState(
    markAllNotificationsReadAction,
    initialState,
  );

  useEffect(() => {
    // Success: revalidatePath in the action refreshes RSC. Error: rollback optimistic badge.
    if (state.error) {
      router.refresh();
    }
  }, [state.error, router]);

  return (
    <form
      action={(fd) => {
        setUnreadNotificationsOptimistic(0);
        formAction(fd);
      }}
    >
      <button
        type="submit"
        className="btn btn-secondary btn-sm"
        disabled={disabled || isPending || unreadNotifications === 0}
      >
        {isPending ? "İşleniyor…" : "Tümünü okundu işaretle"}
      </button>
      {state.error ? <p className="form-error mt-2 text-sm">{state.error}</p> : null}
      {state.success ? (
        <p className="mt-2 text-sm text-green" role="status">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
