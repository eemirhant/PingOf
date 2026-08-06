import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { listNotificationsForUser } from "@/lib/notifications/service";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;

  const { notifications, total, unreadCount } = await listNotificationsForUser(
    session.user.id,
    { page, pageSize: 100 },
  );

  const initialItems = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    linkUrl: n.linkUrl,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <div className="nc-page">
      <Link href="/" className="nc-back">
        ← Ana sayfa
      </Link>
      <NotificationCenter
        initialItems={initialItems}
        initialUnreadCount={unreadCount}
        total={total}
      />
    </div>
  );
}
