import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { UserAvatar } from "@/components/ui/user-avatar";
import { listOrgPlayersForChallenge } from "@/lib/challenges/service";

export default async function PlayersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const players = await listOrgPlayersForChallenge(session.user.organizationId);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link href="/" className="text-text-muted hover:text-text-secondary text-sm">
        ← Ana sayfa
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Oyuncular</h1>
          <p className="text-text-secondary text-sm">
            {players.length} üye · 1v1 meydan okuma gönder
          </p>
        </div>
        <Link href="/challenges" className="btn btn-secondary btn-sm">
          Tekliflerim
        </Link>
      </div>

      {players.length === 0 ? (
        <div className="card empty-state mt-6">
          <div className="empty-title">Henüz oyuncu yok</div>
          <p className="empty-desc">Ayarlardan üye ekle veya davet linki paylaş.</p>
          <Link href="/settings" className="btn btn-primary">
            Ayarlar
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {players.map((player) => {
            const isSelf = player.id === session.user.id;
            return (
              <li key={player.id}>
                <div className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                  <Link
                    href={`/players/${player.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 font-semibold hover:text-accent-light"
                  >
                    <UserAvatar
                      userId={player.id}
                      fullName={player.fullName}
                      avatarUrl={player.avatarUrl}
                      size="sm"
                    />
                    <span className="truncate">
                      {player.fullName}
                      {isSelf ? (
                        <span className="text-accent-light ml-1 text-xs">(Sen)</span>
                      ) : null}
                    </span>
                  </Link>
                  {!isSelf ? (
                    <Link
                      href={`/players/${player.id}/challenge`}
                      className="btn btn-primary btn-sm shrink-0"
                    >
                      Meydan Oku
                    </Link>
                  ) : (
                    <Link href="/challenges" className="btn btn-ghost btn-sm shrink-0">
                      Teklifler
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
