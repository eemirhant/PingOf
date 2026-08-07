import type { CSSProperties, ReactNode } from "react";

type SkeletonProps = {
  className?: string;
  style?: CSSProperties;
};

/** Base shimmer block — use for custom layouts. */
export function Skeleton({ className = "", style }: SkeletonProps) {
  return <div className={`ui-skeleton ${className}`.trim()} style={style} aria-hidden />;
}

export function SkeletonText({
  lines = 1,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`ui-skeleton-text ${className}`.trim()} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`ui-skeleton--text ${i === lines - 1 && lines > 1 ? "ui-skeleton--text-short" : ""}`}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({
  size = "sm",
  className = "",
}: {
  size?: "xs" | "sm" | "lg" | "xl";
  className?: string;
}) {
  return (
    <Skeleton
      className={`ui-skeleton--avatar ui-skeleton--avatar-${size} ${className}`.trim()}
    />
  );
}

export function SkeletonButton({ className = "" }: { className?: string }) {
  return <Skeleton className={`ui-skeleton--button ${className}`.trim()} />;
}

export function SkeletonCard({
  withAvatar = false,
  lines = 2,
  className = "",
}: {
  withAvatar?: boolean;
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`card ui-skeleton-card ${className}`.trim()} aria-hidden>
      <div className="ui-skeleton-card__row">
        {withAvatar ? <SkeletonAvatar /> : null}
        <div className="ui-skeleton-card__body">
          <Skeleton className="ui-skeleton--title" />
          <SkeletonText lines={lines} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({
  count = 4,
  withAvatar = true,
  className = "",
}: {
  count?: number;
  withAvatar?: boolean;
  className?: string;
}) {
  return (
    <div className={`ui-skeleton-list ${className}`.trim()} aria-busy="true" role="status">
      <span className="sr-only">Yükleniyor</span>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} withAvatar={withAvatar} />
      ))}
    </div>
  );
}

export function PageSkeleton({
  variant = "list",
}: {
  variant?: "list" | "profile" | "bracket" | "feed";
}) {
  if (variant === "profile") {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8 ui-page-enter" aria-busy="true">
        <span className="sr-only">Yükleniyor</span>
        <div className="flex items-center gap-4">
          <SkeletonAvatar size="xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="ui-skeleton--title ui-skeleton--w-40" />
            <SkeletonText lines={2} />
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <SkeletonCard lines={1} />
          <SkeletonCard lines={1} />
          <SkeletonCard lines={1} />
        </div>
        <SkeletonList count={3} className="mt-6" />
      </div>
    );
  }

  if (variant === "bracket") {
    return (
      <div className="mx-auto max-w-[1400px] px-6 py-8 ui-page-enter" aria-busy="true">
        <span className="sr-only">Yükleniyor</span>
        <Skeleton className="ui-skeleton--title ui-skeleton--w-48" />
        <div className="mt-6 flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="min-w-[14rem] space-y-4">
              <Skeleton className="ui-skeleton--text" />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "feed") {
    return (
      <div className="nc-page ui-page-enter" aria-busy="true">
        <span className="sr-only">Yükleniyor</span>
        <Skeleton className="ui-skeleton--title ui-skeleton--w-40 mb-4" />
        <SkeletonList count={6} withAvatar={false} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 ui-page-enter" aria-busy="true">
      <span className="sr-only">Yükleniyor</span>
      <div className="mb-6 flex items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="ui-skeleton--title ui-skeleton--w-40" />
          <Skeleton className="ui-skeleton--text ui-skeleton--w-56" />
        </div>
        <SkeletonButton />
      </div>
      <SkeletonList count={5} />
    </div>
  );
}

export function SkeletonBlock({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}
