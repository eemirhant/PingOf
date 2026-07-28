"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { isImageAvatar } from "@/lib/utils/avatar";

type AppHeaderUser = {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  role?: string | null;
};

type AppHeaderBrand = {
  name: string;
  logoUrl?: string | null;
};

type AppHeaderProps = {
  user: AppHeaderUser | null;
  brand: AppHeaderBrand | null;
  pendingCount: number;
  unreadNotifications: number;
};

const DESKTOP_LINKS = [
  { href: "/", label: "Ana Sayfa", match: (p: string) => p === "/" },
  {
    href: "/matches",
    label: "Maçlar",
    match: (p: string) =>
      p === "/matches" || (p.startsWith("/matches/") && !p.startsWith("/matches/new")),
  },
  {
    href: "/tournaments",
    label: "Turnuvalar",
    match: (p: string) => p.startsWith("/tournaments"),
  },
  {
    href: "/players",
    label: "Oyuncular",
    match: (p: string) => p.startsWith("/players"),
  },
  {
    href: "/leaderboard",
    label: "Sıralama",
    match: (p: string) => p.startsWith("/leaderboard"),
  },
  {
    href: "/challenges",
    label: "Teklifler",
    match: (p: string) => p.startsWith("/challenges"),
  },
  {
    href: "/settings",
    label: "Ayarlar",
    match: (p: string) => p.startsWith("/settings"),
  },
] as const;

function roleLabel(role?: string | null): string {
  if (role === "OWNER") return "Sahip";
  if (role === "MEMBER") return "Üye";
  return "Profil";
}

export function AppHeader({
  user,
  brand,
  pendingCount,
  unreadNotifications,
}: AppHeaderProps) {
  const pathname = usePathname() ?? "/";
  const hasLogo = isImageAvatar(brand?.logoUrl);
  const notifActive = pathname.startsWith("/notifications");

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          <Link href="/" className="app-brand shrink-0">
            {hasLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand!.logoUrl!}
                alt={brand?.name ? `${brand.name} logosu` : "Organizasyon logosu"}
                className="app-brand-logo"
              />
            ) : (
              <span className="app-brand-mark" aria-hidden>
                {(brand?.name ?? "P").slice(0, 1).toLocaleUpperCase("tr-TR")}
              </span>
            )}
            <span className="app-brand-text-wrap">
              <span className="app-brand-text">PingOf</span>
              {brand?.name ? <span className="app-brand-org">{brand.name}</span> : null}
            </span>
          </Link>

          <nav className="app-nav hidden sm:flex" aria-label="Ana menü">
            {DESKTOP_LINKS.map((link) => {
              const active = link.match(pathname);
              const isChallenges = link.href === "/challenges";
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`app-nav-link ${active ? "app-nav-link--active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                  {isChallenges && pendingCount > 0 ? (
                    <span className="app-nav-badge">
                      {pendingCount > 9 ? "9+" : pendingCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/notifications"
            className={`app-notif-btn ${notifActive ? "app-notif-btn--active" : ""}`}
            aria-label={
              unreadNotifications > 0
                ? `Bildirimler, ${unreadNotifications} okunmamış`
                : "Bildirimler"
            }
          >
            <span aria-hidden>🔔</span>
            {unreadNotifications > 0 ? (
              <span className="app-nav-badge app-notif-badge">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            ) : null}
          </Link>

          <Link href="/matches/new" className="btn btn-primary btn-sm sm:hidden">
            + Maç
          </Link>

          {user ? (
            <Link
              href={`/players/${user.id}`}
              className={`profile-chip ${pathname.startsWith(`/players/${user.id}`) ? "profile-chip--active" : ""}`}
            >
              <UserAvatar
                userId={user.id}
                fullName={user.fullName}
                avatarUrl={user.avatarUrl}
                size="sm"
                className="profile-chip-avatar"
              />
              <span className="profile-chip-meta hidden md:flex">
                <span className="profile-chip-name">{user.fullName}</span>
                <span className="profile-chip-role">{roleLabel(user.role)}</span>
              </span>
            </Link>
          ) : null}

          <LogoutButton />
        </div>
      </div>
    </header>
  );
}

const MOBILE_LINKS = [
  { href: "/", label: "Ana Sayfa", match: (p: string) => p === "/" },
  {
    href: "/tournaments",
    label: "Turnuva",
    match: (p: string) => p.startsWith("/tournaments"),
  },
  {
    href: "/notifications",
    label: "Bildirim",
    match: (p: string) => p.startsWith("/notifications") || p.startsWith("/challenges"),
  },
  {
    href: "/settings",
    label: "Ayarlar",
    match: (p: string) => p.startsWith("/settings"),
  },
] as const;

export function MobileBottomNav({
  pendingCount,
  unreadNotifications,
}: {
  pendingCount: number;
  unreadNotifications: number;
}) {
  const pathname = usePathname() ?? "/";
  const badgeCount = unreadNotifications + pendingCount;

  return (
    <nav className="app-bottom-nav sm:hidden" aria-label="Mobil menü">
      {MOBILE_LINKS.slice(0, 2).map((link) => {
        const active = link.match(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`app-bottom-link ${active ? "app-bottom-link--active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}

      <Link
        href="/matches/new"
        className={`app-bottom-fab ${pathname.startsWith("/matches/new") ? "app-bottom-fab--active" : ""}`}
        aria-label="Maç Ekle"
        aria-current={pathname.startsWith("/matches/new") ? "page" : undefined}
      >
        +
      </Link>

      {MOBILE_LINKS.slice(2).map((link) => {
        const active = link.match(pathname);
        const showBadge = link.href === "/notifications" && badgeCount > 0;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`app-bottom-link relative ${active ? "app-bottom-link--active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
            {showBadge ? (
              <span className="app-nav-badge app-nav-badge--mobile">
                {badgeCount > 9 ? "9+" : badgeCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
