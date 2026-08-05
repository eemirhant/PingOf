"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { DarkSelect } from "@/components/ui/dark-select";
import {
  defaultScheduledLocal,
  EasyDateTimePicker,
} from "@/components/ui/easy-datetime-picker";
import { UserAvatar } from "@/components/ui/user-avatar";
import { createPlannedMatchAction, type MatchActionState } from "@/lib/actions/matches";
import type { OrgPlayerOption } from "@/lib/matches/service";

const initialState: MatchActionState = {};

type Format = "SINGLES" | "DOUBLES";

type PlannedMatchFormProps = {
  currentUserId: string;
  currentUserName: string;
  currentUserAvatarUrl?: string | null;
  players: OrgPlayerOption[];
};

export function PlannedMatchForm({
  currentUserId,
  currentUserName,
  currentUserAvatarUrl,
  players,
}: PlannedMatchFormProps) {
  const [state, formAction, isPending] = useActionState(
    createPlannedMatchAction,
    initialState,
  );
  const [format, setFormat] = useState<Format>("SINGLES");
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledLocal);
  const [team1Player1Id, setTeam1Player1Id] = useState(currentUserId);
  const [team1PartnerId, setTeam1PartnerId] = useState("");
  const [team2Player1Id, setTeam2Player1Id] = useState("");
  const [team2Player2Id, setTeam2Player2Id] = useState("");
  const [stakeNote, setStakeNote] = useState("");
  const [team1Name, setTeam1Name] = useState("");
  const [team2Name, setTeam2Name] = useState("");

  const team1PlayerIds = useMemo(() => {
    if (format === "SINGLES") {
      return team1Player1Id ? [team1Player1Id] : [];
    }
    return [team1Player1Id, team1PartnerId].filter(Boolean);
  }, [format, team1Player1Id, team1PartnerId]);

  const team2PlayerIds = useMemo(() => {
    if (format === "SINGLES") {
      return team2Player1Id ? [team2Player1Id] : [];
    }
    return [team2Player1Id, team2Player2Id].filter(Boolean);
  }, [format, team2Player1Id, team2Player2Id]);

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

  function onFormatChange(next: Format) {
    setFormat(next);
    setTeam1PartnerId("");
    setTeam2Player2Id("");
    if (next === "SINGLES") {
      setTeam1Name("");
      setTeam2Name("");
    }
  }

  const scheduledIso = scheduledAt ? new Date(scheduledAt).toISOString() : "";

  return (
    <form action={formAction} className="mx-auto max-w-[680px] space-y-4">
      <input type="hidden" name="format" value={format} />
      <input type="hidden" name="scheduledAt" value={scheduledIso} />
      <input
        type="hidden"
        name="team1PlayerIds"
        value={JSON.stringify(team1PlayerIds)}
      />
      <input
        type="hidden"
        name="team2PlayerIds"
        value={JSON.stringify(team2PlayerIds)}
      />
      <input type="hidden" name="stakeNote" value={stakeNote} />
      <input type="hidden" name="team1Name" value={format === "DOUBLES" ? team1Name : ""} />
      <input type="hidden" name="team2Name" value={format === "DOUBLES" ? team2Name : ""} />

      <div className="form-section">
        <div className="form-section-title">Tarih ve Saat</div>
        <EasyDateTimePicker
          value={scheduledAt}
          onChange={setScheduledAt}
          required
        />
        <p className="text-text-muted mt-2 text-xs">Geçmiş bir tarih seçilemez.</p>
      </div>

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
        <div className="form-section-title">
          Katılımcılar (opsiyonel — açık bırakılabilir)
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_40px_1fr] sm:items-start">
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-accent-light">
              Takım 1
            </div>
            <div className="flex flex-col gap-1.5">
              <DarkSelect
                aria-label="Takım 1 oyuncu"
                value={team1Player1Id}
                onChange={setTeam1Player1Id}
                emptyLabel="+ Açık slot"
                options={optionsForSlot(team1Player1Id, [
                  team1PartnerId,
                  team2Player1Id,
                  team2Player2Id,
                ])}
              />
              {format === "DOUBLES" ? (
                <DarkSelect
                  aria-label="Takım 1 partner"
                  value={team1PartnerId}
                  onChange={setTeam1PartnerId}
                  emptyLabel="+ Açık slot"
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
                emptyLabel="+ Açık slot"
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
                  emptyLabel="+ Açık slot"
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

        {team1Player1Id === currentUserId ? (
          <p className="text-text-muted mt-2 flex items-center gap-2 text-xs">
            <UserAvatar
              userId={currentUserId}
              fullName={currentUserName}
              avatarUrl={currentUserAvatarUrl}
              size="xs"
            />
            Varsayılan olarak Takım 1’desin; istediğin slotu açık bırakabilirsin.
          </p>
        ) : null}

        {format === "DOUBLES" ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="planned-team1Name" className="form-label">
                Takım 1 Adı{" "}
                <span className="text-text-muted font-normal">(opsiyonel)</span>
              </label>
              <input
                id="planned-team1Name"
                className="form-input"
                value={team1Name}
                onChange={(e) => setTeam1Name(e.target.value)}
                maxLength={50}
                placeholder="Örn. Kırmızı Şimşekler"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div>
              <label htmlFor="planned-team2Name" className="form-label">
                Takım 2 Adı{" "}
                <span className="text-text-muted font-normal">(opsiyonel)</span>
              </label>
              <input
                id="planned-team2Name"
                className="form-input"
                value={team2Name}
                onChange={(e) => setTeam2Name(e.target.value)}
                maxLength={50}
                placeholder="Örn. Mavi Kaplanlar"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>
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
        <p
          className="form-error rounded-md border border-red/20 bg-red/10 px-3 py-2"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-2.5 pt-2">
        <Link href="/matches" className="btn btn-secondary w-[120px]">
          İptal
        </Link>
        <Button
          type="submit"
          variant="primary"
          className="flex-1"
          size="lg"
          disabled={isPending || !scheduledAt}
        >
          {isPending ? "Planlanıyor…" : "Maçı Planla"}
        </Button>
      </div>
    </form>
  );
}
