"use client";

import { useActionState } from "react";

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
  const [state, action, pending] = useActionState(
    deleteNotificationAction,
    initialState,
  );

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
