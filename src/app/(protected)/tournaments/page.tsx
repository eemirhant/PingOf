import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  tournamentStatusLabel,
  tournamentTypeLabel,
  type TournamentStatusValue,
  type TournamentTypeValue,
} from "@/domain/tournament";
import { listTournaments } from "@/lib/tournaments/service";

function statusClass(status: TournamentStatusValue): string {
  switch (status) {
    case "IN_PROGRESS":
      return "badge-1v1";
    case "COMPLETED":
      return "badge-win";
    case "DRAFT":
      return "badge-planned";
    default:
      return "";
  }
}

export default async function TournamentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tournaments = await listTournaments(session.user.organizationId);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Turnuvalar</h1>
          <p className="text-text-secondary mt-1 text-sm">
            Tek eleme ve lig formatında turnuvalar
          </p>
        </div>
        <Link href="/tournaments/new" className="btn btn-primary btn-sm">
          Turnuva Oluştur
        </Link>
      </div>

      {tournaments.length === 0 ? (
        <div className="card empty-state mt-6">
          <div className="empty-title">Henüz turnuva yok</div>
          <p className="empty-desc">
            Organizasyonunda ilk turnuvayı oluşturarak eşleşmeleri başlat.
          </p>
          <Link href="/tournaments/new" className="btn btn-primary">
            Turnuva Oluştur
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {tournaments.map((t) => {
            const status = t.status as TournamentStatusValue;
            return (
              <li key={t.id}>
                <Link
                  href={`/tournaments/${t.id}`}
                  className="card block transition hover:border-accent/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-base font-bold text-text-primary">
                        {t.name}
                      </h2>
                      <p className="text-text-secondary mt-1 text-sm">
                        {tournamentTypeLabel(t.type as TournamentTypeValue)} ·{" "}
                        {t.format === "SINGLES" ? "1v1" : "2v2"} ·{" "}
                        {t._count.participants} katılımcı
                      </p>
                      <p className="text-text-muted mt-1 text-xs">
                        {new Intl.DateTimeFormat("tr-TR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(t.startsAt)}{" "}
                        · {t.createdBy.fullName}
                      </p>
                    </div>
                    <span className={`badge ${statusClass(status)}`}>
                      {tournamentStatusLabel(status)}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
