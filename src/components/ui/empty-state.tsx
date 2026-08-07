import Link from "next/link";
import type { ReactNode } from "react";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  className?: string;
};

/**
 * Shared empty-state language for list/detail screens.
 */
export function EmptyState({
  icon = "🏓",
  title,
  description,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`card empty-state ui-empty ${className}`.trim()} role="status">
      <div className="empty-icon ui-empty__icon" aria-hidden>
        {icon}
      </div>
      <div className="empty-title">{title}</div>
      <p className="empty-desc">{description}</p>
      {actionHref && actionLabel ? (
        <div className="ui-empty__actions">
          <Link href={actionHref} className="btn btn-primary">
            {actionLabel}
          </Link>
          {secondaryHref && secondaryLabel ? (
            <Link href={secondaryHref} className="btn btn-secondary">
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
