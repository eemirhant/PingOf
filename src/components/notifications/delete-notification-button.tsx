"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  deleteNotificationAction,
  type NotificationActionState,
} from "@/lib/actions/notifications";

const initialState: NotificationActionState = {};

export function DeleteNotificationButton({
  notificationId,
}: {
  notificationId: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    deleteNotificationAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form
      action={action}
      onClick={(e) => e.stopPropagation()}
      className="shrink-0"
    >
      <input type="hidden" name="notificationId" value={notificationId} />
      <button
        type="submit"
        className="btn btn-secondary btn-sm min-h-11 px-3"
        disabled={pending}
        aria-label="Bildirimi sil"
      >
        {pending ? "…" : "Sil"}
      </button>
      {state.error ? (
        <p className="form-error mt-1 text-xs" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
