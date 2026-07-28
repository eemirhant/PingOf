import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

const BASE_AUTH_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
  "authjs.csrf-token",
  "__Secure-authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
  "next-auth.csrf-token",
  "__Host-next-auth.csrf-token",
];

function isAuthCookieName(name: string): boolean {
  return (
    BASE_AUTH_COOKIE_NAMES.includes(name) ||
    name.startsWith("authjs.session-token") ||
    name.startsWith("__Secure-authjs.session-token") ||
    name.startsWith("next-auth.session-token") ||
    name.startsWith("__Secure-next-auth.session-token")
  );
}

function clearAuthCookies(response: NextResponse, request: NextRequest) {
  const names = new Set(BASE_AUTH_COOKIE_NAMES);
  for (const cookie of request.cookies.getAll()) {
    if (isAuthCookieName(cookie.name)) {
      names.add(cookie.name);
    }
  }

  for (const name of names) {
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
    });
    // Also clear without httpOnly for any non-httpOnly variants
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      sameSite: "lax",
    });
  }
}

function redirectToLoginClearingCookies(req: NextRequest, reason: string) {
  const login = req.nextUrl.clone();
  login.pathname = "/login";
  login.search = `?cleared=1&reason=${encodeURIComponent(reason)}`;
  const response = NextResponse.redirect(login);
  clearAuthCookies(response, req);
  return response;
}

function hasChunkedSessionCookie(req: NextRequest): boolean {
  return req.cookies
    .getAll()
    .some(
      (c) =>
        /^authjs\.session-token\.\d+$/.test(c.name) ||
        /^__Secure-authjs\.session-token\.\d+$/.test(c.name) ||
        /^next-auth\.session-token\.\d+$/.test(c.name),
    );
}

function cookieHeaderLooksOversized(req: NextRequest): boolean {
  const cookieHeader = req.headers.get("cookie") ?? "";
  if (cookieHeader.length > 6_000) return true;

  // Any single auth cookie over ~3KB is almost certainly a blown JWT
  for (const cookie of req.cookies.getAll()) {
    if (isAuthCookieName(cookie.name) && (cookie.value?.length ?? 0) > 3_000) {
      return true;
    }
  }
  return false;
}

export default async function middleware(req: NextRequest) {
  // Force-clear endpoint (also linked from login when session is corrupt)
  if (req.nextUrl.pathname === "/clear-session") {
    const login = req.nextUrl.clone();
    login.pathname = "/login";
    login.search = "?cleared=1";
    const response = NextResponse.redirect(login);
    clearAuthCookies(response, req);
    return response;
  }

  // Oversized / chunked JWTs from base64 avatars → clear before Auth.js parses them
  if (cookieHeaderLooksOversized(req) || hasChunkedSessionCookie(req)) {
    return redirectToLoginClearingCookies(req, "oversized");
  }

  try {
    return await (
      auth as unknown as (
        request: NextRequest,
      ) => Promise<Response | undefined> | Response | undefined
    )(req);
  } catch {
    // Invalid Compact JWE / decrypt failures
    return redirectToLoginClearingCookies(req, "invalid");
  }
}

export const config = {
  matcher: [
    /*
     * Skip auth for static/PWA assets — otherwise browsers get HTML login
     * pages for manifest/sw/icons (Manifest: Syntax error).
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|icon.svg|uploads|icons/|sw\\.js|offline\\.html|manifest\\.webmanifest).*)",
  ],
};
