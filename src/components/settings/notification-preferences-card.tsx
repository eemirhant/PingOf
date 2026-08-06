"use client";

import { useActionState, useEffect, useMemo, useState } from "react";

import {
  updateNotificationPreferencesAction,
  type NotificationPreferencesActionState,
} from "@/lib/actions/notification-preferences";
import {
  NOTIFICATION_PREFERENCE_CATEGORIES,
  type ChannelPreference,
  type NotificationPreferenceKey,
  type NotificationPreferencesMap,
} from "@/domain/notification-preferences";
import { isFirebaseWebConfigured } from "@/lib/firebase/config";
import { enableWebPush } from "@/lib/firebase/messaging-client";

const initialState: NotificationPreferencesActionState = {};

type Props = {
  initialPreferences: NotificationPreferencesMap;
};

export function NotificationPreferencesCard({ initialPreferences }: Props) {
  const [preferences, setPreferences] =
    useState<NotificationPreferencesMap>(initialPreferences);
  const [isDesktop, setIsDesktop] = useState(false);
  const [openCategoryId, setOpenCategoryId] = useState<string>("challenges");
  const [pushHint, setPushHint] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(
    updateNotificationPreferencesAction,
    initialState,
  );

  useEffect(() => {
    setPreferences(initialPreferences);
  }, [initialPreferences]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const payload = useMemo(
    () => JSON.stringify({ preferences }),
    [preferences],
  );

  function setChannel(
    key: NotificationPreferenceKey,
    channel: keyof ChannelPreference,
    value: boolean,
  ) {
    setPreferences((prev) => ({
      ...prev,
      [key]: { ...prev[key], [channel]: value },
    }));

    if (channel === "push" && value && isFirebaseWebConfigured()) {
      void enableWebPush().then((result) => {
        if (!result.ok) setPushHint(result.error);
        else setPushHint(null);
      });
    }
  }

  function toggleCategory(id: string) {
    setOpenCategoryId((prev) => (prev === id ? "" : id));
  }

  return (
    <div className="mb-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">
          Bildirim Tercihleri
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Uygulama ve push kanallarını ayrı yönetebilirsin. Push tercihi, tarayıcı
          bildirimi açıkken Firebase üzerinden uygulanır.
        </p>
      </div>

      {NOTIFICATION_PREFERENCE_CATEGORIES.map((category) => {
        const open = !isDesktop || openCategoryId === category.id;

        return (
          <section
            key={category.id}
            className="overflow-hidden rounded-xl border border-border bg-bg-800/40"
          >
            {isDesktop ? (
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left"
                onClick={() => toggleCategory(category.id)}
                aria-expanded={open}
              >
                <span className="text-sm font-semibold text-text-primary">
                  {category.title}
                </span>
                <span className="text-text-muted text-xs" aria-hidden>
                  {open ? "▲" : "▼"}
                </span>
              </button>
            ) : (
              <h3 className="border-b border-border px-4 py-3 text-sm font-semibold text-text-primary">
                {category.title}
              </h3>
            )}

            {open ? (
              <ul
                className={`divide-y divide-border ${isDesktop ? "border-t border-border" : ""}`}
              >
                {category.items.map((item) => {
                  const pref = preferences[item.key];
                  return (
                    <li
                      key={item.key}
                      className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                    >
                      <div className="min-w-0 flex-1 text-sm text-text-primary">
                        {item.label}
                      </div>
                      <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:min-w-[220px]">
                        <label className="flex min-h-11 items-center gap-2 text-sm text-text-secondary">
                          <input
                            type="checkbox"
                            className="size-4 shrink-0 accent-[var(--color-accent)]"
                            checked={pref.inApp}
                            onChange={(e) =>
                              setChannel(item.key, "inApp", e.target.checked)
                            }
                          />
                          Uygulama
                        </label>
                        <label className="flex min-h-11 items-center gap-2 text-sm text-text-secondary">
                          <input
                            type="checkbox"
                            className="size-4 shrink-0 accent-[var(--color-accent)]"
                            checked={pref.push}
                            onChange={(e) =>
                              setChannel(item.key, "push", e.target.checked)
                            }
                          />
                          Push
                        </label>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        );
      })}

      {pushHint ? (
        <div className="rounded-lg border border-orange/30 bg-orange/5 p-3 text-sm text-text-secondary">
          {pushHint}
        </div>
      ) : null}

      <form action={formAction}>
        <input type="hidden" name="payload" value={payload} />
        <button
          type="submit"
          className="btn btn-primary min-h-11"
          disabled={pending}
        >
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </form>

      {state.error ? (
        <p className="form-error text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-400" role="status">
          {state.success}
        </p>
      ) : null}
    </div>
  );
}
