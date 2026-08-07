"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useState } from "react";

import { ChallengeCancelButton } from "@/components/challenges/challenge-cancel-button";
import { ChallengeDuelAnimation } from "@/components/challenges/challenge-duel-animation";
import { ChallengeRespondButtons } from "@/components/challenges/challenge-respond-buttons";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  canCancelChallenge,
  challengeStatusLabel,
  resolveChallengeStatus,
  type ChallengeStatusValue,
} from "@/domain/challenge";

export type ChallengeCardUser = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  avatarColor: string | null;
};

export type ChallengeCardData = {
  id: string;
  status: string;
  createdAt: string;
  proposedAt: string | null;
  note: string | null;
  fromUserId: string;
  toUserId: string;
  fromUser: ChallengeCardUser;
  toUser: ChallengeCardUser;
};

type ChallengeListCardProps = {
  challenge: ChallengeCardData;
  tab: "incoming" | "outgoing";
  currentUserId: string;
  selfUser: ChallengeCardUser;
  focused: boolean;
};

function ChallengeListCardInner({
  challenge,
  tab,
  currentUserId,
  selfUser,
  focused,
}: ChallengeListCardProps) {
  const resolved = resolveChallengeStatus(
    challenge.status as ChallengeStatusValue,
    new Date(challenge.createdAt),
  );
  const [localStatus, setLocalStatus] = useState<ChallengeStatusValue | null>(
    null,
  );
  const [exiting, setExiting] = useState(false);
  const [statusFlash, setStatusFlash] = useState(false);

  const status = localStatus ?? resolved;
  const isPending = status === "PENDING";
  const other = tab === "incoming" ? challenge.fromUser : challenge.toUser;
  const challenger = tab === "incoming" ? challenge.fromUser : selfUser;
  const opponent = tab === "incoming" ? selfUser : challenge.toUser;

  const showCancel =
    tab === "outgoing" &&
    canCancelChallenge(
      status,
      new Date(challenge.createdAt),
      currentUserId,
      challenge.fromUserId,
    );

  const flashStatus = useCallback((next: ChallengeStatusValue) => {
    setLocalStatus(next);
    setStatusFlash(true);
    window.setTimeout(() => setStatusFlash(false), 220);
  }, []);

  useEffect(() => {
    setLocalStatus(null);
  }, [challenge.status, challenge.id]);

  if (exiting) {
    return (
      <li
        id={`challenge-${challenge.id}`}
        className="live-card live-card--exit"
        aria-hidden
      />
    );
  }

  return (
    <li
      id={`challenge-${challenge.id}`}
      className={`space-y-3 rounded-xl transition live-card ${
        focused ? "challenge-deep-link-focus" : ""
      } ${statusFlash ? "live-card--status" : ""} ${
        status === "ACCEPTED" ? "live-card--accepted" : ""
      } ${status === "DECLINED" ? "live-card--declined" : ""}`}
    >
      {isPending ? (
        <ChallengeDuelAnimation
          challenger={challenger}
          opponent={opponent}
          mode="ready"
        />
      ) : null}
      <div
        className={`card ${
          status === "ACCEPTED"
            ? "border border-emerald-500/35"
            : status === "DECLINED"
              ? "border border-white/10 opacity-90"
              : ""
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap gap-2">
              <span
                className={`badge ${
                  status === "PENDING"
                    ? "badge-planned"
                    : status === "ACCEPTED"
                      ? "badge-win"
                      : status === "DECLINED" || status === "CANCELLED"
                        ? "badge-loss"
                        : "badge-planned"
                }`}
              >
                {challengeStatusLabel(status)}
              </span>
              <span className="badge badge-1v1">1v1</span>
            </div>
            <Link
              href={`/players/${other.id}`}
              className="flex items-center gap-2 font-semibold hover:text-accent-light"
            >
              <UserAvatar
                userId={other.id}
                fullName={other.fullName}
                avatarUrl={other.avatarUrl}
                avatarColor={other.avatarColor}
                size="sm"
              />
              {other.fullName}
            </Link>
            {challenge.proposedAt ? (
              <p className="text-text-secondary mt-2 text-sm">
                Önerilen:{" "}
                {new Intl.DateTimeFormat("tr-TR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(challenge.proposedAt))}
              </p>
            ) : (
              <p className="text-text-muted mt-2 text-sm">Saat belirtilmedi</p>
            )}
            {challenge.note ? (
              <p className="text-text-muted mt-1 text-sm italic">
                “{challenge.note}”
              </p>
            ) : null}
            <p className="text-text-muted mt-2 text-xs">
              {new Intl.DateTimeFormat("tr-TR", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(challenge.createdAt))}
            </p>

            {status === "ACCEPTED" ? (
              <Link
                href="/matches"
                className="btn btn-primary btn-sm mt-3 inline-flex"
              >
                Maça git
              </Link>
            ) : null}

            {status === "DECLINED" && tab === "outgoing" ? (
              <Link
                href={`/players/${challenge.toUserId}/challenge`}
                className="btn btn-secondary btn-sm mt-3 inline-flex"
              >
                Yeniden gönder
              </Link>
            ) : null}
          </div>

          {tab === "incoming" && isPending ? (
            <ChallengeRespondButtons
              challengeId={challenge.id}
              onOutcome={(outcome) => {
                if (outcome === "accepted") {
                  flashStatus("ACCEPTED");
                } else if (outcome === "declined") {
                  flashStatus("DECLINED");
                  window.setTimeout(() => setExiting(true), 280);
                }
              }}
            />
          ) : null}

          {showCancel ? (
            <ChallengeCancelButton
              challengeId={challenge.id}
              onCancelled={() => {
                flashStatus("CANCELLED");
                window.setTimeout(() => setExiting(true), 220);
              }}
            />
          ) : null}
        </div>
      </div>
    </li>
  );
}

export const ChallengeListCard = memo(ChallengeListCardInner);
