import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ChallengeDeepLinkFocus } from "@/components/challenges/challenge-deep-link-focus";
import { ChallengesBoard } from "@/components/challenges/challenges-board";
import type { ChallengeCardData } from "@/components/challenges/challenge-list-card";
import {
  listIncomingChallenges,
  listOutgoingChallenges,
} from "@/lib/challenges/service";
import { getUserProfile } from "@/lib/profile/update-profile";

function toCard(c: {
  id: string;
  status: string;
  createdAt: Date;
  proposedAt: Date | null;
  note: string | null;
  fromUserId: string;
  toUserId: string;
  fromUser: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    avatarColor: string | null;
  };
  toUser: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    avatarColor: string | null;
  };
}): ChallengeCardData {
  return {
    id: c.id,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
    proposedAt: c.proposedAt?.toISOString() ?? null,
    note: c.note,
    fromUserId: c.fromUserId,
    toUserId: c.toUserId,
    fromUser: c.fromUser,
    toUser: c.toUser,
  };
}

export default async function ChallengesPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    id?: string;
    challengeId?: string;
    highlight?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const focusChallengeId =
    (params.highlight ?? params.challengeId ?? params.id ?? "").trim() || null;

  const [incoming, outgoing, me] = await Promise.all([
    listIncomingChallenges(session.user.organizationId, session.user.id),
    listOutgoingChallenges(session.user.organizationId, session.user.id),
    getUserProfile(session.user.id, session.user.organizationId),
  ]);

  if (!me) redirect("/login");

  let tab: "incoming" | "outgoing" =
    params.tab === "outgoing" ? "outgoing" : "incoming";
  if (focusChallengeId) {
    if (outgoing.some((c) => c.id === focusChallengeId)) {
      tab = "outgoing";
    } else if (incoming.some((c) => c.id === focusChallengeId)) {
      tab = "incoming";
    }
  }

  const list = (tab === "outgoing" ? outgoing : incoming).map(toCard);
  const selfUser = {
    id: me.id,
    fullName: me.fullName,
    avatarUrl: me.avatarUrl,
    avatarColor: me.avatarColor,
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <ChallengeDeepLinkFocus challengeId={focusChallengeId} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/players" className="text-text-muted hover:text-text-secondary text-sm">
            ← Oyuncular
          </Link>
          <h1 className="mt-2 text-xl font-bold text-text-primary">Teklifler</h1>
          <p className="text-text-secondary mt-1 text-sm">1v1 meydan okumalar</p>
        </div>
        <Link href="/matches/new?type=challenge" className="btn btn-primary btn-sm">
          Meydan Oku
        </Link>
      </div>

      <div className="toggle-group mt-4">
        <Link
          href="/challenges"
          className={`toggle-btn ${tab === "incoming" ? "active" : ""}`}
        >
          Gelen ({incoming.length})
        </Link>
        <Link
          href="/challenges?tab=outgoing"
          className={`toggle-btn ${tab === "outgoing" ? "active" : ""}`}
        >
          Giden
        </Link>
      </div>

      <ChallengesBoard
        tab={tab}
        challenges={list}
        currentUserId={session.user.id}
        selfUser={selfUser}
        focusChallengeId={focusChallengeId}
      />
    </div>
  );
}
