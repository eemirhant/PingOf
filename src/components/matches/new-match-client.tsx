"use client";

import { InstantMatchForm } from "@/components/matches/instant-match-form";
import { PlannedMatchForm } from "@/components/matches/planned-match-form";
import { NewChallengePanel } from "@/components/challenges/new-challenge-panel";
import type { OrgPlayerOption } from "@/lib/matches/service";
import { useRouter, useSearchParams } from "next/navigation";

type MatchType = "instant" | "planned" | "challenge";

type NewMatchClientProps = {
  currentUserId: string;
  currentUserName: string;
  currentUserAvatarUrl?: string | null;
  players: OrgPlayerOption[];
  initialType: MatchType;
};

export function NewMatchClient({
  currentUserId,
  currentUserName,
  currentUserAvatarUrl,
  players,
  initialType,
}: NewMatchClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const type: MatchType =
    typeParam === "planned" || typeParam === "instant" || typeParam === "challenge"
      ? typeParam
      : initialType;
  const opponentId = searchParams.get("opponent");

  function setType(next: MatchType) {
    const params = new URLSearchParams();
    if (next !== "instant") params.set("type", next);
    const q = params.toString();
    router.replace(q ? `/matches/new?${q}` : "/matches/new");
  }

  return (
    <div>
      <div className="mx-auto mb-4 max-w-[680px]">
        <div className="card">
          <div className="card-title">Maç Türü</div>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-btn ${type === "instant" ? "active" : ""}`}
              onClick={() => setType("instant")}
            >
              Anlık Maç
            </button>
            <button
              type="button"
              className={`toggle-btn ${type === "planned" ? "active" : ""}`}
              onClick={() => setType("planned")}
            >
              Maç Planla
            </button>
            <button
              type="button"
              className={`toggle-btn ${type === "challenge" ? "active" : ""}`}
              onClick={() => setType("challenge")}
            >
              Meydan Oku
            </button>
          </div>
        </div>
      </div>

      {type === "challenge" ? (
        <NewChallengePanel
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserAvatarUrl={currentUserAvatarUrl}
          players={players}
          initialOpponentId={opponentId}
        />
      ) : type === "planned" ? (
        <PlannedMatchForm
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserAvatarUrl={currentUserAvatarUrl}
          players={players}
        />
      ) : (
        <InstantMatchForm
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserAvatarUrl={currentUserAvatarUrl}
          players={players}
        />
      )}
    </div>
  );
}
