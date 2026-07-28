"use client";

import { useActionState } from "react";

import {
  markAllNotificationsReadAction,
  type NotificationActionState,
} from "@/lib/actions/notifications";

const initialState: NotificationActionState = {};

export function MarkAllReadButton({ disabled }: { disabled?: boolean }) {
  const [state, formAction, isPending] = useActionState(
    markAllNotificationsReadAction,
    initialState,
  );

  return (
    <form action={formAction}>
      <button
        type="submit"
        className="btn btn-secondary btn-sm"
        disabled={disabled || isPending}
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
