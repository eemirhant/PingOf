"use client";

import { useMemo, useState } from "react";

import { ChallengeDuelAnimation } from "@/components/challenges/challenge-duel-animation";
import { ChallengeForm } from "@/components/challenges/challenge-form";
import { EmptyState } from "@/components/ui/empty-state";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { OrgPlayerOption } from "@/lib/matches/service";

type NewChallengePanelProps = {
  currentUserId: string;
  currentUserName: string;
  currentUserAvatarUrl?: string | null;
  currentUserAvatarColor?: string | null;
  players: OrgPlayerOption[];
  initialOpponentId?: string | null;
};

export function NewChallengePanel({
  currentUserId,
  currentUserName,
  currentUserAvatarUrl,
  currentUserAvatarColor,
  players,
  initialOpponentId = null,
}: NewChallengePanelProps) {
  const opponents = useMemo(
    () => players.filter((p) => p.id !== currentUserId),
    [players, currentUserId],
  );

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (initialOpponentId && opponents.some((p) => p.id === initialOpponentId)) {
      return initialOpponentId;
    }
    return null;
  });

  const selected = opponents.find((p) => p.id === selectedId) ?? null;

  const filtered = opponents.filter((p) =>
    p.fullName.toLocaleLowerCase("tr-TR").includes(query.trim().toLocaleLowerCase("tr-TR")),
  );

  return (
    <div className="mx-auto max-w-[680px] space-y-4">
      <ChallengeDuelAnimation
        challenger={{
          id: currentUserId,
          fullName: currentUserName,
          avatarUrl: currentUserAvatarUrl,
          avatarColor: currentUserAvatarColor,
        }}
        opponent={
          selected
            ? {
                id: selected.id,
                fullName: selected.fullName,
                avatarUrl: selected.avatarUrl,
                avatarColor: selected.avatarColor,
              }
            : null
        }
      />

      {!selected ? (
        <div className="form-section">
          <div className="form-section-title">Rakip seç (1v1)</div>
          <input
            type="search"
            className="form-input mb-3"
            placeholder="Oyuncu ara…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Oyuncu ara"
          />

          {filtered.length === 0 ? (
            <EmptyState
              className="card-static mt-1"
              icon="🔍"
              title={
                opponents.length === 0
                  ? "Oyuncu yok"
                  : "Arama sonucu yok"
              }
              description={
                opponents.length === 0
                  ? "Organizasyonda meydan okuyabileceğin başka oyuncu yok."
                  : "Aramaya uyan oyuncu bulunamadı. Farklı bir isim dene."
              }
            />
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {filtered.map((player) => (
                <li key={player.id}>
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center gap-3 rounded-md border border-border px-3 py-2 text-left transition hover:border-accent hover:bg-accent/10"
                    onClick={() => setSelectedId(player.id)}
                  >
                    <UserAvatar
                      userId={player.id}
                      fullName={player.fullName}
                      avatarUrl={player.avatarUrl}
                      avatarColor={player.avatarColor}
                      size="sm"
                      className="shrink-0"
                    />
                    <span className="min-w-0 flex-1 truncate font-semibold">
                      {player.fullName}
                    </span>
                    <span className="text-accent-light shrink-0 text-xs font-bold uppercase">
                      Meydan oku
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            className="text-text-muted hover:text-text-secondary text-sm"
            onClick={() => setSelectedId(null)}
          >
            ← Başka rakip seç
          </button>
          <ChallengeForm
            toUserId={selected.id}
            toUserName={selected.fullName}
            cancelHref="/matches/new?type=challenge"
            hideIntro
          />
        </div>
      )}
    </div>
  );
}
