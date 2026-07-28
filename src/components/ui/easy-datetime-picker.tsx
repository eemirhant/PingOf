"use client";

import { useMemo, useState } from "react";

export function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseDatetimeLocal(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function combineDayAndTime(day: Date, hours: number, minutes: number): Date {
  const d = startOfLocalDay(day);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

const HOUR_OPTIONS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] as const;
const MINUTE_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] as const;

function isFuture(day: Date, hours: number, minutes: number, now: Date): boolean {
  return combineDayAndTime(day, hours, minutes).getTime() > now.getTime() + 60_000;
}

function firstAvailableOnDay(day: Date, now: Date): Date | null {
  for (const hour of HOUR_OPTIONS) {
    for (const minute of MINUTE_OPTIONS) {
      if (isFuture(day, hour, minute, now)) {
        return combineDayAndTime(day, hour, minute);
      }
    }
  }
  return null;
}

/** Next sensible office-hour slot (today, else tomorrow noon). */
export function defaultScheduledLocal(now: Date = new Date()): string {
  const today = startOfLocalDay(now);
  const todaySlot = firstAvailableOnDay(today, now);
  if (todaySlot) return toDatetimeLocalValue(todaySlot);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDatetimeLocalValue(combineDayAndTime(tomorrow, 12, 0));
}

type DayPreset = "today" | "tomorrow" | "custom" | "none";

type EasyDateTimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  allowEmpty?: boolean;
  emptyHint?: string;
};

function detectDayPreset(value: string, now: Date): DayPreset {
  const parsed = parseDatetimeLocal(value);
  if (!parsed) return "none";
  const today = startOfLocalDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameLocalDay(parsed, today)) return "today";
  if (isSameLocalDay(parsed, tomorrow)) return "tomorrow";
  return "custom";
}

