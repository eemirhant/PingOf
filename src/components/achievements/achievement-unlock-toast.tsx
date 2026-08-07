"use client";

type AchievementUnlockToastProps = {
  name: string;
  icon: string;
};

export function AchievementUnlockToast({
  name,
  icon,
}: AchievementUnlockToastProps) {
  return (
    <div
      className="celebration-toast celebration-toast--win achievement-unlock-toast"
      role="status"
      aria-live="polite"
    >
      <div className="celebration-toast__emoji" aria-hidden>
        {icon || "🏆"}
      </div>
      <div className="celebration-toast__body">
        <div className="celebration-toast__title">Yeni Başarı Açıldı</div>
        <div className="celebration-toast__subtitle">{name}</div>
      </div>
    </div>
  );
}
