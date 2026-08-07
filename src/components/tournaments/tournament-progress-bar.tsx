type TournamentProgressBarProps = {
  percent: number;
  completed: number;
  remaining: number;
};

export function TournamentProgressBar({
  percent,
  completed,
  remaining,
}: TournamentProgressBarProps) {
  const safe = Math.max(0, Math.min(100, percent));

  return (
    <section className="tournament-progress card card-static" aria-label="Turnuva ilerlemesi">
      <div className="tournament-progress__head">
        <span className="tournament-progress__title">Canlı İlerleme</span>
        <span className="tournament-progress__pct">%{safe} Tamamlandı</span>
      </div>
      <div
        className="tournament-progress__bar"
        role="progressbar"
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${safe}%` }} />
      </div>
      <p className="tournament-progress__meta">
        {completed} tamamlandı · {remaining} kalan
      </p>
    </section>
  );
}
