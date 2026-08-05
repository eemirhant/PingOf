"use client";

import { useRealtime } from "@/components/realtime/realtime-provider";
import { openNotificationAction } from "@/lib/actions/notifications";

type NotificationOpenButtonProps = {
  notificationId: string;
  linkUrl: string;
  isRead: boolean;
  children: React.ReactNode;
  className?: string;
};

/**
 * Marks notification read on open and optimistically drops unread badge.
 */
export function NotificationOpenButton({
  notificationId,
  linkUrl,
  isRead,
  children,
  className,
}: NotificationOpenButtonProps) {
  const { setUnreadNotificationsOptimistic } = useRealtime();

  return (
    <form
      action={async (fd) => {
        if (!isRead) {
          setUnreadNotificationsOptimistic((n) => Math.max(0, n - 1));
        }
        await openNotificationAction(fd);
      }}
    >
      <input type="hidden" name="notificationId" value={notificationId} />
      <input type="hidden" name="linkUrl" value={linkUrl} />
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
