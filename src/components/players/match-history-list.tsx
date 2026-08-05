"use client";

import Link from "next/link";
import { useState } from "react";

import type { MatchHistoryRow } from "@/domain/player-stats";

type MatchHistoryListProps = {
  rows: MatchHistoryRow[];
};

export function MatchHistoryList({ rows }: MatchHistoryListProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <p className="text-text-secondary py-6 text-center text-sm">
        Bu filtrelere uyan maç bulunamadı.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const open = openId === row.matchId;
        const opponents = row.opponentLabel;
        const partners = row.partners.map((p) => p.fullName).join(" & ");
        const win = row.result === "W";

        return (
          <div
            key={row.matchId}
            className="overflow-hidden rounded-md border border-border bg-white/[0.02]"
          >
            <button
              type="button"
              className="flex w-full min-h-11 items-center gap-3 px-3 py-3 text-left"
              onClick={() => setOpenId(open ? null : row.matchId)}
              aria-expanded={open}
            >
              <span
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold"
                style={{
                  background: win ? "rgba(16,185,129,0.15)" : "rgba(244,63,94,0.15)",
                  color: win ? "var(--color-green)" : "#fb7185",
                }}
              >
                {win ? "G" : "M"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`badge ${row.format === "SINGLES" ? "badge-1v1" : "badge-2v2"}`}
                  >
                    {row.format === "SINGLES" ? "1v1" : "2v2"}
                  </span>
                  {row.isTournament ? (
                    <span className="badge badge-planned">Turnuva maçı</span>
                  ) : null}
                  <span className="font-mono text-sm font-bold">
                    {row.playerSetsWon}-{row.playerSetsLost}
                  </span>
                </div>
                <div className="text-text-secondary mt-0.5 truncate text-sm">
                  vs {opponents || "—"}
                  {row.ownTeamLabel ? (
                    <span className="text-text-muted"> · {row.ownTeamLabel}</span>
                  ) : partners ? (
                    <span className="text-text-muted"> · partner: {partners}</span>
                  ) : null}
                </div>
                <div className="text-text-muted text-xs">
                  {row.playedAt
                    ? new Intl.DateTimeFormat("tr-TR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(row.playedAt)
                    : "Tarih yok"}
                </div>
              </div>
              <span className="text-text-muted text-xs">{open ? "▲" : "▼"}</span>
            </button>

            {open ? (
              <div className="border-t border-border px-3 py-3">
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-text-muted">
                  Set Skorları
                </div>
                <div className="flex flex-wrap gap-2">
                  {row.setScores.map((set, index) => (
                    <span
                      key={index}
                      className="rounded-md border border-border px-2 py-1 font-mono text-sm"
                    >
                      {set.team1Score}–{set.team2Score}
                    </span>
                  ))}
                </div>
                <Link
                  href={`/matches/${row.matchId}`}
                  className="text-accent-light mt-3 inline-block text-sm font-semibold"
                >
                  Maç detayına git →
                </Link>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
