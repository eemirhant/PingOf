import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { ChallengeDuelAnimation } from "@/components/challenges/challenge-duel-animation";
import { ChallengeForm } from "@/components/challenges/challenge-form";
import { getOrgPlayerForChallenge } from "@/lib/challenges/service";
import { getUserProfile } from "@/lib/profile/update-profile";

export default async function ChallengePlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  if (id === session.user.id) {
    redirect(`/players/${id}`);
  }

  const [player, me] = await Promise.all([
    getOrgPlayerForChallenge(session.user.organizationId, id),
    getUserProfile(session.user.id, session.user.organizationId),
  ]);
  if (!player || !me) notFound();

  return (
    <div className="px-6 py-6">
      <div className="mx-auto mb-6 max-w-[480px]">
        <Link
          href={`/players/${player.id}`}
          className="text-text-muted hover:text-text-secondary text-sm"
        >
          ← Profil
        </Link>
        <h1 className="mt-2 text-xl font-bold text-text-primary">Meydan Oku</h1>
        <p className="text-text-secondary mt-1 text-sm">Sadece 1v1 teklif gönderilebilir.</p>
      </div>

      <div className="mx-auto mb-4 max-w-[480px]">
        <ChallengeDuelAnimation
          challenger={{
            id: me.id,
            fullName: me.fullName,
            avatarUrl: me.avatarUrl,
          }}
          opponent={{
            id: player.id,
            fullName: player.fullName,
            avatarUrl: player.avatarUrl,
          }}
          mode="ready"
        />
      </div>

      <ChallengeForm
        toUserId={player.id}
        toUserName={player.fullName}
        cancelHref={`/players/${player.id}`}
        hideIntro
      />
    </div>
  );
}
