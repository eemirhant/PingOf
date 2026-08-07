import { avatarColors } from "@/lib/design-tokens";

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/** Shared Prisma select for avatar rendering (photo + owned color). */
export const userAvatarSelect = {
  id: true,
  fullName: true,
  avatarUrl: true,
  avatarColor: true,
} as const;

export type UserAvatarFields = {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
};

export function getInitials(fullName: string | null | undefined): string {
  if (!fullName?.trim()) return "?";
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("tr-TR") ?? "")
    .join("");
}

/** True when avatarUrl points to an uploaded photo (not a color hex). */
export function isImageAvatar(avatarUrl?: string | null): boolean {
  if (!avatarUrl) return false;
  return (
    avatarUrl.startsWith("data:image/") ||
    avatarUrl.startsWith("blob:") ||
    avatarUrl.startsWith("/uploads/") ||
    avatarUrl.startsWith("http://") ||
    avatarUrl.startsWith("https://")
  );
}

/**
 * JWT cookies are ~4KB — never put base64 data URLs in the session token.
 * Returns a short path/color, or null when the value is too large for a cookie.
 */
export function avatarUrlForSession(avatarUrl?: string | null): string | null {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith("data:")) return null;
  if (avatarUrl.length > 512) return null;
  return avatarUrl;
}

/**
 * Deterministic palette index from userId only.
 * Never uses list index, render order, or another user's data.
 */
export function hashAvatarColor(userId: string): string {
  let hash = 5381;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) + hash) ^ userId.charCodeAt(i);
  }
  const index = Math.abs(hash) % avatarColors.length;
  return avatarColors[index] ?? avatarColors[0];
}

/**
 * Resolve the color that belongs to this user.
 * Priority: explicit DB color → legacy hex in avatarUrl → hash(userId).
 */
export function avatarColorForUser(
  userId: string,
  avatarUrl?: string | null,
  avatarColor?: string | null,
): string {
  if (avatarColor && HEX_COLOR.test(avatarColor)) {
    return avatarColor.toLowerCase();
  }

  // Legacy dual-purpose avatarUrl (pre-avatarColor column)
  if (avatarUrl && HEX_COLOR.test(avatarUrl)) {
    return avatarUrl.toLowerCase();
  }

  return hashAvatarColor(userId);
}

export function isAvatarColor(value: string): boolean {
  return (
    HEX_COLOR.test(value) &&
    (avatarColors as readonly string[]).includes(value.toLowerCase())
  );
}

/**
 * Cache-bust image URLs so a replaced photo is visible without a hard reload.
 * Filenames already include a timestamp; query still helps CDN/browser edge cases.
 */
export function avatarImageSrc(avatarUrl: string): string {
  if (!avatarUrl || avatarUrl.startsWith("data:") || avatarUrl.startsWith("blob:")) {
    return avatarUrl;
  }
  if (avatarUrl.includes("?")) return avatarUrl;
  const stamped = avatarUrl.match(/-(\d{10,})\.[a-z0-9]+$/i);
  if (stamped?.[1]) return `${avatarUrl}?v=${stamped[1]}`;
  return `${avatarUrl}?v=${encodeURIComponent(avatarUrl.slice(-32))}`;
}
