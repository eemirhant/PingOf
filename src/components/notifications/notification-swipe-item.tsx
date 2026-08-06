"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { notificationTypeIcon } from "@/domain/notification";
import {
  notificationUiCategory,
  type NotificationUiCategory,
} from "@/lib/notifications/ui-meta";
import { formatRelativeTimeTr } from "@/lib/utils/relative-time";

export type NotificationListItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
};

type NotificationSwipeItemProps = {
  item: NotificationListItem;
  onOpen: (item: NotificationListItem) => void;
  onRequestDelete: (item: NotificationListItem) => void;
  exiting?: boolean;
};

const DELETE_THRESHOLD = 96;
const MAX_DRAG = 140;

const CATEGORY_EMOJI: Record<NotificationUiCategory, string> = {
  challenge: "🟣",
  match: "🔵",
  tournament: "🟢",
  stake: "🟠",
  system: "⚪",
};

export function NotificationSwipeItem({
  item,
  onOpen,
  onRequestDelete,
  exiting = false,
}: NotificationSwipeItemProps) {
  const category = notificationUiCategory(item.type);
  const trackRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const axisLock = useRef<"x" | "y" | null>(null);
  const dragged = useRef(false);
  const pointerId = useRef<number | null>(null);

  const absolute = new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(item.createdAt));
  const relative = formatRelativeTimeTr(new Date(item.createdAt));

  const reset = useCallback(() => {
    setOffset(0);
    setDragging(false);
    axisLock.current = null;
    pointerId.current = null;
  }, []);

  useEffect(() => {
    if (exiting) setOffset(-MAX_DRAG);
  }, [exiting]);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    pointerId.current = e.pointerId;
    startX.current = e.clientX;
    startY.current = e.clientY;
    startOffset.current = offset;
    axisLock.current = null;
    dragged.current = false;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (pointerId.current !== e.pointerId || !dragging) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    if (!axisLock.current) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      axisLock.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (axisLock.current === "y") {
        setDragging(false);
        return;
      }
    }
    if (axisLock.current !== "x") return;

    dragged.current = true;
    const next = Math.min(0, Math.max(-MAX_DRAG, startOffset.current + dx));
    setOffset(next);
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (pointerId.current !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const shouldDelete = offset <= -DELETE_THRESHOLD;
    const wasDrag = dragged.current;
    setDragging(false);
    pointerId.current = null;
    axisLock.current = null;

    if (shouldDelete) {
      setOffset(-MAX_DRAG);
      onRequestDelete(item);
      return;
    }

    setOffset(0);
    if (!wasDrag) {
      onOpen(item);
    }
  }

  function onPointerCancel() {
    reset();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(item);
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      onRequestDelete(item);
    }
  }

  const reveal = Math.min(1, Math.abs(offset) / DELETE_THRESHOLD);

  return (
    <div
      className={`nc-swipe ${exiting ? "nc-swipe--exit" : ""}`}
      data-category={category}
    >
      <div className="nc-swipe-actions" aria-hidden style={{ opacity: reveal }}>
        <span className="nc-swipe-delete-label">🗑 Sil</span>
      </div>
      <div
        ref={trackRef}
        role="button"
        tabIndex={0}
        className={`nc-card nc-card--${category} ${item.isRead ? "" : "nc-card--unread"} ${dragging ? "nc-card--dragging" : ""}`}
        style={{
          transform: `translate3d(${offset}px, 0, 0)`,
          transition: dragging ? "none" : "transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
        aria-label={`${item.title}. ${item.body}. ${relative}${item.isRead ? "" : ". Okunmadı"}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onKeyDown={onKeyDown}
      >
        <div className="nc-card-accent" aria-hidden />
        <div className="nc-card-icon" aria-hidden>
          <span className="nc-card-icon-emoji">{notificationTypeIcon(item.type)}</span>
          <span className="nc-card-icon-dot">{CATEGORY_EMOJI[category]}</span>
        </div>
        <div className="nc-card-body">
          <div className="nc-card-top">
            <h3 className="nc-card-title">{item.title}</h3>
            <div className="nc-card-meta">
              <time dateTime={item.createdAt} title={absolute}>
                {relative}
              </time>
              {!item.isRead ? (
                <span className="nc-unread-dot" aria-hidden />
              ) : null}
            </div>
          </div>
          <p className="nc-card-desc">{item.body}</p>
        </div>
      </div>
    </div>
  );
}
