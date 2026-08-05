/**
 * Same-origin redirect helpers (safe for client + server; no Node fs).
 */

/**
 * Turn callback / redirect targets into relative paths.
 * Absolute URLs (e.g. http://localhost:3000/foo) become /foo so navigation
 * stays on the current request / window origin.
 */
export function toSafeInternalPath(raw: unknown, fallback = "/"): string {
  const value = String(raw ?? "").trim();
  if (!value) return fallback;

  if (value.startsWith("//")) return fallback;

  if (/^https?:\/\//i.test(value)) {
    try {
      const u = new URL(value);
      const path = `${u.pathname}${u.search}${u.hash}` || fallback;
      if (!path.startsWith("/") || path.startsWith("//")) return fallback;
      return path;
    } catch {
      return fallback;
    }
  }

  if (!value.startsWith("/")) return fallback;
  return value;
}
