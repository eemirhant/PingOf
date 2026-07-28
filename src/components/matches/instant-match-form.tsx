"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { DarkSelect } from "@/components/ui/dark-select";
import {
  canAddAnotherSet,
  determineMatchWinner,
  validateSetScore,
  type SetScoreInput,
} from "@/domain/match-scoring";
import {
  createInstantMatchAction,
  updateInstantMatchAction,
  type MatchActionState,
} from "@/lib/actions/matches";
import type { OrgPlayerOption } from "@/lib/matches/service";
import { UserAvatar } from "@/components/ui/user-avatar";

const initialState: MatchActionState = {};

type Format = "SINGLES" | "DOUBLES";
type SetDraft = { team1Score: string; team2Score: string };

const EMPTY_SET: SetDraft = { team1Score: "", team2Score: "" };

export type InstantMatchInitialValues = {
  format: Format;
  team1PlayerIds: string[];
  team2PlayerIds: string[];
  sets: Array<{ team1Score: number; team2Score: number }>;
  stakeNote?: string | null;
};

type InstantMatchFormProps = {
  currentUserId: string;
  currentUserName: string;
  currentUserAvatarUrl?: string | null;
  players: OrgPlayerOption[];
  mode?: "create" | "edit";
  matchId?: string;
  initialValues?: InstantMatchInitialValues;
};

function toSetInputs(sets: SetDraft[]): SetScoreInput[] {
  return sets
    .filter((set) => set.team1Score !== "" && set.team2Score !== "")
    .map((set) => ({
      team1Score: Number(set.team1Score),
      team2Score: Number(set.team2Score),
    }));
}

function setsToDraft(
  sets: Array<{ team1Score: number; team2Score: number }>,
): SetDraft[] {
  if (sets.length === 0) return [{ ...EMPTY_SET }];
  return sets.map((set) => ({
    team1Score: String(set.team1Score),
    team2Score: String(set.team2Score),
  }));
}

/**
 * Keeps set rows in sync with match progress:
 * - valid completed sets only when match is over
 * - otherwise always one open empty row after the last valid set
 */
function syncSetRows(sets: SetDraft[]): SetDraft[] {
  const validPrefix: SetDraft[] = [];

  for (const set of sets) {
    if (set.team1Score === "" || set.team2Score === "") {
      break;
    }

    const result = validateSetScore(Number(set.team1Score), Number(set.team2Score));
    if (!result.ok) {
      return [...validPrefix, set];
    }

    validPrefix.push(set);
  }

  const progress = determineMatchWinner(toSetInputs(validPrefix));

  if (progress.ok && progress.complete) {
    return validPrefix.length > 0 ? validPrefix : [{ ...EMPTY_SET }];
  }

  if (
    progress.ok &&
    canAddAnotherSet(progress.team1SetsWon, progress.team2SetsWon, validPrefix.length)
  ) {
    const trailing = sets[validPrefix.length];
    if (trailing && (trailing.team1Score !== "" || trailing.team2Score !== "")) {
      return [...validPrefix, trailing];
    }
    return [...validPrefix, { ...EMPTY_SET }];
  }

  return validPrefix.length > 0 ? validPrefix : [{ ...EMPTY_SET }];
}

