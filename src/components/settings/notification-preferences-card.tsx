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
  /** Exclusive accordion — persists until page refresh. */
  const [openCategoryId, setOpenCategoryId] = useState<string>("challenges");
  const [pushHint, setPushHint] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(
    updateNotificationPreferencesAction,
    initialState,
  );

  useEffect(() => {
    setPreferences(initialPreferences);
  }, [initialPreferences]);

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
        const open = openCategoryId === category.id;

        return (
          <section
            key={category.id}
            className={`notif-pref-accordion ${open ? "is-open" : ""}`}
          >
            <button
              type="button"
              className="notif-pref-accordion__trigger"
              onClick={() => toggleCategory(category.id)}
              aria-expanded={open}
              aria-controls={`notif-pref-panel-${category.id}`}
              id={`notif-pref-trigger-${category.id}`}
            >
              <span className="notif-pref-accordion__title">{category.title}</span>
              <span
                className={`notif-pref-accordion__chevron ${open ? "is-open" : ""}`}
                aria-hidden
              >
                ▶
              </span>
            </button>

            <div
              id={`notif-pref-panel-${category.id}`}
              role="region"
              aria-labelledby={`notif-pref-trigger-${category.id}`}
              className="notif-pref-accordion__panel"
              aria-hidden={!open}
            >
              <div className="notif-pref-accordion__panel-inner">
                <ul className="notif-pref-accordion__list">
                  {category.items.map((item) => {
                    const pref = preferences[item.key];
                    return (
                      <li key={item.key} className="notif-pref-accordion__item">
                        <div className="notif-pref-accordion__label">
                          {item.label}
                        </div>
                        <div className="notif-pref-accordion__channels">
                          <label className="notif-pref-accordion__channel">
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
                          <label className="notif-pref-accordion__channel">
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
              </div>
            </div>
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
