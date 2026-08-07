"use client";

import { useEffect, useMemo, useState } from "react";

import { AchievementUnlockToast } from "@/components/achievements/achievement-unlock-toast";
import type { AchievementProgress } from "@/domain/achievements";
import { markAchievementsSeen } from "@/lib/achievements/seen-storage";

type AchievementUnlockWatcherProps = {
  userId: string;
  enabled: boolean;
  achievements: AchievementProgress[];
};

/**
 * Compares unlocked badges with localStorage once on mount.
 * Shows a short toast for the newest unlock (self profile only).
 */
export function AchievementUnlockWatcher({
  userId,
  enabled,
  achievements,
}: AchievementUnlockWatcherProps) {
  const unlocked = useMemo(
    () => achievements.filter((a) => a.unlocked),
    [achievements],
  );

  const [toast, setToast] = useState<AchievementProgress | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const ids = unlocked.map((a) => a.id);
    const newly = markAchievementsSeen(userId, ids);
    if (newly.length === 0) return;
    const latest = unlocked.find((a) => a.id === newly[newly.length - 1]);
    if (!latest) return;
    setToast(latest);
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [enabled, userId, unlocked]);

  if (!toast) return null;
  return <AchievementUnlockToast name={toast.name} icon={toast.icon} />;
}
