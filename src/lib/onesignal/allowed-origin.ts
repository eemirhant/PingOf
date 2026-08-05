/**
 * Which browser origins may run OneSignal client init for PingOf.
 *
 * Development: localhost / 127.0.0.1
 * Production / Preview: configured APP_URL / Vercel URL
 *
 * OneSignal's CDN SDK also enforces Dashboard Site URL (chrome_web_origin).
 */

export function normalizeOrigin(input: string): string {
  return input.trim().replace(/\/$/, "");
}

export function isLocalDevHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host === "::1"
  );
}

export function isDevelopmentLikeRuntime(): boolean {
  const pub = process.env.NEXT_PUBLIC_ENVIRONMENT?.trim();
  if (pub === "production") return false;
  if (pub === "development" || pub === "test") return true;
  return process.env.NODE_ENV !== "production";
}

function configuredAppOrigins(): string[] {
  const raw = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_PRODUCTION_ORIGIN,
    process.env.AUTH_URL,
    process.env.NEXTAUTH_URL,
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}`
      : "",
    process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL.replace(/^https?:\/\//, "")}`
      : "",
  ];

  const origins: string[] = [];
  for (const value of raw) {
    if (!value?.trim()) continue;
    try {
      origins.push(new URL(normalizeOrigin(value)).origin);
    } catch {
      // ignore invalid
    }
  }
  return [...new Set(origins)];
}

/**
 * Returns true when the given origin is allowed to initialize OneSignal
 * for the current runtime.
 */
export function isAllowedOneSignalOrigin(origin: string): boolean {
  const normalized = normalizeOrigin(origin);
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  if (isDevelopmentLikeRuntime()) {
    if (isLocalDevHostname(hostname)) {
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    }
    // Vercel Preview / staging host while NODE_ENV=development is uncommon;
    // allow explicitly configured origins too.
    return configuredAppOrigins().includes(parsed.origin);
  }

  const allowed = configuredAppOrigins();
  if (allowed.length === 0) {
    // Fail open on current origin in production when env is unset —
    // OneSignal Dashboard Site URL remains the hard gate.
    return true;
  }
  return allowed.includes(parsed.origin);
}

export function describeAllowedOneSignalOrigins(): string {
  if (isDevelopmentLikeRuntime()) {
    const configured = configuredAppOrigins();
    return [
      "http://localhost:*",
      "http://127.0.0.1:*",
      ...configured,
    ].join(", ");
  }
  const allowed = configuredAppOrigins();
  return allowed.length > 0 ? allowed.join(", ") : "(current origin / Dashboard Site URL)";
}

export function isWrongSiteUrlError(error: unknown): boolean {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : String(error ?? "");
  return /can only be used on/i.test(message);
}

export function extractConfiguredSiteUrl(error: unknown): string | null {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : String(error ?? "");
  const match = message.match(/can only be used on:\s*(\S+)/i);
  return match?.[1] ? normalizeOrigin(match[1]) : null;
}
