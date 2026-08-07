"use client";

import type { AchievementProgress } from "@/domain/achievements";

type AchievementBadgeCardProps = {
  achievement: AchievementProgress;
};

export function AchievementBadgeCard({ achievement }: AchievementBadgeCardProps) {
  const { unlocked, icon, name, description, color, current, target, percent } =
    achievement;

  return (
    <article
      className={`achievement-card ${unlocked ? "achievement-card--unlocked" : "achievement-card--locked"}`}
      style={
        unlocked
          ? ({ "--achievement-color": color } as React.CSSProperties)
          : undefined
      }
    >
      <div className="achievement-card__icon" aria-hidden>
        {icon}
      </div>
      <div className="achievement-card__body">
        <h3 className="achievement-card__name">{name}</h3>
        <p className="achievement-card__desc">{description}</p>
        <div className="achievement-card__meta">
          <span className="achievement-card__progress-label">
            {unlocked
              ? "%100"
              : `${Math.min(current, target)} / ${target}`}
          </span>
          <span className="achievement-card__percent">%{percent}</span>
        </div>
        <div
          className="achievement-card__bar"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${name} ilerlemesi`}
        >
          <span
            className="achievement-card__bar-fill"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </article>
  );
}
