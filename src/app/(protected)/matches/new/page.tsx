import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { NewMatchClient } from "@/components/matches/new-match-client";
import { getOrganizationPlayers } from "@/lib/matches/service";
import { getUserProfile } from "@/lib/profile/update-profile";

export default async function NewMatchPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; opponent?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const initialType =
    params.type === "planned"
      ? "planned"
      : params.type === "challenge"
        ? "challenge"
        : "instant";

  const [players, me] = await Promise.all([
    getOrganizationPlayers(session.user.organizationId),
    getUserProfile(session.user.id, session.user.organizationId),
  ]);

  if (!me) redirect("/login");

  return (
    <div className="px-6 py-6">
      <div className="mx-auto mb-6 max-w-[680px]">
        <Link href="/matches" className="text-text-muted hover:text-text-secondary text-sm">
          ← Maçlar
        </Link>
        <h1 className="mt-2 text-xl font-bold text-text-primary">Maç Ekle</h1>
        <p className="text-text-secondary mt-1 text-sm">
          Anlık kaydet, planla veya 1v1 meydan oku.
        </p>
      </div>
      <Suspense fallback={<p className="text-text-muted text-center text-sm">Yükleniyor…</p>}>
        <NewMatchClient
          currentUserId={me.id}
          currentUserName={me.fullName}
          currentUserAvatarUrl={me.avatarUrl}
          players={players}
          initialType={initialType}
        />
      </Suspense>
    </div>
  );
}
