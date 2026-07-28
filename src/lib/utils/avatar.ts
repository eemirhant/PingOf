import { avatarColors } from "@/lib/design-tokens";

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export function getInitials(fullName: string): string {
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

export function avatarColorForUser(userId: string, avatarUrl?: string | null): string {
  if (avatarUrl && HEX_COLOR.test(avatarUrl)) {
    return avatarUrl;
  }

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash + userId.charCodeAt(i) * (i + 1)) % avatarColors.length;
  }

  return avatarColors[hash] ?? avatarColors[0];
}

export function isAvatarColor(value: string): boolean {
  return HEX_COLOR.test(value) && (avatarColors as readonly string[]).includes(value.toLowerCase());
}
