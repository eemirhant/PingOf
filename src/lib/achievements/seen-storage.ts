const STORAGE_KEY = "pingof:achievements:seen";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadSeenAchievementIds(userId: string): Set<string> {
  if (!canUseStorage()) return new Set();
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${userId}`);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function saveSeenAchievementIds(userId: string, ids: string[]): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(`${STORAGE_KEY}:${userId}`, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

export function markAchievementsSeen(userId: string, unlockedIds: string[]): string[] {
  const seen = loadSeenAchievementIds(userId);

  // First visit: seed current unlocks silently (avoid toast spam).
  if (seen.size === 0) {
    saveSeenAchievementIds(userId, unlockedIds);
    return [];
  }

  const newlyUnlocked = unlockedIds.filter((id) => !seen.has(id));
  if (newlyUnlocked.length === 0) return [];

  const next = new Set([...seen, ...unlockedIds]);
  saveSeenAchievementIds(userId, [...next]);
  return newlyUnlocked;
}
