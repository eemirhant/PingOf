import {
  BracketMatchCard,
  type BracketMatchCardProps,
} from "@/components/tournaments/bracket/bracket-match-card";

export type BracketColumnMatch = BracketMatchCardProps & {
  bracketSlot: number;
};

type BracketColumnProps = {
  title: string;
  matches: BracketColumnMatch[];
  /** When true, group every two slots for connector elbows into next round. */
  showFeedConnectors: boolean;
};

export function BracketColumn({
  title,
  matches,
  showFeedConnectors,
}: BracketColumnProps) {
  const sorted = [...matches].sort((a, b) => a.bracketSlot - b.bracketSlot);

  if (!showFeedConnectors) {
    return (
      <section className="bracket-column" aria-label={title}>
        <h3 className="bracket-column-title">{title}</h3>
        <div className="bracket-column-slots">
          {sorted.map((match) => (
            <div key={match.matchId} className="bracket-slot">
              <BracketMatchCard {...match} />
              <span className="bracket-line-h" aria-hidden />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const groups: BracketColumnMatch[][] = [];
  for (let i = 0; i < sorted.length; i += 2) {
    groups.push(sorted.slice(i, i + 2));
  }

  return (
    <section className="bracket-column" aria-label={title}>
      <h3 className="bracket-column-title">{title}</h3>
      <div className="bracket-column-slots">
        {groups.map((group, groupIndex) => {
          const paired = group.length === 2;
          return (
            <div
              key={`g-${groupIndex}`}
              className={`bracket-feed-group${paired ? " is-paired" : ""}`}
            >
              {group.map((match) => (
                <div key={match.matchId} className="bracket-slot">
                  <BracketMatchCard {...match} />
                  <span className="bracket-line-h" aria-hidden />
                </div>
              ))}
              {paired ? (
                <>
                  <span className="bracket-feed-rail" aria-hidden />
                  <span className="bracket-feed-out" aria-hidden />
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
