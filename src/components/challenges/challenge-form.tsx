"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

type SubmitPhase = "idle" | "sending" | "sent";

export function ChallengeForm({
  toUserId,
  toUserName,
  cancelHref,
  hideIntro = false,
}: ChallengeFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    createChallengeAction,
    initialState,
  );
  const [proposedAt, setProposedAt] = useState("");
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<SubmitPhase>("idle");

  const proposedIso = proposedAt ? new Date(proposedAt).toISOString() : "";
  const backHref = cancelHref ?? `/players/${toUserId}`;
  const locked = phase === "sending" || phase === "sent" || isPending;

  useEffect(() => {
    if (state.error) {
      setPhase("idle");
    }
  }, [state.error]);

  useEffect(() => {
    if (!state.success) return;
    setPhase("sent");
    const timer = window.setTimeout(() => {
      router.push("/challenges?tab=outgoing");
      router.refresh();
    }, 450);
    return () => window.clearTimeout(timer);
  }, [state.success, router]);

  return (
    <form
      action={(fd) => {
        setPhase("sending");
        formAction(fd);
      }}
      className={`mx-auto max-w-[480px] space-y-4 live-card card-static ${phase === "sent" ? "live-card--sent" : ""}`}
    >
      <input type="hidden" name="toUserId" value={toUserId} />
      <input type="hidden" name="proposedAt" value={proposedIso} />

      {!hideIntro ? (
        <div className="card">
          <p className="text-text-secondary text-sm">
            <span className="font-semibold text-text-primary">{toUserName}</span>{" "}
            oyuncusuna 1v1 meydan okuma gönderiyorsun.
          </p>
        </div>
      ) : null}

      {phase === "sent" ? (
        <div className="card border border-emerald-500/30 live-card--pulse" role="status">
          <p className="text-sm font-semibold text-emerald-400">Gönderildi</p>
          <p className="text-text-secondary mt-1 text-xs">
            Teklifler sayfasına yönlendiriliyorsun…
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
          disabled={locked}
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

      <div className="flex gap-2.5">
        <Link
          href={backHref}
          className={`btn btn-secondary w-[120px] ${locked ? "pointer-events-none opacity-50" : ""}`}
          aria-disabled={locked}
        >
          İptal
        </Link>
        <Button
          type="submit"
          variant="primary"
          className="flex-1"
          disabled={locked}
        >
          {phase === "sent"
            ? "Gönderildi"
            : phase === "sending" || isPending
              ? "Gönderiliyor…"
              : "Meydan Oku"}
        </Button>
      </div>
    </form>
  );
}
