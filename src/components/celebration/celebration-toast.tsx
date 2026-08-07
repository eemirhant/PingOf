"use client";

type CelebrationToastProps = {
  title: string;
  subtitle?: string;
  tone?: "win" | "neutral";
};

export function CelebrationToast({
  title,
  subtitle,
  tone = "win",
}: CelebrationToastProps) {
  return (
    <div
      className={`celebration-toast celebration-toast--${tone}`}
      role="status"
      aria-live="polite"
    >
      <div className="celebration-toast__emoji" aria-hidden>
        {tone === "win" ? "🎉" : "✓"}
      </div>
      <div className="celebration-toast__body">
        <div className="celebration-toast__title">{title}</div>
        {subtitle ? (
          <div className="celebration-toast__subtitle">{subtitle}</div>
        ) : null}
      </div>
    </div>
  );
}
