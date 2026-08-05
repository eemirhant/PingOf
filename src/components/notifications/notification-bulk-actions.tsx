"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  clearAllNotificationsAction,
  deleteReadNotificationsAction,
  type NotificationActionState,
} from "@/lib/actions/notifications";
import { useRealtime } from "@/components/realtime/realtime-provider";

const initialState: NotificationActionState = {};

export function NotificationBulkActions({ hasItems }: { hasItems: boolean }) {
  const router = useRouter();
  const { setUnreadNotificationsOptimistic } = useRealtime();
  const [clearReadState, clearReadAction, clearReadPending] = useActionState(
    deleteReadNotificationsAction,
    initialState,
  );
  const [clearAllState, clearAllAction, clearAllPending] = useActionState(
    clearAllNotificationsAction,
    initialState,
  );

  useEffect(() => {
    if (clearReadState.success || clearAllState.success) {
      if (clearAllState.success) {
        setUnreadNotificationsOptimistic(0);
      }
      router.refresh();
    }
  }, [
    clearReadState.success,
    clearAllState.success,
    router,
    setUnreadNotificationsOptimistic,
  ]);

  if (!hasItems) return null;

  const error = clearReadState.error ?? clearAllState.error;
  const success = clearReadState.success ?? clearAllState.success;
  const pending = clearReadPending || clearAllPending;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <form action={clearReadAction}>
        <button type="submit" className="btn btn-secondary btn-sm" disabled={pending}>
          {clearReadPending ? "Temizleniyor…" : "Okunanları temizle"}
        </button>
      </form>
      <form
        action={(fd) => {
          if (
            typeof window !== "undefined" &&
            !window.confirm("Tüm bildirimler silinsin mi?")
          ) {
            return;
          }
          clearAllAction(fd);
        }}
      >
        <button type="submit" className="btn btn-danger btn-sm" disabled={pending}>
          {clearAllPending ? "Siliniyor…" : "Tümünü sil"}
        </button>
      </form>
      {error ? <p className="form-error w-full text-xs">{error}</p> : null}
      {success ? (
        <p className="w-full text-xs text-emerald-400" role="status">
          {success}
        </p>
      ) : null}
    </div>
  );
}
