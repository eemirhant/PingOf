"use client";

import type { CSSProperties } from "react";

import type { AchievementProgress } from "@/domain/achievements";
import { ACHIEVEMENT_CATEGORY_LABELS } from "@/domain/achievements";

type AchievementBadgeCardProps = {
  achievement: AchievementProgress;
};

export function AchievementBadgeCard({ achievement }: AchievementBadgeCardProps) {
  const locked = !achievement.unlocked;
  const progressLabel =
    achievement.id === "win_rate_90"
      ? `%${Math.min(achievement.current, achievement.target)} / %${achievement.target}`
      : `${Math.min(achievement.current, achievement.target)} / ${achievement.target}`;

  return (
    <article
      className={`achievement-card ${locked ? "achievement-card--locked" : "achievement-card--unlocked"}`}
      style={
        locked
          ? undefined
          : ({
              "--achievement-color": achievement.color,
            } as CSSProperties)
      }
      aria-label={`${achievement.name}. ${locked ? "Kilitli" : "Açıldı"}. ${achievement.description}`}
    >
      <div className="achievement-card__icon" aria-hidden>
        {achievement.icon}
      </div>
      <div className="achievement-card__body">
        <div className="achievement-card__name">{achievement.name}</div>
        <p className="achievement-card__desc">{achievement.description}</p>
        <div className="achievement-card__meta">
          <span>{progressLabel}</span>
          <span>%{achievement.percent}</span>
        </div>
        <div
          className="achievement-card__bar"
          role="progressbar"
          aria-valuenow={achievement.percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${achievement.percent}%` }} />
        </div>
      </div>
    </article>
  );
}

type AchievementsPanelProps = {
  achievements: AchievementProgress[];
};

export function AchievementsPanel({ achievements }: AchievementsPanelProps) {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const groups = (
    Object.keys(ACHIEVEMENT_CATEGORY_LABELS) as Array<
      keyof typeof ACHIEVEMENT_CATEGORY_LABELS
    >
  ).map((category) => ({
    category,
    label: ACHIEVEMENT_CATEGORY_LABELS[category],
    items: achievements.filter((a) => a.category === category),
  }));

  return (
    <div className="achievements-panel">
      <div className="achievements-panel__summary">
        <span className="achievements-panel__count">
          {unlockedCount} / {achievements.length} başarı
        </span>
        <div
          className="achievement-card__bar achievements-panel__overall"
          role="progressbar"
          aria-valuenow={
            achievements.length
              ? Math.round((unlockedCount / achievements.length) * 100)
              : 0
          }
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span
            style={{
              width: achievements.length
                ? `${Math.round((unlockedCount / achievements.length) * 100)}%`
                : "0%",
            }}
          />
        </div>
      </div>

      {groups.map((group) =>
        group.items.length === 0 ? null : (
          <section key={group.category} className="achievements-group">
            <h3 className="achievements-group__title">{group.label}</h3>
            <div className="achievements-grid">
              {group.items.map((item) => (
                <AchievementBadgeCard key={item.id} achievement={item} />
              ))}
            </div>
          </section>
        ),
      )}
    </div>
  );
}
