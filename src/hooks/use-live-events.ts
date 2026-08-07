"use client";

import { useEffect, useMemo, useRef } from "react";

import { useRealtime } from "@/components/realtime/realtime-provider";
import type { RealtimeEventTypeValue } from "@/domain/realtime";
import type { RealtimeEventDto } from "@/lib/realtime/types";

/**
 * Subscribe to org realtime events without changing RealtimeProvider.
 * Path-level RSC refresh still happens via the provider when relevant.
 */
export function useLiveEvents(
  types: RealtimeEventTypeValue[],
  onEvents: (events: RealtimeEventDto[]) => void,
) {
  const { subscribe } = useRealtime();
  const typesKey = useMemo(() => [...types].sort().join("|"), [types]);
  const handlerRef = useRef(onEvents);
  handlerRef.current = onEvents;

  useEffect(() => {
    const list = typesKey
      ? (typesKey.split("|") as RealtimeEventTypeValue[])
      : [];
    if (list.length === 0) return;
    return subscribe(list, (events) => handlerRef.current(events));
  }, [subscribe, typesKey]);
}
