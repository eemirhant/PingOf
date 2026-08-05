"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  RealtimeEventType,
  eventsMatchPath,
  type RealtimeEventTypeValue,
} from "@/domain/realtime";
import type { RealtimeEventDto, RealtimeEventsResponse } from "@/lib/realtime/types";

const POLL_INTERVAL_MS = 2500;
const REFRESH_DEBOUNCE_MS = 400;

type EventHandler = (events: RealtimeEventDto[]) => void;

type RealtimeContextValue = {
  pendingChallenges: number;
  unreadNotifications: number;
  lastEvents: RealtimeEventDto[];
  setPendingChallengesOptimistic: (value: number | ((prev: number) => number)) => void;
  setUnreadNotificationsOptimistic: (value: number | ((prev: number) => number)) => void;
  subscribe: (types: RealtimeEventTypeValue[], handler: EventHandler) => () => void;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error("useRealtime must be used within RealtimeProvider");
  }
  return ctx;
}

/** Safe for header: falls back to SSR props when provider missing. */
export function useRealtimeBadges(fallback: {
  pendingChallenges: number;
  unreadNotifications: number;
}) {
  const ctx = useContext(RealtimeContext);
  if (!ctx) return fallback;
  return {
    pendingChallenges: ctx.pendingChallenges,
    unreadNotifications: ctx.unreadNotifications,
  };
}

type RealtimeProviderProps = {
  children: ReactNode;
  initialPendingChallenges: number;
  initialUnreadNotifications: number;
};

export function RealtimeProvider({
  children,
  initialPendingChallenges,
  initialUnreadNotifications,
}: RealtimeProviderProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";

  const [pendingChallenges, setPendingChallenges] = useState(initialPendingChallenges);
  const [unreadNotifications, setUnreadNotifications] = useState(
    initialUnreadNotifications,
  );
  const [lastEvents, setLastEvents] = useState<RealtimeEventDto[]>([]);

  const cursorRef = useRef<string | null>(null);
  const pathnameRef = useRef(pathname);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subscribersRef = useRef<
    Array<{ types: Set<string>; handler: EventHandler }>
  >([]);
  const inFlightRef = useRef(false);

  pathnameRef.current = pathname;

  useEffect(() => {
    setPendingChallenges(initialPendingChallenges);
    setUnreadNotifications(initialUnreadNotifications);
  }, [initialPendingChallenges, initialUnreadNotifications]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      router.refresh();
    }, REFRESH_DEBOUNCE_MS);
  }, [router]);

  const subscribe = useCallback(
    (types: RealtimeEventTypeValue[], handler: EventHandler) => {
      const entry = { types: new Set<string>(types), handler };
      subscribersRef.current.push(entry);
      return () => {
        subscribersRef.current = subscribersRef.current.filter((s) => s !== entry);
      };
    },
    [],
  );

  const poll = useCallback(async () => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      return;
    }
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      const params = new URLSearchParams();
      if (cursorRef.current) {
        params.set("since", cursorRef.current);
      }
      const res = await fetch(`/api/realtime/events?${params.toString()}`, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) return;

      const data = (await res.json()) as RealtimeEventsResponse;
      setPendingChallenges(data.pendingChallenges);
      setUnreadNotifications(data.unreadNotifications);

      // First successful poll only seeds the cursor — avoid refreshing on history.
      if (!cursorRef.current) {
        cursorRef.current =
          data.events.length > 0
            ? data.events[data.events.length - 1].createdAt
            : data.serverTime;
        return;
      }

      if (data.events.length === 0) return;

      setLastEvents(data.events);
      cursorRef.current = data.events[data.events.length - 1].createdAt;

      const types = data.events.map((e) => e.type);
      if (
        eventsMatchPath(types, pathnameRef.current) ||
        types.includes(RealtimeEventType.PROFILE_UPDATED)
      ) {
        scheduleRefresh();
      }

      for (const sub of subscribersRef.current) {
        const matched = data.events.filter((e) => sub.types.has(e.type));
        if (matched.length > 0) {
          sub.handler(matched);
        }
      }
    } catch {
      // Network blips are non-fatal; next interval retries.
    } finally {
      inFlightRef.current = false;
    }
  }, [scheduleRefresh]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (intervalId) return;
      void poll();
      intervalId = setInterval(() => {
        void poll();
      }, POLL_INTERVAL_MS);
    };

    const stop = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") {
      start();
    }

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [poll]);

  const value = useMemo<RealtimeContextValue>(
    () => ({
      pendingChallenges,
      unreadNotifications,
      lastEvents,
      setPendingChallengesOptimistic: setPendingChallenges,
      setUnreadNotificationsOptimistic: setUnreadNotifications,
      subscribe,
    }),
    [pendingChallenges, unreadNotifications, lastEvents, subscribe],
  );

  return (
    <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
  );
}
