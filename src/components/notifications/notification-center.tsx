"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, MoreHorizontal, Trash2 } from "lucide-react";

import {
  NotificationSwipeItem,
  type NotificationListItem,
} from "@/components/notifications/notification-swipe-item";
import { useRealtime } from "@/components/realtime/realtime-provider";
import {
  clearAllNotificationsAction,
  deleteNotificationAction,
  deleteReadNotificationsAction,
  markAllNotificationsReadAction,
  openNotificationAction,
} from "@/lib/actions/notifications";
import {
  matchesNotificationFilter,
  notificationDateGroup,
  notificationDateGroupLabel,
  NOTIFICATION_FILTERS,
  type NotificationDateGroupId,
  type NotificationFilterId,
} from "@/lib/notifications/ui-meta";

type NotificationCenterProps = {
  initialItems: NotificationListItem[];
  initialUnreadCount: number;
  total: number;
};

type PendingDelete = {
  item: NotificationListItem;
  timeoutId: ReturnType<typeof setTimeout>;
};

const GROUP_ORDER: NotificationDateGroupId[] = [
  "today",
  "yesterday",
  "week",
  "older",
];

export function NotificationCenter({
  initialItems,
  initialUnreadCount,
  total,
}: NotificationCenterProps) {
  const router = useRouter();
  const { setUnreadNotificationsOptimistic } = useRealtime();
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<NotificationFilterId>("all");
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [busy, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    return () => {
      if (pendingDelete) clearTimeout(pendingDelete.timeoutId);
    };
  }, [pendingDelete]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setConfirmClearAll(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const filtered = useMemo(
    () => items.filter((n) => matchesNotificationFilter(filter, n)),
    [items, filter],
  );

  const grouped = useMemo(() => {
    const map = new Map<NotificationDateGroupId, NotificationListItem[]>();
    for (const id of GROUP_ORDER) map.set(id, []);
    for (const item of filtered) {
      const g = notificationDateGroup(new Date(item.createdAt));
      map.get(g)!.push(item);
    }
    return GROUP_ORDER.map((id) => ({
      id,
      label: notificationDateGroupLabel(id),
      items: map.get(id) ?? [],
    })).filter((g) => g.items.length > 0);
  }, [filtered]);

  const unreadInView = items.filter((i) => !i.isRead).length;

  const commitDelete = useCallback(
    async (item: NotificationListItem) => {
      const fd = new FormData();
      fd.set("notificationId", item.id);
      await deleteNotificationAction({}, fd);
      startTransition(() => router.refresh());
    },
    [router],
  );

  const requestDelete = useCallback(
    (item: NotificationListItem) => {
      setExitingIds((prev) => new Set(prev).add(item.id));

      window.setTimeout(() => {
        setItems((prev) => prev.filter((n) => n.id !== item.id));
        setExitingIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });

        if (pendingDelete) {
          clearTimeout(pendingDelete.timeoutId);
          void commitDelete(pendingDelete.item);
        }

        if (!item.isRead) {
          setUnreadNotificationsOptimistic((n) => Math.max(0, n - 1));
        }

        const timeoutId = setTimeout(() => {
          void commitDelete(item);
          setPendingDelete(null);
        }, 5000);

        setPendingDelete({ item, timeoutId });
      }, 280);
    },
    [commitDelete, pendingDelete, setUnreadNotificationsOptimistic],
  );

  function undoDelete() {
    if (!pendingDelete) return;
    clearTimeout(pendingDelete.timeoutId);
    const restored = pendingDelete.item;
    setPendingDelete(null);
    setItems((prev) => {
      if (prev.some((n) => n.id === restored.id)) return prev;
      return [...prev, restored].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    });
    if (!restored.isRead) {
      setUnreadNotificationsOptimistic((n) => n + 1);
    }
  }

  function openItem(item: NotificationListItem) {
    if (!item.isRead) {
      setUnreadNotificationsOptimistic((n) => Math.max(0, n - 1));
      setItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
      );
    }
    const fd = new FormData();
    fd.set("notificationId", item.id);
    fd.set("linkUrl", item.linkUrl ?? "/notifications");
    startTransition(() => {
      void openNotificationAction(fd);
    });
  }

  function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadNotificationsOptimistic(0);
    const fd = new FormData();
    startTransition(async () => {
      await markAllNotificationsReadAction({}, fd);
      router.refresh();
    });
  }

  function clearRead() {
    setMenuOpen(false);
    setItems((prev) => prev.filter((n) => !n.isRead));
    const fd = new FormData();
    startTransition(async () => {
      await deleteReadNotificationsAction({}, fd);
      router.refresh();
    });
  }

  function clearAll() {
    setConfirmClearAll(false);
    setItems([]);
    setUnreadNotificationsOptimistic(0);
    const fd = new FormData();
    startTransition(async () => {
      await clearAllNotificationsAction({}, fd);
      router.refresh();
    });
  }

  return (
    <div className="nc-root">
      <header className="nc-header">
        <div className="nc-header-text">
          <h1 className="nc-title">Bildirimler</h1>
          <p className="nc-subtitle">
            {total} bildirim
            {initialUnreadCount > 0 || unreadInView > 0
              ? ` · ${Math.max(initialUnreadCount, unreadInView)} okunmamış`
              : ""}
          </p>
        </div>

        <div className="nc-header-actions">
          <button
            type="button"
            className="nc-btn nc-btn--secondary"
            disabled={busy || unreadInView === 0}
            onClick={markAllRead}
          >
            <CheckCheck size={16} aria-hidden />
            <span>Tümünü okundu işaretle</span>
          </button>

          <button
            type="button"
            className="nc-btn nc-btn--danger"
            disabled={busy || items.length === 0}
            onClick={() => setConfirmClearAll(true)}
          >
            <Trash2 size={16} aria-hidden />
            <span>Tümünü sil</span>
          </button>

          <div className="nc-menu" ref={menuRef}>
            <button
              type="button"
              className="nc-btn nc-btn--ghost nc-btn--icon"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Diğer işlemler"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MoreHorizontal size={18} />
            </button>
            {menuOpen ? (
              <div className="nc-menu-panel" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className="nc-menu-item"
                  disabled={busy || !items.some((n) => n.isRead)}
                  onClick={clearRead}
                >
                  Okunanları temizle
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div
        className="nc-filters"
        role="tablist"
        aria-label="Bildirim filtreleri"
      >
        {NOTIFICATION_FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`nc-filter-chip ${active ? "nc-filter-chip--active" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="nc-empty" role="status">
          <div className="nc-empty-art" aria-hidden>
            <Bell size={40} strokeWidth={1.5} />
            <span className="nc-empty-ring" />
          </div>
          <h2 className="nc-empty-title">Bildirimin bulunmuyor.</h2>
          <p className="nc-empty-desc">
            {filter === "all"
              ? "Maç, teklif ve turnuva olayları burada görünür."
              : "Bu filtrede gösterilecek bildirim yok."}
          </p>
        </div>
      ) : (
        <div className="nc-list" ref={listRef} role="list">
          {grouped.map((group) => (
            <section key={group.id} className="nc-group" aria-labelledby={`nc-g-${group.id}`}>
              <h2 id={`nc-g-${group.id}`} className="nc-group-label">
                {group.label}
              </h2>
              <ul className="nc-group-list">
                {group.items.map((item) => (
                  <li
                    key={item.id}
                    role="listitem"
                    className="nc-row"
                    style={{ contentVisibility: "auto", containIntrinsicSize: "0 76px" }}
                  >
                    <NotificationSwipeItem
                      item={item}
                      exiting={exitingIds.has(item.id)}
                      onOpen={openItem}
                      onRequestDelete={requestDelete}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {pendingDelete ? (
        <div className="nc-snackbar" role="status" aria-live="polite">
          <span>Bildirimi sildin.</span>
          <button type="button" className="nc-snackbar-undo" onClick={undoDelete}>
            Geri Al
          </button>
        </div>
      ) : null}

      {confirmClearAll ? (
        <div
          className="nc-modal-backdrop"
          role="presentation"
          onClick={() => setConfirmClearAll(false)}
        >
          <div
            className="nc-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="nc-clear-title"
            aria-describedby="nc-clear-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="nc-clear-title" className="nc-modal-title">
              Tüm bildirimler silinsin mi?
            </h2>
            <p id="nc-clear-desc" className="nc-modal-desc">
              Bu işlem geri alınamaz. Tüm bildirimlerin kalıcı olarak silinir.
            </p>
            <div className="nc-modal-actions">
              <button
                type="button"
                className="nc-btn nc-btn--secondary"
                onClick={() => setConfirmClearAll(false)}
              >
                Vazgeç
              </button>
              <button
                type="button"
                className="nc-btn nc-btn--danger"
                onClick={clearAll}
                autoFocus
              >
                Evet, tümünü sil
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