export function EasyDateTimePicker({
  value,
  onChange,
  required = false,
  allowEmpty = false,
  emptyHint,
}: EasyDateTimePickerProps) {
  const now = useMemo(() => new Date(), []);
  const [showAdvanced, setShowAdvanced] = useState(
    () => detectDayPreset(value, new Date()) === "custom",
  );
  const [showManualTime, setShowManualTime] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const parsed = parseDatetimeLocal(value);
  const dayPreset = detectDayPreset(value, now);

  const today = startOfLocalDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const activeDay =
    dayPreset === "today"
      ? today
      : dayPreset === "tomorrow"
        ? tomorrow
        : parsed
          ? startOfLocalDay(parsed)
          : null;

  const selectedHour = parsed?.getHours() ?? null;
  const selectedMinute = parsed?.getMinutes() ?? null;

  const availableHours = useMemo(() => {
    if (!activeDay) return [];
    return HOUR_OPTIONS.filter((hour) =>
      MINUTE_OPTIONS.some((minute) => isFuture(activeDay, hour, minute, now)),
    );
  }, [activeDay, now]);

  const availableMinutes = useMemo(() => {
    if (!activeDay || selectedHour === null) return [];
    return MINUTE_OPTIONS.filter((minute) =>
      isFuture(activeDay, selectedHour, minute, now),
    );
  }, [activeDay, selectedHour, now]);

  function setDay(preset: "today" | "tomorrow") {
    setShowAdvanced(false);
    setShowManualTime(false);
    setManualError(null);
    const day = preset === "today" ? today : tomorrow;
    const current = parseDatetimeLocal(value);

    let next: Date | null = null;
    if (current) {
      const keepTime = combineDayAndTime(day, current.getHours(), current.getMinutes());
      if (keepTime.getTime() > now.getTime() + 60_000) next = keepTime;
    }
    if (!next) next = firstAvailableOnDay(day, now);
    if (!next && preset === "today") {
      next = firstAvailableOnDay(tomorrow, now) ?? combineDayAndTime(tomorrow, 12, 0);
    }
    if (!next) next = combineDayAndTime(tomorrow, 12, 0);

    onChange(toDatetimeLocalValue(next));
  }

  function setHour(hours: number) {
    if (!activeDay) return;
    const preferredMinute =
      selectedMinute !== null &&
      MINUTE_OPTIONS.includes(selectedMinute as (typeof MINUTE_OPTIONS)[number]) &&
      isFuture(activeDay, hours, selectedMinute, now)
        ? selectedMinute
        : (MINUTE_OPTIONS.find((m) => isFuture(activeDay, hours, m, now)) ?? 0);

    const next = combineDayAndTime(activeDay, hours, preferredMinute);
    if (next.getTime() <= now.getTime()) return;
    setShowAdvanced(false);
    setShowManualTime(false);
    setManualError(null);
    onChange(toDatetimeLocalValue(next));
  }

  function setMinute(minutes: number) {
    if (!activeDay || selectedHour === null) return;
    const next = combineDayAndTime(activeDay, selectedHour, minutes);
    if (next.getTime() <= now.getTime()) return;
    setShowManualTime(false);
    setManualError(null);
    onChange(toDatetimeLocalValue(next));
  }

  function openAdvanced() {
    setShowAdvanced(true);
    setShowManualTime(false);
    setManualError(null);
    if (!value) {
      const later = new Date(today);
      later.setDate(later.getDate() + 2);
      onChange(toDatetimeLocalValue(combineDayAndTime(later, 12, 0)));
    }
  }

  function openManualTime() {
    setShowManualTime(true);
    setManualError(null);
    if (!value && activeDay) {
      const next = firstAvailableOnDay(activeDay, now);
      if (next) onChange(toDatetimeLocalValue(next));
    }
  }

  function applyManualTime(timeValue: string) {
    if (!activeDay || !timeValue) return;
    const [hRaw, mRaw] = timeValue.split(":");
    const hours = Number(hRaw);
    const minutes = Number(mRaw);
    if (
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      setManualError("Geçerli bir saat gir (örn. 14:30).");
      return;
    }

    const next = combineDayAndTime(activeDay, hours, minutes);
    if (next.getTime() <= now.getTime()) {
      setManualError("Geçmiş bir saat seçilemez.");
      return;
    }

    setManualError(null);
    onChange(toDatetimeLocalValue(next));
  }

  function clearValue() {
    setShowAdvanced(false);
    setShowManualTime(false);
    setManualError(null);
    onChange("");
  }

  const summary = parsed
    ? new Intl.DateTimeFormat("tr-TR", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(parsed)
    : null;

  const quickDayActive = !showAdvanced && (dayPreset === "today" || dayPreset === "tomorrow");
  const manualTimeValue =
    selectedHour !== null && selectedMinute !== null
      ? `${pad2(selectedHour)}:${pad2(selectedMinute)}`
      : "";

  return (
    <div className="space-y-3">
      <div>
        <div className="text-text-muted mb-2 text-xs font-semibold uppercase tracking-wide">
          Gün
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`badge min-h-11 px-4 ${dayPreset === "today" && !showAdvanced ? "badge-win" : "badge-planned"}`}
            onClick={() => setDay("today")}
          >
            Bugün
          </button>
          <button
            type="button"
            className={`badge min-h-11 px-4 ${dayPreset === "tomorrow" && !showAdvanced ? "badge-win" : "badge-planned"}`}
            onClick={() => setDay("tomorrow")}
          >
            Yarın
          </button>
          <button
            type="button"
            className={`badge min-h-11 px-4 ${showAdvanced || dayPreset === "custom" ? "badge-win" : "badge-planned"}`}
            onClick={openAdvanced}
          >
            Daha ileri tarih
          </button>
          {allowEmpty ? (
            <button
              type="button"
              className={`badge min-h-11 px-4 ${!value ? "badge-win" : "badge-planned"}`}
              onClick={clearValue}
            >
              Belirtme
            </button>
          ) : null}
        </div>
      </div>

      {quickDayActive ? (
        <>
          <div>
            <div className="text-text-muted mb-2 text-xs font-semibold uppercase tracking-wide">
              Saat
            </div>
            {availableHours.length === 0 ? (
              <p className="text-text-muted text-sm">
                Bugün için uygun saat kalmadı. Yarın veya daha ileri bir tarih seç.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableHours.map((hour) => {
                  const active = selectedHour === hour && !showManualTime;
                  return (
                    <button
                      key={hour}
                      type="button"
                      className={`badge min-h-10 px-3 ${active ? "badge-win" : "badge-planned"}`}
                      onClick={() => setHour(hour)}
                    >
                      {pad2(hour)}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className={`badge min-h-10 px-3 ${showManualTime ? "badge-win" : "badge-planned"}`}
                  onClick={openManualTime}
                >
                  Elle saat gir
                </button>
              </div>
            )}
          </div>

          {showManualTime ? (
            <div>
              <div className="text-text-muted mb-2 text-xs font-semibold uppercase tracking-wide">
                Elle saat
              </div>
              <input
                type="time"
                className="form-input max-w-[180px]"
                value={manualTimeValue}
                onChange={(e) => applyManualTime(e.target.value)}
                aria-label="Saat gir"
              />
              {manualError ? (
                <p className="form-error mt-2 text-sm" role="alert">
                  {manualError}
                </p>
              ) : (
                <p className="text-text-muted mt-1 text-xs">Örn. 14:35</p>
              )}
              <button
                type="button"
                className="text-accent-light mt-2 block text-sm font-semibold"
                onClick={() => {
                  setShowManualTime(false);
                  setManualError(null);
                }}
              >
                Hızlı saat seçimine dön
              </button>
            </div>
          ) : selectedHour !== null && availableMinutes.length > 0 ? (
            <div>
              <div className="text-text-muted mb-2 text-xs font-semibold uppercase tracking-wide">
                Dakika
              </div>
              <div className="flex flex-wrap gap-2">
                {availableMinutes.map((minute) => {
                  const active = selectedMinute === minute;
                  return (
                    <button
                      key={minute}
                      type="button"
                      className={`badge min-h-10 px-3 ${active ? "badge-win" : "badge-planned"}`}
                      onClick={() => setMinute(minute)}
                    >
                      :{pad2(minute)}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {showAdvanced ? (
        <div>
          <div className="text-text-muted mb-2 text-xs font-semibold uppercase tracking-wide">
            Detaylı tarih
          </div>
          <input
            type="datetime-local"
            className="form-input"
            value={value}
            min={toDatetimeLocalValue(now)}
            onChange={(e) => onChange(e.target.value)}
            required={required && !allowEmpty}
          />
          <button
            type="button"
            className="text-accent-light mt-2 text-sm font-semibold"
            onClick={() => {
              setShowAdvanced(false);
              if (dayPreset === "custom" || dayPreset === "none") {
                setDay("tomorrow");
              }
            }}
          >
            Hızlı seçime dön
          </button>
        </div>
      ) : null}

      {summary ? (
        <p className="text-text-secondary text-sm">
          Seçilen: <span className="font-semibold text-text-primary">{summary}</span>
        </p>
      ) : allowEmpty ? (
        <p className="text-text-muted text-xs">
          {emptyHint ?? "Tarih belirtmezsen kabulde yaklaşık 1 saat sonrası planlanır."}
        </p>
      ) : null}
    </div>
  );
}
