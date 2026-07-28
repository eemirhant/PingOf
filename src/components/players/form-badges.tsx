import type { MatchResultLetter } from "@/domain/player-stats";

type FormBadgesProps = {
  form: MatchResultLetter[];
  size?: "sm" | "md";
};

export function FormBadges({ form, size = "md" }: FormBadgesProps) {
  if (form.length === 0) {
    return <span className="text-text-muted text-xs">Henüz form yok</span>;
  }

  const dim = size === "sm" ? "h-6 w-6 text-[0.65rem]" : "h-7 w-7 text-xs";

  return (
    <div className="flex flex-wrap gap-1">
      {form.map((letter, index) => {
        const win = letter === "W";
        return (
          <span
            key={`${letter}-${index}`}
            className={`${dim} inline-flex items-center justify-center rounded-md font-bold`}
            style={{
              background: win ? "rgba(16,185,129,0.15)" : "rgba(244,63,94,0.15)",
              color: win ? "var(--color-green)" : "var(--color-red-light, #fb7185)",
            }}
            title={win ? "Galibiyet" : "Mağlubiyet"}
          >
            {win ? "G" : "M"}
          </span>
        );
      })}
    </div>
  );
}
