"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { MatchListCard } from "@/components/matches/match-list-card";
import {
  resolveMatchStatus,
  type MatchStatusValue,
} from "@/domain/match-status";
import type { MatchListTimeFilter } from "@/domain/match-time-filter";
import { fetchMatchesListAction } from "@/lib/actions/matches-list";
import type {
  MatchesListPayload,
  MatchesListScope,
} from "@/lib/matches/list-payload";
import type { MatchListStatusFilter } from "@/lib/matches/service";

const SCOPE_STORAGE_KEY = "matches-list-scope";
const TOURNAMENT_FILTER_KEY = "matches-tournament-filter";

export type MatchTournamentChip = {
  id: string;
  name: string;
  status: string;
};

type MatchesScopeListProps = {
  currentUserId: string;
  status: MatchListStatusFilter;
  time: MatchListTimeFilter;
  initialMine: MatchesListPayload;
  allTotal: number;
  tournamentTotal: number;
  tournaments: MatchTournamentChip[];
};

function toCardMatch(match: MatchesListPayload["matches"][number]) {
  return {
    ...match,
    scheduledAt: match.scheduledAt ? new Date(match.scheduledAt) : null,
    playedAt: match.playedAt ? new Date(match.playedAt) : null,
  };
}

function readStoredScope(): MatchesListScope {
  try {
    const raw = sessionStorage.getItem(SCOPE_STORAGE_KEY);
    if (raw === "all" || raw === "tournament") return raw;
    return "mine";
  } catch {
    return "mine";
  }
}

function storeScope(scope: MatchesListScope) {
  try {
    sessionStorage.setItem(SCOPE_STORAGE_KEY, scope);
  } catch {
    // ignore
  }
}

function readStoredTournamentFilter(): string | null {
  try {
    return sessionStorage.getItem(TOURNAMENT_FILTER_KEY);
  } catch {
    return null;
  }
}

function storeTournamentFilter(id: string | null) {
  try {
    if (id) sessionStorage.setItem(TOURNAMENT_FILTER_KEY, id);
    else sessionStorage.removeItem(TOURNAMENT_FILTER_KEY);
  } catch {
    // ignore
  }
}

