"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  EMPTY_SET,
  sanitizeScoreInput,
  syncSetRows,
  toSetInputs,
  type SetDraft,
} from "@/components/matches/set-score-draft";
import { determineMatchWinner, validateSetScore } from "@/domain/match-scoring";
import {
  enterPlannedMatchResultAction,
  type MatchActionState,
} from "@/lib/actions/matches";

const initialState: MatchActionState = {};

type PlannedResultFormProps = {
  matchId: string;
  team1Label: string;
  team2Label: string;
};

export function PlannedResultForm({
  matchId,
  team1Label,
  team2Label,
}: PlannedResultFormProps) {
  const [state, formAction, isPending] = useActionState(
    enterPlannedMatchResultAction,
    initialState,
  );
  const [sets, setSets] = useState<SetDraft[]>([{ ...EMPTY_SET }]);

  const progress = useMemo(() => determineMatchWinner(toSetInputs(sets)), [sets]);
  const team1SetsWon = progress.ok ? progress.team1SetsWon : 0;
  const team2SetsWon = progress.ok ? progress.team2SetsWon : 0;
  const canSubmit = progress.ok && progress.complete;

  function updateSet(index: number, side: "team1Score" | "team2Score", value: string) {
    const sanitized = sanitizeScoreInput(value);
    setSets((prev) => {
      const next = prev.map((set, i) =>
        i === index ? { ...set, [side]: sanitized } : set,
      );
      return syncSetRows(next);
    });
  }

  return (
    <form action={formAction} className="mx-auto max-w-[680px] space-y-4">
      <input type="hidden" name="matchId" value={matchId} />
      <input type="hidden" name="sets" value={JSON.stringify(toSetInputs(sets))} />

      <div className="form-section">
        <div className="form-section-title">Set Skorları</div>
        <div className="score-summary mb-4">
          <div className="mb-1 text-xs text-accent-light">ANLIK SKOR</div>
          <div className="score-summary-big">
            <span className="text-green">{team1SetsWon}</span>{" "}
            <span className="text-text-muted text-[1.25rem] font-normal">–</span>{" "}
            <span className="text-red-light">{team2SetsWon}</span>
          </div>
          <div className="text-text-secondary mt-1 text-[0.8125rem]">
            {progress.ok
              ? progress.complete
                ? `${progress.winnerTeam === 1 ? team1Label : team2Label} kazandı`
                : progress.summary
              : progress.error}
          </div>
        </div>

        {sets.map((set, index) => {
          const result =
            set.team1Score !== "" && set.team2Score !== ""
              ? validateSetScore(Number(set.team1Score), Number(set.team2Score))
              : null;
          const w1 = Boolean(result?.ok) && Number(set.team1Score) > Number(set.team2Score);
          const w2 = Boolean(result?.ok) && Number(set.team2Score) > Number(set.team1Score);

          return (
            <div
              key={index}
              className="mb-2 rounded-md border border-border bg-white/[0.03] px-3.5 py-3"
            >
              <div className="text-text-muted mb-2 text-[0.7rem] font-bold uppercase tracking-wider">
                Set {index + 1}
              </div>
              <div className="score-input-row">
                <input
                  className="form-input score-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  placeholder="0"
                  value={set.team1Score}
                  onChange={(e) => updateSet(index, "team1Score", e.target.value)}
                  style={
                    w1
                      ? {
                          color: "var(--color-green)",
                          borderColor: "rgba(16,185,129,0.3)",
                          background: "rgba(16,185,129,0.06)",
                        }
                      : undefined
                  }
                />
                <div className="score-divider">–</div>
                <input
                  className="form-input score-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  placeholder="0"
                  value={set.team2Score}
                  onChange={(e) => updateSet(index, "team2Score", e.target.value)}
                  style={
                    w2
                      ? {
                          color: "var(--color-green)",
                          borderColor: "rgba(16,185,129,0.3)",
                          background: "rgba(16,185,129,0.06)",
                        }
                      : undefined
                  }
                />
              </div>
              {result && !result.ok ? (
                <p className="form-error text-center">{result.error}</p>
              ) : null}
            </div>
          );
        })}
      </div>

      {state.error ? (
        <p className="form-error rounded-md border border-red/20 bg-red/10 px-3 py-2" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-2.5 pt-2">
        <Link href={`/matches/${matchId}`} className="btn btn-secondary w-[120px]">
          İptal
        </Link>
        <Button
          type="submit"
          variant="primary"
          className="flex-1"
          size="lg"
          disabled={isPending || !canSubmit}
        >
          {isPending ? "Kaydediliyor…" : "Sonucu Kaydet"}
        </Button>
      </div>
    </form>
  );
}