export function InstantMatchForm({
  currentUserId,
  currentUserName,
  currentUserAvatarUrl,
  players,
  mode = "create",
  matchId,
  initialValues,
}: InstantMatchFormProps) {
  const isEdit = mode === "edit";
  const action = isEdit ? updateInstantMatchAction : createInstantMatchAction;
  const [state, formAction, isPending] = useActionState(action, initialState);

  const [format, setFormat] = useState<Format>(initialValues?.format ?? "SINGLES");

  // Create: current user locked on team 1. Edit: free slot selection.
  const [team1Player1Id, setTeam1Player1Id] = useState(
    initialValues?.team1PlayerIds[0] ?? (isEdit ? "" : currentUserId),
  );
  const [team1PartnerId, setTeam1PartnerId] = useState(
    initialValues?.team1PlayerIds[1] ?? "",
  );
  const [team2Player1Id, setTeam2Player1Id] = useState(
    initialValues?.team2PlayerIds[0] ?? "",
  );
  const [team2Player2Id, setTeam2Player2Id] = useState(
    initialValues?.team2PlayerIds[1] ?? "",
  );
  const [sets, setSets] = useState<SetDraft[]>(() =>
    initialValues ? setsToDraft(initialValues.sets) : [{ ...EMPTY_SET }],
  );
  const [stakeNote, setStakeNote] = useState(initialValues?.stakeNote ?? "");

  const team1PlayerIds =
    format === "SINGLES"
      ? team1Player1Id
        ? [team1Player1Id]
        : []
      : [team1Player1Id, team1PartnerId].filter(Boolean);

  const team2PlayerIds =
    format === "SINGLES"
      ? team2Player1Id
        ? [team2Player1Id]
        : []
      : [team2Player1Id, team2Player2Id].filter(Boolean);

  const progress = useMemo(() => determineMatchWinner(toSetInputs(sets)), [sets]);
  const team1SetsWon = progress.ok ? progress.team1SetsWon : 0;
  const team2SetsWon = progress.ok ? progress.team2SetsWon : 0;

  function optionsForSlot(currentValue: string, otherSelected: string[]) {
    const taken = new Set(otherSelected.filter((id) => id && id !== currentValue));
    return players
      .filter((p) => !taken.has(p.id) || p.id === currentValue)
      .map((p) => ({
        value: p.id,
        label: p.fullName,
        avatarUrl: p.avatarUrl,
        hint: p.id === currentUserId ? "(Sen)" : undefined,
      }));
  }

  function updateSet(index: number, side: "team1Score" | "team2Score", value: string) {
    setSets((prev) => {
      const next = prev.map((set, i) => (i === index ? { ...set, [side]: value } : set));
      return syncSetRows(next);
    });
  }

  function onFormatChange(next: Format) {
    setFormat(next);
    if (!isEdit) {
      setTeam1Player1Id(currentUserId);
      setTeam1PartnerId("");
      setTeam2Player1Id("");
      setTeam2Player2Id("");
      return;
    }
    setTeam1PartnerId("");
    setTeam2Player2Id("");
  }

  const canSubmit =
    progress.ok &&
    progress.complete &&
    (format === "SINGLES"
      ? team1PlayerIds.length === 1 && team2PlayerIds.length === 1
      : team1PlayerIds.length === 2 && team2PlayerIds.length === 2);

  const playerName = (id: string) =>
    id === currentUserId
      ? currentUserName
      : (players.find((p) => p.id === id)?.fullName ?? "Oyuncu");

  const team1Label = team1PlayerIds.map(playerName).join(" / ") || "Takım 1";
  const team2Label = team2PlayerIds.map(playerName).filter(Boolean).join(" / ");

  const cancelHref = isEdit && matchId ? `/matches/${matchId}` : "/matches";

  return (
    <form action={formAction} className="mx-auto max-w-[680px] space-y-4">
      {isEdit && matchId ? <input type="hidden" name="matchId" value={matchId} /> : null}
      <input type="hidden" name="format" value={format} />
      <input type="hidden" name="team1PlayerIds" value={JSON.stringify(team1PlayerIds)} />
      <input type="hidden" name="team2PlayerIds" value={JSON.stringify(team2PlayerIds)} />
      <input type="hidden" name="sets" value={JSON.stringify(toSetInputs(sets))} />
      <input type="hidden" name="stakeNote" value={stakeNote} />

      <div className="form-section">
        <div className="form-section-title">Format</div>
        <div className="toggle-group">
          <button
            type="button"
            className={`toggle-btn ${format === "SINGLES" ? "active" : ""}`}
            onClick={() => onFormatChange("SINGLES")}
          >
            1v1 — Tekler
          </button>
          <button
            type="button"
            className={`toggle-btn ${format === "DOUBLES" ? "active" : ""}`}
            onClick={() => onFormatChange("DOUBLES")}
          >
            2v2 — Çiftler
          </button>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Katılımcılar</div>
        <div className="grid gap-3 sm:grid-cols-[1fr_40px_1fr] sm:items-start">
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-accent-light">
              Takım 1
            </div>
            <div className="flex flex-col gap-1.5">
              {!isEdit ? (
                <div
                  className="flex items-center gap-2 rounded-md border px-3 py-2.5"
                  style={{
                    background: "rgba(99,102,241,0.1)",
                    borderColor: "rgba(99,102,241,0.2)",
                  }}
                >
                  <UserAvatar
                    userId={currentUserId}
                    fullName={currentUserName}
                    avatarUrl={currentUserAvatarUrl}
                    size="sm"
                  />
                  <span className="flex-1 text-sm font-semibold">
                    {currentUserName}{" "}
                    <span className="text-accent-light text-[0.7rem]">(Sen)</span>
                  </span>
                </div>
              ) : (
                <DarkSelect
                  aria-label="Takım 1 oyuncu"
                  value={team1Player1Id}
                  onChange={setTeam1Player1Id}
                  emptyLabel="+ Oyuncu seç"
                  options={optionsForSlot(team1Player1Id, [
                    team1PartnerId,
                    team2Player1Id,
                    team2Player2Id,
                  ])}
                />
              )}

              {format === "DOUBLES" ? (
                <DarkSelect
                  aria-label="Takım 1 partner"
                  value={team1PartnerId}
                  onChange={setTeam1PartnerId}
                  emptyLabel="+ Takım arkadaşı seç"
                  options={optionsForSlot(team1PartnerId, [
                    team1Player1Id,
                    team2Player1Id,
                    team2Player2Id,
                  ])}
                />
              ) : null}
            </div>
          </div>

          <div className="hidden items-center justify-center sm:mt-9 sm:flex">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-extrabold text-text-muted">
              VS
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-orange-light">
              Takım 2
            </div>
            <div className="flex flex-col gap-1.5">
              <DarkSelect
                aria-label="Takım 2 oyuncu"
                value={team2Player1Id}
                onChange={setTeam2Player1Id}
                emptyLabel="+ Oyuncu seç"
                options={optionsForSlot(team2Player1Id, [
                  team1Player1Id,
                  team1PartnerId,
                  team2Player2Id,
                ])}
              />

              {format === "DOUBLES" ? (
                <DarkSelect
                  aria-label="Takım 2 partner"
                  value={team2Player2Id}
                  onChange={setTeam2Player2Id}
                  emptyLabel="+ Oyuncu seç"
                  options={optionsForSlot(team2Player2Id, [
                    team1Player1Id,
                    team1PartnerId,
                    team2Player1Id,
                  ])}
                />
              ) : null}
            </div>
          </div>
        </div>

        {players.length < 2 ? (
          <p className="form-error mt-3">
            Maç girmek için organizasyonda en az 2 oyuncu olmalı. Ayarlardan üye ekle veya davet
            linki paylaş.
          </p>
        ) : null}
      </div>

      <div className="form-section">
        <div className="form-section-title flex flex-wrap items-center justify-between gap-2">
          <span>Set Skorları</span>
          <span className="text-text-muted text-[0.8125rem] font-normal normal-case tracking-normal">
            Her set: 11 sayı, min. 2 fark
          </span>
        </div>

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
                ? `${progress.winnerTeam === 1 ? team1Label : team2Label || "Rakip"} kazandı (${progress.team1SetsWon}-${progress.team2SetsWon})`
                : progress.summary
              : progress.error}
          </div>
        </div>

        {sets.map((set, index) => (
          <SetScoreRow
            key={index}
            setNumber={index + 1}
            team1Score={set.team1Score}
            team2Score={set.team2Score}
            onChange={(side, value) => updateSet(index, side, value)}
            team1Label={playerName(team1PlayerIds[0] ?? "")}
            team2Label={playerName(team2PlayerIds[0] ?? "")}
          />
        ))}

        {progress.ok && !progress.complete ? (
          <p className="text-text-muted mt-2 text-center text-xs">
            Geçerli bir set girildiğinde sonraki set otomatik açılır.
          </p>
        ) : null}
        {progress.ok && progress.complete ? (
          <p className="mt-2 text-center text-xs text-green">
            {isEdit ? "Maç tamamlandı — güncelleyebilirsin." : "Maç tamamlandı — kaydedebilirsin."}
          </p>
        ) : null}
      </div>

      <div className="form-section">
        <div className="form-section-title">İddia (opsiyonel)</div>
        <p className="text-text-muted mb-2 text-xs">
          Örn. “Kaybeden kahve ısmarlar”. Ödeme entegrasyonu yoktur; yalnızca not.
        </p>
        <input
          className="form-input"
          value={stakeNote}
          onChange={(e) => setStakeNote(e.target.value)}
          maxLength={200}
          placeholder="İddia notu…"
          aria-label="İddia notu"
        />
      </div>

      {state.error ? (
        <p className="form-error rounded-md border border-red/20 bg-red/10 px-3 py-2" role="alert">
          {state.error}
        </p>
      ) : null}

      {!canSubmit && players.length >= 2 ? (
        <p
          className="rounded-md border px-3 py-2 text-center text-sm"
          style={{
            background: "rgba(234,179,8,0.08)",
            borderColor: "rgba(234,179,8,0.25)",
            color: "#fde047",
          }}
          role="status"
        >
          {progress.ok && !progress.complete
            ? `Maçı kaydetmek için bir tarafın 3 set kazanması gerekir (şu an ${team1SetsWon}-${team2SetsWon}).`
            : !progress.ok
              ? "Geçersiz set skoru var. Her seti düzelt (11 sayı, min. 2 fark)."
              : format === "SINGLES"
                ? "Her iki takım için bir oyuncu seç."
                : "2v2 için tüm oyuncu slotlarını doldur."}
        </p>
      ) : null}

      <div className="flex gap-2.5 pt-2">
        <Link href={cancelHref} className="btn btn-secondary w-[120px]">
          İptal
        </Link>
        <Button
          type="submit"
          variant="primary"
          className="flex-1"
          size="lg"
          disabled={isPending || !canSubmit || players.length < 2}
        >
          {isPending
            ? isEdit
              ? "Güncelleniyor…"
              : "Kaydediliyor…"
            : isEdit
              ? "Maçı Güncelle"
              : "Maçı Kaydet"}
        </Button>
      </div>
      <p className="text-text-muted text-center text-[0.8125rem]">
        {isEdit
          ? "Güncelleme sonrası istatistikler anında yansır."
          : "Maç kaydedildiğinde istatistiklere anında yansır."}
      </p>
    </form>
  );
}

