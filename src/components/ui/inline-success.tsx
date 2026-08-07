"use client";

import { useEffect, useState } from "react";

type InlineSuccessProps = {
  message?: string;
  /** Remount/change this to replay the flash. */
  trigger?: string | number | boolean | null;
  durationMs?: number;
  className?: string;
};

/**
 * Compact success flash for forms/actions (✓ + fade).
 */
export function InlineSuccess({
  message = "Kaydedildi",
  trigger,
  durationMs = 1600,
  className = "",
}: InlineSuccessProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trigger == null || trigger === false || trigger === "") {
      setVisible(false);
      return;
    }
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), durationMs);
    return () => window.clearTimeout(t);
  }, [trigger, durationMs]);

  if (!visible) return null;

  return (
    <p
      className={`ui-inline-success ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <span className="ui-inline-success__mark" aria-hidden>
        ✓
      </span>
      {message}
    </p>
  );
}
