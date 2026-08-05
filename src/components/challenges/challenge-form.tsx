"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { EasyDateTimePicker } from "@/components/ui/easy-datetime-picker";
import {
  createChallengeAction,
  type ChallengeActionState,
} from "@/lib/actions/challenges";

const initialState: ChallengeActionState = {};

type ChallengeFormProps = {
  toUserId: string;
  toUserName: string;
  cancelHref?: string;
  hideIntro?: boolean;
};

export function ChallengeForm({
  toUserId,
  toUserName,
  cancelHref,
  hideIntro = false,
}: ChallengeFormProps) {
  const [state, formAction, isPending] = useActionState(createChallengeAction, initialState);
  const [proposedAt, setProposedAt] = useState("");
  const [note, setNote] = useState("");

  const proposedIso = proposedAt ? new Date(proposedAt).toISOString() : "";
  const backHref = cancelHref ?? `/players/${toUserId}`;

  return (
    <form action={formAction} className="mx-auto max-w-[480px] space-y-4">
      <input type="hidden" name="toUserId" value={toUserId} />
      <input type="hidden" name="proposedAt" value={proposedIso} />

      {!hideIntro ? (
        <div className="card">
          <p className="text-text-secondary text-sm">
            <span className="font-semibold text-text-primary">{toUserName}</span> oyuncusuna 1v1
            meydan okuma gönderiyorsun.
          </p>
        </div>
      ) : null}

      <div className="form-section">
        <div className="form-section-title">Önerilen tarih/saat (opsiyonel)</div>
        <EasyDateTimePicker
          value={proposedAt}
          onChange={setProposedAt}
          allowEmpty
          emptyHint="Tarih/saat belirtmezsen maç saatsiz planlanır; sonra eklenebilir."
        />
      </div>

      <div className="form-section">
        <div className="form-section-title">Not (opsiyonel)</div>
        <textarea
          name="note"
          className="form-input min-h-[88px]"
          maxLength={200}
          placeholder="Örn. Öğle arasında kısa bir maç?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {state.error ? (
        <p className="form-error rounded-md border border-red/20 bg-red/10 px-3 py-2" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-2.5">
        <Link href={backHref} className="btn btn-secondary w-[120px]">
          İptal
        </Link>
        <Button type="submit" variant="primary" className="flex-1" disabled={isPending}>
          {isPending ? "Gönderiliyor…" : "Meydan Oku"}
        </Button>
      </div>
    </form>
  );
}