function SetScoreRow({
  setNumber,
  team1Score,
  team2Score,
  onChange,
  team1Label,
  team2Label,
}: {
  setNumber: number;
  team1Score: string;
  team2Score: string;
  onChange: (side: "team1Score" | "team2Score", value: string) => void;
  team1Label: string;
  team2Label: string;
}) {
  const result =
    team1Score !== "" && team2Score !== ""
      ? validateSetScore(Number(team1Score), Number(team2Score))
      : null;

  const t1 = Number(team1Score);
  const t2 = Number(team2Score);
  const hasData = Boolean(result?.ok);
  const w1 = hasData && t1 > t2;
  const w2 = hasData && t2 > t1;

  return (
    <div className="mb-2 rounded-md border border-border bg-white/[0.03] px-3.5 py-3">
      <div className="text-text-muted mb-2 text-[0.7rem] font-bold uppercase tracking-wider">
        Set {setNumber}
      </div>
      <div className="score-input-row">
        <input
          className="form-input score-input"
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="0"
          value={team1Score}
          onChange={(e) => onChange("team1Score", e.target.value)}
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
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="0"
          value={team2Score}
          onChange={(e) => onChange("team2Score", e.target.value)}
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
      {result && !result.ok ? <p className="form-error text-center">{result.error}</p> : null}
      {hasData ? (
        <p
          className="mt-1 text-center text-xs"
          style={{ color: w1 ? "var(--color-green)" : "var(--color-orange)" }}
        >
          {w1 ? `${team1Label} kazandı ✓` : `${team2Label || "Takım 2"} kazandı ✓`}
        </p>
      ) : null}
    </div>
  );
}
