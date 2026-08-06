"use client";

import { useEffect, useId, useRef, useState } from "react";

import { UserAvatar } from "@/components/ui/user-avatar";

export type DarkSelectOption = {
  value: string;
  label: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  /** Shown as muted hint, e.g. "(Sen)" */
  hint?: string;
};

type DarkSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: DarkSelectOption[];
  placeholder?: string;
  /** Empty value option label (open slot). Omit to hide empty choice. */
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

/**
 * Dark-themed select — native <option> menus ignore CSS on Windows/Chrome
 * and render white panels with unreadable text.
 */
export function DarkSelect({
  value,
  onChange,
  options,
  placeholder = "Seç…",
  emptyLabel,
  disabled = false,
  className = "",
  "aria-label": ariaLabel,
}: DarkSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);
  const displayLabel = selected
    ? `${selected.label}${selected.hint ? ` ${selected.hint}` : ""}`
    : emptyLabel && value === ""
      ? emptyLabel
      : placeholder;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={`dark-select ${className}`.trim()}>
      <button
        type="button"
        className="dark-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="dark-select-trigger-main">
          {selected ? (
            <UserAvatar
              userId={selected.value}
              fullName={selected.label}
              avatarUrl={selected.avatarUrl}
              avatarColor={selected.avatarColor}
              size="xs"
            />
          ) : null}
          <span
            className={
              selected || (emptyLabel && value === "")
                ? "dark-select-label"
                : "dark-select-placeholder"
            }
          >
            {displayLabel}
          </span>
        </span>
        <span className="dark-select-chevron" aria-hidden="true">
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open ? (
        <ul
          id={listId}
          className="dark-select-menu"
          role="listbox"
          aria-label={ariaLabel ?? "Seçenekler"}
        >
          {emptyLabel != null ? (
            <li role="option" aria-selected={value === ""}>
              <button
                type="button"
                className={`dark-select-option ${value === "" ? "is-selected" : ""}`}
                onClick={() => pick("")}
              >
                <span className="dark-select-placeholder">{emptyLabel}</span>
              </button>
            </li>
          ) : null}
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={`dark-select-option ${active ? "is-selected" : ""}`}
                  onClick={() => pick(opt.value)}
                >
                  <UserAvatar
                    userId={opt.value}
                    fullName={opt.label}
                    avatarUrl={opt.avatarUrl}
                    avatarColor={opt.avatarColor}
                    size="xs"
                  />
                  <span className="dark-select-label">
                    {opt.label}
                    {opt.hint ? (
                      <span className="dark-select-hint"> {opt.hint}</span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
