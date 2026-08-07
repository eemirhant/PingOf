import { Suspense } from "react";

import { auth } from "@/auth";
import { AppHeader, MobileBottomNav } from "@/components/layout/app-header";
import { EntityMissingToast } from "@/components/notifications/entity-missing-toast";
import { NotificationDeepLinkListener } from "@/components/notifications/notification-deep-link-listener";
import { FcmProvider } from "@/components/push/fcm-provider";
import { RealtimeProvider } from "@/components/realtime/realtime-provider";
import { countPendingIncoming } from "@/lib/challenges/service";
import { countUnreadNotifications } from "@/lib/notifications/service";
import { getOrganizationBrand, getUserProfile } from "@/lib/profile/update-profile";

/** Server Actions + RSC for challenges/matches/notifications must see Node env secrets. */
export const runtime = "nodejs";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  const [pendingCount, unreadNotifications, brand, profile] =
    session?.user != null
      ? await Promise.all([
          countPendingIncoming(session.user.organizationId, session.user.id),
          countUnreadNotifications(session.user.id),
          getOrganizationBrand(session.user.organizationId),
          getUserProfile(session.user.id, session.user.organizationId),
        ])
      : [0, 0, null, null];

  const user = session?.user
    ? {
        id: session.user.id,
        fullName: profile?.fullName ?? session.user.fullName,
        avatarUrl: profile?.avatarUrl ?? session.user.avatarUrl,
        avatarColor: profile?.avatarColor ?? null,
        role: session.user.role,
      }
    : null;

  return (
    <RealtimeProvider
      initialPendingChallenges={pendingCount}
      initialUnreadNotifications={unreadNotifications}
    >
      <FcmProvider enabled={Boolean(session?.user)} />
      <NotificationDeepLinkListener />
      <Suspense fallback={null}>
        <EntityMissingToast />
      </Suspense>
      <div className="min-h-screen bg-bg-900">
        <AppHeader
          user={user}
          brand={brand ? { name: brand.name, logoUrl: brand.logoUrl } : null}
          pendingCount={pendingCount}
          unreadNotifications={unreadNotifications}
        />
        <main className="pb-20 sm:pb-6">{children}</main>
        <MobileBottomNav />
      </div>
    </RealtimeProvider>
  );
}