export function MatchesScopeList({
  currentUserId,
  status,
  time,
  initialMine,
  allTotal,
  tournamentTotal,
  tournaments,
}: MatchesScopeListProps) {
  const [scope, setScope] = useState<MatchesListScope>("mine");
  const [tournamentFilter, setTournamentFilter] = useState<string | null>(null);
  const [mineData, setMineData] = useState(initialMine);
  const [allData, setAllData] = useState<MatchesListPayload | null>(null);
  const [tournamentData, setTournamentData] = useState<MatchesListPayload | null>(
    null,
  );
  const [minePage, setMinePage] = useState(initialMine.page);
  const [allPage, setAllPage] = useState(1);
  const [tournamentPage, setTournamentPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const filterKey = `${status}|${time}`;
  const prevFilterKey = useRef(filterKey);
  const didRestoreScope = useRef(false);
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const tournamentFilterRef = useRef(tournamentFilter);
  tournamentFilterRef.current = tournamentFilter;

  const loadScope = useCallback(
    (
      nextScope: MatchesListScope,
      page: number,
      nextTournamentId: string | null = tournamentFilterRef.current,
    ) => {
      setError(null);
      startTransition(async () => {
        try {
          const payload = await fetchMatchesListAction({
            page,
            status,
            time,
            scope: nextScope,
            tournamentId: nextScope === "tournament" ? nextTournamentId : null,
          });
          if (nextScope === "mine") {
            setMineData(payload);
            setMinePage(payload.page);
          } else if (nextScope === "all") {
            setAllData(payload);
            setAllPage(payload.page);
          } else {
            setTournamentData(payload);
            setTournamentPage(payload.page);
          }
        } catch {
          setError("Maçlar yüklenemedi. Tekrar dene.");
        }
      });
    },
    [status, time],
  );

  const loadScopeRef = useRef(loadScope);
  loadScopeRef.current = loadScope;

  useEffect(() => {
    if (prevFilterKey.current !== filterKey) {
      prevFilterKey.current = filterKey;
      setMineData(initialMine);
      setMinePage(initialMine.page);
      setAllData(null);
      setAllPage(1);
      setTournamentData(null);
      setTournamentPage(1);
      setError(null);
      if (scopeRef.current === "all") {
        loadScopeRef.current("all", 1);
      } else if (scopeRef.current === "tournament") {
        loadScopeRef.current("tournament", 1, tournamentFilterRef.current);
      }
      return;
    }
    setMineData(initialMine);
    setMinePage(initialMine.page);
  }, [filterKey, initialMine]);

  useEffect(() => {
    if (didRestoreScope.current) return;
    didRestoreScope.current = true;
    const stored = readStoredScope();
    const storedTournament = readStoredTournamentFilter();
    const validTournament =
      storedTournament && tournaments.some((t) => t.id === storedTournament)
        ? storedTournament
        : null;
    if (validTournament) {
      setTournamentFilter(validTournament);
      tournamentFilterRef.current = validTournament;
    }
    if (stored === "all") {
      setScope("all");
      loadScope("all", 1);
    } else if (stored === "tournament") {
      setScope("tournament");
      loadScope("tournament", 1, validTournament);
    }
  }, [loadScope, tournaments]);

  function selectScope(next: MatchesListScope) {
    if (next === scope) return;
    storeScope(next);
    setScope(next);
    if (next === "all" && !allData) {
      loadScope("all", allPage);
    } else if (next === "tournament" && !tournamentData) {
      loadScope("tournament", tournamentPage, tournamentFilter);
    }
  }

  function selectTournamentFilter(id: string | null) {
    if (id === tournamentFilter) return;
    storeTournamentFilter(id);
    setTournamentFilter(id);
    tournamentFilterRef.current = id;
    setTournamentPage(1);
    loadScope("tournament", 1, id);
  }

  function goToPage(page: number) {
    loadScope(scope, page, tournamentFilter);
  }

  const active =
    scope === "mine"
      ? mineData
      : scope === "all"
        ? (allData ?? mineData)
        : (tournamentData ?? mineData);
  const activePage =
    scope === "mine" ? minePage : scope === "all" ? allPage : tournamentPage;
  const mineTotal = mineData.total;
  const shownAllTotal = allData?.total ?? allTotal;
  const shownTournamentTotal = tournamentData?.total ?? tournamentTotal;

  return (
    <div>
      <div className="matches-scope mb-3" role="tablist" aria-label="Maç kapsamı">
        <button
          type="button"
          role="tab"
          aria-selected={scope === "mine"}
          className={`matches-scope__tab ${scope === "mine" ? "is-active" : ""}`}
          onClick={() => selectScope("mine")}
        >
          Benim Maçlarım
          <span className="matches-scope__count">({mineTotal})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={scope === "all"}
          className={`matches-scope__tab ${scope === "all" ? "is-active" : ""}`}
          onClick={() => selectScope("all")}
        >
          Tüm Maçlar
          <span className="matches-scope__count">({shownAllTotal})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={scope === "tournament"}
          className={`matches-scope__tab ${scope === "tournament" ? "is-active" : ""}`}
          onClick={() => selectScope("tournament")}
        >
          Turnuva Maçları
          <span className="matches-scope__count">({shownTournamentTotal})</span>
        </button>
      </div>

      {scope === "tournament" ? (
        <div
          className="matches-tournament-chips mb-4"
          role="group"
          aria-label="Turnuva filtresi"
        >
          <button
            type="button"
            className={`matches-tournament-chips__chip ${tournamentFilter === null ? "is-active" : ""}`}
            onClick={() => selectTournamentFilter(null)}
          >
            Tüm Turnuvalar
          </button>
          {tournaments.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`matches-tournament-chips__chip ${tournamentFilter === t.id ? "is-active" : ""}`}
              onClick={() => selectTournamentFilter(t.id)}
              title={t.name}
            >
              🏆 {t.name}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="form-error mb-3 rounded-md border border-red/20 bg-red/10 px-3 py-2" role="alert">
          {error}
        </p>
      ) : null}

      <div
        className={isPending ? "opacity-60 transition-opacity" : "transition-opacity"}
        aria-busy={isPending}
      >
        {active.matches.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-icon">🏓</div>
            <div className="empty-title">
              {scope === "mine"
                ? "Bu filtrede maçın yok"
                : scope === "tournament"
                  ? "Bu turnuva filtresinde maç yok"
                  : "Bu filtrede maç yok"}
            </div>
            <p className="empty-desc">
              {scope === "tournament"
                ? "Başka bir turnuva seç veya zaman/durum filtresini değiştir."
                : "Zaman veya durum filtresini değiştir, ya da yeni maç ekle."}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/matches" className="btn btn-secondary">
                Filtreleri temizle
              </Link>
              {scope === "tournament" ? (
                <Link href="/tournaments" className="btn btn-primary">
                  Turnuvalar
                </Link>
              ) : (
                <>
                  <Link href="/matches/new?type=challenge" className="btn btn-secondary">
                    Meydan Oku
                  </Link>
                  <Link href="/matches/new" className="btn btn-primary">
                    Maç Ekle
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {active.matches.map((match) => {
              const cardMatch = toCardMatch(match);
              const resolved = resolveMatchStatus(
                cardMatch.status as MatchStatusValue,
                cardMatch.scheduledAt,
              );
              return (
                <MatchListCard
                  key={match.id}
                  match={cardMatch}
                  resolvedStatus={resolved}
                  currentUserId={currentUserId}
                />
              );
            })}
          </div>
        )}

        {active.totalPages > 1 ? (
          <div className="mt-6 flex justify-center gap-2">
            {activePage > 1 ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => goToPage(activePage - 1)}
                disabled={isPending}
              >
                Önceki
              </button>
            ) : null}
            <span className="text-text-muted self-center text-sm">
              {activePage} / {active.totalPages}
            </span>
            {activePage < active.totalPages ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => goToPage(activePage + 1)}
                disabled={isPending}
              >
                Sonraki
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
