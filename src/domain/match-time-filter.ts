/**
 * Time-range helpers for match list filtering (pure — no Prisma/UI).
 * Bounds use Europe/Istanbul by default (Turkish office app).
 */

export type MatchListTimeFilter =
  | "ALL"
  | "TODAY"
  | "WEEK"
  | "MONTH"
  | "UPCOMING"
  | "PAST";

export const DEFAULT_MATCH_TIMEZONE = "Europe/Istanbul";

export type DateRange = { start: Date; end: Date };

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0=Sun … 6=Sat (JS convention via short weekday map)
};

const WEEKDAY_TO_JS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const weekday = WEEKDAY_TO_JS[get("weekday")] ?? 0;

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
    weekday,
  };
}

/**
 * UTC instant for local midnight of YYYY-MM-DD in `timeZone`.
 */
export function zonedMidnight(
  year: number,
  month: number,
  day: number,
  timeZone: string,
): Date {
  const ymd = `${year}-${pad2(month)}-${pad2(day)}`;
  let guess = new Date(`${ymd}T00:00:00.000Z`);

  for (let i = 0; i < 4; i++) {
    const local = getZonedParts(guess, timeZone);
    const desiredAsUtc = Date.UTC(year, month - 1, day, 0, 0, 0);
    const actualAsUtc = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second,
    );
    const diff = desiredAsUtc - actualAsUtc;
    if (diff === 0) break;
    guess = new Date(guess.getTime() + diff);
  }

  return guess;
}

function addCalendarDays(
  year: number,
  month: number,
  day: number,
  delta: number,
): { year: number; month: number; day: number } {
  const utc = new Date(Date.UTC(year, month - 1, day + delta));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

export function startOfToday(
  now: Date = new Date(),
  timeZone: string = DEFAULT_MATCH_TIMEZONE,
): Date {
  const p = getZonedParts(now, timeZone);
  return zonedMidnight(p.year, p.month, p.day, timeZone);
}

export function endOfToday(
  now: Date = new Date(),
  timeZone: string = DEFAULT_MATCH_TIMEZONE,
): Date {
  const p = getZonedParts(now, timeZone);
  const next = addCalendarDays(p.year, p.month, p.day, 1);
  return zonedMidnight(next.year, next.month, next.day, timeZone);
}

/** Monday 00:00 → next Monday 00:00 (ISO week, TR office convention). */
export function startOfWeek(
  now: Date = new Date(),
  timeZone: string = DEFAULT_MATCH_TIMEZONE,
): Date {
  const p = getZonedParts(now, timeZone);
  const daysFromMonday = (p.weekday + 6) % 7;
  const mon = addCalendarDays(p.year, p.month, p.day, -daysFromMonday);
  return zonedMidnight(mon.year, mon.month, mon.day, timeZone);
}

export function endOfWeek(
  now: Date = new Date(),
  timeZone: string = DEFAULT_MATCH_TIMEZONE,
): Date {
  const start = startOfWeek(now, timeZone);
  const p = getZonedParts(start, timeZone);
  const next = addCalendarDays(p.year, p.month, p.day, 7);
  return zonedMidnight(next.year, next.month, next.day, timeZone);
}

export function startOfMonth(
  now: Date = new Date(),
  timeZone: string = DEFAULT_MATCH_TIMEZONE,
): Date {
  const p = getZonedParts(now, timeZone);
  return zonedMidnight(p.year, p.month, 1, timeZone);
}

export function endOfMonth(
  now: Date = new Date(),
  timeZone: string = DEFAULT_MATCH_TIMEZONE,
): Date {
  const p = getZonedParts(now, timeZone);
  const nextMonth =
    p.month === 12
      ? { year: p.year + 1, month: 1 }
      : { year: p.year, month: p.month + 1 };
  return zonedMidnight(nextMonth.year, nextMonth.month, 1, timeZone);
}

/**
 * Inclusive start / exclusive end for calendar filters.
 * UPCOMING / PAST / ALL return null (handled separately in the query).
 */
export function getMatchTimeRange(
  filter: MatchListTimeFilter,
  now: Date = new Date(),
  timeZone: string = DEFAULT_MATCH_TIMEZONE,
): DateRange | null {
  switch (filter) {
    case "TODAY":
      return { start: startOfToday(now, timeZone), end: endOfToday(now, timeZone) };
    case "WEEK":
      return { start: startOfWeek(now, timeZone), end: endOfWeek(now, timeZone) };
    case "MONTH":
      return { start: startOfMonth(now, timeZone), end: endOfMonth(now, timeZone) };
    default:
      return null;
  }
}

export function matchTimeFilterLabel(filter: MatchListTimeFilter): string {
  switch (filter) {
    case "ALL":
      return "Tümü";
    case "TODAY":
      return "Bugün";
    case "WEEK":
      return "Bu hafta";
    case "MONTH":
      return "Bu ay";
    case "UPCOMING":
      return "Yaklaşan";
    case "PAST":
      return "Geçmiş";
    default:
      return filter;
  }
}
