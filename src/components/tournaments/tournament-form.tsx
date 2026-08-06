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
import {
  createTournamentAction,
  type TournamentActionState,
} from "@/lib/actions/tournaments";
import type { OrgPlayerOption } from "@/lib/matches/service";

const initialState: TournamentActionState = {};

type Format = "SINGLES" | "DOUBLES";
type TournamentType = "KNOCKOUT" | "ROUND_ROBIN";

type TournamentFormProps = {
  players: OrgPlayerOption[];
};

export function TournamentForm({ players }: TournamentFormProps) {
  const [state, formAction, isPending] = useActionState(
    createTournamentAction,
    initialState,
  );
  const [name, setName] = useState("");
  const [type, setType] = useState<TournamentType>("KNOCKOUT");
  const [format, setFormat] = useState<Format>("SINGLES");
  const [startsAt, setStartsAt] = useState(defaultScheduledLocal);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pairs, setPairs] = useState<Array<[string, string]>>([
    ["", ""],
    ["", ""],
  ]);

  const startsIso = startsAt ? new Date(startsAt).toISOString() : "";

  const pairsJson = useMemo(
    () =>
      JSON.stringify(
        pairs.filter(([a, b]) => a && b && a !== b) as [string, string][],
      ),
    [pairs],
  );

  function togglePlayer(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function updatePair(index: number, slot: 0 | 1, userId: string) {
    setPairs((prev) =>
      prev.map((pair, i) => {
        if (i !== index) return pair;
        const next: [string, string] = [...pair];
        next[slot] = userId;
        return next;
      }),
    );
  }

  function pairOptions(index: number, slot: 0 | 1, current: string) {
    const taken = new Set(
      pairs.flatMap((p, i) =>
        i === index
          ? p.filter((_, s) => s !== slot && _)
          : p.filter(Boolean),
      ),
    );
    return players.filter((p) => !taken.has(p.id) || p.id === current);
  }

  return (
    <form action={formAction} className="mx-auto max-w-[720px] space-y-4">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="format" value={format} />
      <input type="hidden" name="startsAt" value={startsIso} />
      <input type="hidden" name="pairsJson" value={pairsJson} />
      {format === "SINGLES"
        ? selectedIds.map((id) => (
            <input key={id} type="hidden" name="participantIds" value={id} />
          ))
        : null}

      <div className="form-section">
        <div className="form-section-title">Temel bilgiler</div>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-text-secondary">
            Turnuva adı
          </span>
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-input"
            placeholder="Örn. Ofis Kupası"
            required
            maxLength={80}
          />
        </label>

        <div className="mt-4">
          <div className="mb-2 text-sm font-medium text-text-secondary">Tip</div>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-btn ${type === "KNOCKOUT" ? "active" : ""}`}
              onClick={() => setType("KNOCKOUT")}
            >
              Tek eleme
            </button>
            <button
              type="button"
              className={`toggle-btn ${type === "ROUND_ROBIN" ? "active" : ""}`}
              onClick={() => setType("ROUND_ROBIN")}
            >
              Lig
            </button>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-sm font-medium text-text-secondary">
            Format
          </div>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-btn ${format === "SINGLES" ? "active" : ""}`}
              onClick={() => {
                setFormat("SINGLES");
                setPairs([
                  ["", ""],
                  ["", ""],
                ]);
              }}
            >
              1v1
            </button>
            <button
              type="button"
              className={`toggle-btn ${format === "DOUBLES" ? "active" : ""}`}
              onClick={() => {
                setFormat("DOUBLES");
                setSelectedIds([]);
              }}
            >
              2v2
            </button>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-sm font-medium text-text-secondary">
            Başlangıç
          </div>
          <EasyDateTimePicker
            value={startsAt}
            onChange={setStartsAt}
            required
          />
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">
          {format === "SINGLES" ? "Katılımcılar" : "Çiftler"}
        </div>
        <p className="text-text-muted mb-3 text-sm">
          {format === "SINGLES"
            ? "En az 2 oyuncu seç. Tek elemede sayı 2’nin katı değilse BAY atanır."
            : "En az 2 çift ekle. Her çift turnuva boyunca sabit kalır."}
        </p>

        {format === "SINGLES" ? (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {players.map((player) => {
              const checked = selectedIds.includes(player.id);
              return (
                <li key={player.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-white/10 px-3 py-2 hover:bg-white/5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePlayer(player.id)}
                      className="size-4"
                    />
                    <UserAvatar
                      userId={player.id}
                      fullName={player.fullName}
                      avatarUrl={player.avatarUrl}
                      avatarColor={player.avatarColor}
                      size="sm"
                    />
                    <span className="text-sm font-medium text-text-primary">
                      {player.fullName}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="space-y-3">
            {pairs.map((pair, index) => (
              <div
                key={index}
                className="rounded-md border border-white/10 p-3"
              >
                <div className="text-text-muted mb-2 text-xs font-bold uppercase">
                  Çift {index + 1}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <DarkSelect
                    aria-label={`Çift ${index + 1} oyuncu 1`}
                    value={pair[0]}
                    onChange={(v) => updatePair(index, 0, v)}
                    emptyLabel="Oyuncu 1"
                    options={pairOptions(index, 0, pair[0]).map((p) => ({
                      value: p.id,
                      label: p.fullName,
                      avatarUrl: p.avatarUrl,
                      avatarColor: p.avatarColor,
                    }))}
                  />
                  <DarkSelect
                    aria-label={`Çift ${index + 1} oyuncu 2`}
                    value={pair[1]}
                    onChange={(v) => updatePair(index, 1, v)}
                    emptyLabel="Oyuncu 2"
                    options={pairOptions(index, 1, pair[1]).map((p) => ({
                      value: p.id,
                      label: p.fullName,
                      avatarUrl: p.avatarUrl,
                      avatarColor: p.avatarColor,
                    }))}
                  />
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPairs((prev) => [...prev, ["", ""]])}
            >
              Çift ekle
            </Button>
          </div>
        )}
      </div>

      {state.error ? (
        <p className="text-sm font-medium text-rose-400" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Oluşturuluyor…" : "Turnuva oluştur"}
        </Button>
        <Link href="/tournaments" className="btn btn-secondary">
          İptal
        </Link>
      </div>
    </form>
  );
}
