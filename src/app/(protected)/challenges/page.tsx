import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ChallengeDuelAnimation } from "@/components/challenges/challenge-duel-animation";
import { ChallengeRespondButtons } from "@/components/challenges/challenge-respond-buttons";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  challengeStatusLabel,
  resolveChallengeStatus,
  type ChallengeStatusValue,
} from "@/domain/challenge";
import {
  listIncomingChallenges,
  listOutgoingChallenges,
} from "@/lib/challenges/service";
import { getUserProfile } from "@/lib/profile/update-profile";

export default async function ChallengesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const tab = params.tab === "outgoing" ? "outgoing" : "incoming";

  const [incoming, outgoing, me] = await Promise.all([
    listIncomingChallenges(session.user.organizationId, session.user.id),
    listOutgoingChallenges(session.user.organizationId, session.user.id),
    getUserProfile(session.user.id, session.user.organizationId),
  ]);

  if (!me) redirect("/login");

  const list = tab === "outgoing" ? outgoing : incoming;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
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

      {list.length === 0 ? (
        <div className="card empty-state mt-6">
          <div className="empty-title">
            {tab === "incoming" ? "Gelen teklif yok" : "Gönderilmiş teklif yok"}
          </div>
          <p className="empty-desc">
            {tab === "incoming"
              ? "Birisi sana meydan okuduğunda burada görünür."
              : "Maç Ekle → Meydan Oku ile 1v1 teklif gönderebilirsin."}
          </p>
          <Link href="/matches/new?type=challenge" className="btn btn-primary">
            Meydan Oku
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {list.map((challenge) => {
            const status = resolveChallengeStatus(
              challenge.status as ChallengeStatusValue,
              challenge.createdAt,
            );
            const isPending = status === "PENDING";
            const selfSide = {
              id: me.id,
              fullName: me.fullName,
              avatarUrl: me.avatarUrl,
            };
            const other =
              tab === "incoming" ? challenge.fromUser : challenge.toUser;
            const challenger =
              tab === "incoming"
                ? {
                    id: challenge.fromUser.id,
                    fullName: challenge.fromUser.fullName,
                    avatarUrl: challenge.fromUser.avatarUrl,
                  }
                : selfSide;
            const opponent =
              tab === "incoming"
                ? selfSide
                : {
                    id: challenge.toUser.id,
                    fullName: challenge.toUser.fullName,
                    avatarUrl: challenge.toUser.avatarUrl,
                  };

            return (
              <li key={challenge.id} className="space-y-3">
                {isPending ? (
                  <ChallengeDuelAnimation
                    challenger={challenger}
                    opponent={opponent}
                    mode="ready"
                  />
                ) : null}
                <div className="card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap gap-2">
                        <span
                          className={`badge ${status === "PENDING" ? "badge-planned" : status === "ACCEPTED" ? "badge-win" : ""}`}
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
                          }).format(challenge.proposedAt)}
                        </p>
                      ) : null}
                      {challenge.note ? (
                        <p className="text-text-muted mt-1 text-sm italic">
                          “{challenge.note}”
                        </p>
                      ) : null}
                      <p className="text-text-muted mt-2 text-xs">
                        {new Intl.DateTimeFormat("tr-TR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(challenge.createdAt)}
                      </p>
                    </div>
                    {tab === "incoming" && isPending ? (
                      <ChallengeRespondButtons challengeId={challenge.id} />
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
