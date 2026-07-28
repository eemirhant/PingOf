import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { TournamentForm } from "@/components/tournaments/tournament-form";
import { getOrganizationPlayers } from "@/lib/matches/service";

export default async function NewTournamentPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const players = await getOrganizationPlayers(session.user.organizationId);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link
        href="/tournaments"
        className="text-text-muted hover:text-text-secondary text-sm"
      >
        ← Turnuvalar
      </Link>
      <h1 className="mt-2 text-xl font-bold text-text-primary">
        Turnuva Oluştur
      </h1>
      <p className="text-text-secondary mt-1 mb-6 text-sm">
        Tip, format ve katılımcıları seç. Başlattıktan sonra eşleşmeler otomatik
        oluşur.
      </p>
      <TournamentForm players={players} />
    </div>
  );
}
