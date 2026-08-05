import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DeleteNotificationButton } from "@/components/notifications/delete-notification-button";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";
import { NotificationBulkActions } from "@/components/notifications/notification-bulk-actions";
import { NotificationOpenButton } from "@/components/notifications/notification-open-button";
import { notificationTypeIcon } from "@/domain/notification";
import { listNotificationsForUser } from "@/lib/notifications/service";
import { formatRelativeTimeTr } from "@/lib/utils/relative-time";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;

  const { notifications, total, unreadCount, totalPages, page: currentPage } =
    await listNotificationsForUser(session.user.id, { page, pageSize: 20 });

  function hrefFor(p: number) {
    return p > 1 ? `/notifications?page=${p}` : "/notifications";
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link href="/" className="text-text-muted hover:text-text-secondary text-sm">
        ← Ana sayfa
      </Link>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Bildirimler</h1>
          <p className="text-text-secondary text-sm">
            {total} bildirim
            {unreadCount > 0 ? ` · ${unreadCount} okunmamış` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <MarkAllReadButton disabled={unreadCount === 0} />
          <NotificationBulkActions hasItems={notifications.length > 0} />
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="card empty-state mt-6">
          <div className="empty-title">Henüz bildirim yok</div>
          <p className="empty-desc">
            Maç, teklif veya yeni üye olaylarında burada görünür.
          </p>
          <Link href="/matches" className="btn btn-primary">
            Maçlara git
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {notifications.map((n) => {
            const relative = formatRelativeTimeTr(n.createdAt);
            const absolute = new Intl.DateTimeFormat("tr-TR", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(n.createdAt);

            return (
              <li key={n.id} className="flex items-stretch gap-2">
                <div className="min-w-0 flex-1">
                  <NotificationOpenButton
                    notificationId={n.id}
                    linkUrl={n.linkUrl ?? "/notifications"}
                    isRead={n.isRead}
                    className={`notification-item w-full text-left ${n.isRead ? "" : "notification-item--unread"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-1 gap-3">
                        <span className="text-xl leading-none" aria-hidden>
                          {notificationTypeIcon(n.type)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {!n.isRead ? (
                              <span className="badge badge-win">Yeni</span>
                            ) : null}
                            <span className="font-semibold text-text-primary">
                              {n.title}
                            </span>
                          </div>
                          <p className="text-text-secondary mt-1 text-sm">{n.body}</p>
                        </div>
                      </div>
                      <time
                        className="text-text-muted shrink-0 text-xs"
                        dateTime={n.createdAt.toISOString()}
                        title={absolute}
                      >
                        {relative}
                      </time>
                    </div>
                  </NotificationOpenButton>
                </div>
                <DeleteNotificationButton notificationId={n.id} />
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 ? (
        <div className="mt-6 flex justify-center gap-2">
          {currentPage > 1 ? (
            <Link href={hrefFor(currentPage - 1)} className="btn btn-secondary btn-sm">
              Önceki
            </Link>
          ) : null}
          <span className="text-text-muted self-center text-sm">
            {currentPage} / {totalPages}
          </span>
          {currentPage < totalPages ? (
            <Link href={hrefFor(currentPage + 1)} className="btn btn-secondary btn-sm">
              Sonraki
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
