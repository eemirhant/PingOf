/**
 * Resolve the public origin for absolute links (invite, OneSignal click URL, emails).
 *
 * Priority:
 * 1. Request Host / x-forwarded-* (via getRequestOrigin)
 * 2. NEXT_PUBLIC_APP_URL / AUTH_URL / NEXTAUTH_URL
 * 3. http://127.0.0.1:$PORT
 */
export function isLocalHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host === "::1"
  );
}

export function isLocalOriginUrl(url: string): boolean {
  try {
    return isLocalHostname(new URL(url).hostname);
  } catch {
    return false;
  }
}

function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/$/, "");
}

function envCandidateUrls(): string[] {
  return [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.AUTH_URL,
    process.env.NEXTAUTH_URL,
  ]
    .map((v) => (v ?? "").trim())
    .filter(Boolean)
    .map(normalizeOrigin);
}

function localFallbackOrigin(): string {
  const port = process.env.PORT || "3000";
  return `http://127.0.0.1:${port}`;
}

/**
 * Sync public URL for background jobs / emails / push (no request context).
 */
export function getPublicAppUrl(): string {
  const candidates = envCandidateUrls();
  const nonLocal = candidates.find((u) => !isLocalOriginUrl(u));
  const local = candidates.find((u) => isLocalOriginUrl(u));

  if (nonLocal) return nonLocal;
  if (local) return local;
  return localFallbackOrigin();
}

/**
 * Prefer the incoming request origin (localhost, Vercel Preview, production).
 */
export async function getRequestOrigin(): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const headerList = await headers();
    const host =
      headerList.get("x-forwarded-host")?.split(",")[0]?.trim() ||
      headerList.get("host")?.trim() ||
      "";

    if (host) {
      const forwardedProto = headerList
        .get("x-forwarded-proto")
        ?.split(",")[0]
        ?.trim();
      const hostnameOnly = host.replace(/:\d+$/, "").replace(/^\[|\]$/g, "");
      const proto =
        forwardedProto || (isLocalHostname(hostnameOnly) ? "http" : "https");
      return normalizeOrigin(`${proto}://${host}`);
    }
  } catch {
    // Outside a request (scripts / tests)
  }

  return getPublicAppUrl();
}

export { toSafeInternalPath } from "@/lib/url/safe-path";

export function getDevEnvironment(): string {
  return (
    process.env.NEXT_PUBLIC_ENVIRONMENT?.trim() ||
    process.env.NODE_ENV ||
    "development"
  );
}
