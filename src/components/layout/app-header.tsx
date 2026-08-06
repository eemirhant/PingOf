"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Handshake,
  Home,
  Medal,
  Plus,
  Settings,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { useRealtimeBadges } from "@/components/realtime/realtime-provider";
import { UserAvatar } from "@/components/ui/user-avatar";
import { isImageAvatar } from "@/lib/utils/avatar";

type AppHeaderUser = {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
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

const DESKTOP_LINKS: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
  match: (p: string) => boolean;
}> = [
  { href: "/", label: "Ana Sayfa", icon: Home, match: (p) => p === "/" },
  {
    href: "/matches",
    label: "Maçlar",
    icon: Trophy,
    match: (p) =>
      p === "/matches" || (p.startsWith("/matches/") && !p.startsWith("/matches/new")),
  },
  {
    href: "/tournaments",
    label: "Turnuvalar",
    icon: Medal,
    match: (p) => p.startsWith("/tournaments"),
  },
  {
    href: "/players",
    label: "Oyuncular",
    icon: Users,
    match: (p) => p.startsWith("/players"),
  },
  {
    href: "/leaderboard",
    label: "Sıralama",
    icon: BarChart3,
    match: (p) => p.startsWith("/leaderboard"),
  },
  {
    href: "/challenges",
    label: "Teklifler",
    icon: Handshake,
    match: (p) => p.startsWith("/challenges"),
  },
  {
    href: "/settings",
    label: "Ayarlar",
    icon: Settings,
    match: (p) => p.startsWith("/settings"),
  },
];

const MOBILE_LINKS: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
  match: (p: string) => boolean;
}> = [
  { href: "/", label: "Ana Sayfa", icon: Home, match: (p) => p === "/" },
  {
    href: "/tournaments",
    label: "Turnuva",
    icon: Medal,
    match: (p) => p.startsWith("/tournaments"),
  },
  {
    href: "/leaderboard",
    label: "Sıralama",
    icon: BarChart3,
    match: (p) => p.startsWith("/leaderboard"),
  },
  {
    href: "/settings",
    label: "Ayarlar",
    icon: Settings,
    match: (p) => p.startsWith("/settings"),
  },
];

function roleLabel(role?: string | null): string {
  if (role === "OWNER") return "Sahip";
  if (role === "MEMBER") return "Üye";
  return "Profil";
}

export function AppHeader({
  user,
  brand,
  pendingCount: initialPendingCount,
  unreadNotifications: initialUnreadNotifications,
}: AppHeaderProps) {
  const pathname = usePathname() ?? "/";
  const { pendingChallenges: pendingCount, unreadNotifications } = useRealtimeBadges({
    pendingChallenges: initialPendingCount,
    unreadNotifications: initialUnreadNotifications,
  });
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
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`app-nav-link ${active ? "app-nav-link--active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon
                    aria-hidden="true"
                    strokeWidth={1.75}
                    className="app-nav-link-icon"
                  />
                  <span>{link.label}</span>
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
              aria-label={`${user.fullName} profili`}
            >
              <UserAvatar
                userId={user.id}
                fullName={user.fullName}
                avatarUrl={user.avatarUrl}
                avatarColor={user.avatarColor}
                size="sm"
                className="profile-chip-avatar"
              />
              <span className="profile-chip-meta hidden md:flex">
                <span className="profile-chip-name">{user.fullName}</span>
                <span className="profile-chip-role">{roleLabel(user.role)}</span>
              </span>
            </Link>
          ) : null}

          <div className="hidden sm:block">
            <LogoutButton />
          </div>
        </div>
      </div>
    </header>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav className="app-bottom-nav sm:hidden" aria-label="Mobil menü">
      {MOBILE_LINKS.slice(0, 2).map((link) => {
        const active = link.match(pathname);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`app-bottom-link ${active ? "app-bottom-link--active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon aria-hidden="true" strokeWidth={1.75} className="app-bottom-link-icon" />
            <span className="app-bottom-link-label">{link.label}</span>
          </Link>
        );
      })}

      <Link
        href="/matches/new"
        className={`app-bottom-fab ${pathname.startsWith("/matches/new") ? "app-bottom-fab--active" : ""}`}
        aria-label="Maç Ekle"
        aria-current={pathname.startsWith("/matches/new") ? "page" : undefined}
      >
        <Plus aria-hidden="true" strokeWidth={2.25} className="app-bottom-fab-icon" />
      </Link>

      {MOBILE_LINKS.slice(2).map((link) => {
        const active = link.match(pathname);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`app-bottom-link ${active ? "app-bottom-link--active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon aria-hidden="true" strokeWidth={1.75} className="app-bottom-link-icon" />
            <span className="app-bottom-link-label">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
