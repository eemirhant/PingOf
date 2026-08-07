import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { MatchesScopeList } from "@/components/matches/matches-scope-list";
import {
  matchTimeFilterLabel,
  type MatchListTimeFilter,
} from "@/domain/match-time-filter";
import { serializeMatchesList } from "@/lib/matches/list-payload";
import {
  listMatchesForOrganization,
  listTournamentsForMatchFilter,
  type MatchListStatusFilter,
} from "@/lib/matches/service";

function parseStatus(value: string | undefined): MatchListStatusFilter {
  if (
    value === "COMPLETED" ||
    value === "PLANNED" ||
    value === "PENDING" ||
    value === "CANCELLED"
  ) {
    return value;
  }
  return "ALL";
}

function parseTime(value: string | undefined): MatchListTimeFilter {
  if (
    value === "TODAY" ||
    value === "WEEK" ||
    value === "MONTH" ||
    value === "UPCOMING" ||
    value === "PAST"
  ) {
    return value;
  }
  return "ALL";
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    status?: string;
    time?: string;
    highlight?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const status = parseStatus(params.status);
  const time = parseTime(params.time);
  const highlightMatchId = (params.highlight ?? "").trim() || null;
  const orgId = session.user.organizationId;

  const [mineResult, allResult, tournamentResult, tournaments] = await Promise.all([
    listMatchesForOrganization(orgId, {
      page,
      pageSize: 20,
      status,
      time,
      participantUserId: session.user.id,
      matchKind: "regular",
    }),
    listMatchesForOrganization(orgId, {
      page: 1,
      pageSize: 1,
      status,
      time,
      matchKind: "regular",
    }),
    listMatchesForOrganization(orgId, {
      page: 1,
      pageSize: 1,
      status,
      time,
      matchKind: "tournament",
    }),
    listTournamentsForMatchFilter(orgId),
  ]);

  const initialMine = serializeMatchesList(mineResult);
  const allTotal = allResult.total;
  const tournamentTotal = tournamentResult.total;

  const statusTabs: Array<{ key: MatchListStatusFilter; label: string }> = [
    { key: "ALL", label: "Tümü" },
    { key: "COMPLETED", label: "Tamamlandı" },
    { key: "PLANNED", label: "Planlandı" },
    { key: "PENDING", label: "Bekliyor" },
    { key: "CANCELLED", label: "İptal" },
  ];

  const timeTabs: MatchListTimeFilter[] = [
    "ALL",
    "TODAY",
    "WEEK",
    "MONTH",
    "UPCOMING",
    "PAST",
  ];

  function hrefFor(
    next: { status?: MatchListStatusFilter; time?: MatchListTimeFilter; page?: number },
  ) {
    const s = next.status ?? status;
    const t = next.time ?? time;
    const p = next.page ?? 1;
    const sp = new URLSearchParams();
    if (s !== "ALL") sp.set("status", s);
    if (t !== "ALL") sp.set("time", t);
    if (p > 1) sp.set("page", String(p));
    const q = sp.toString();
    return `/matches${q ? `?${q}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-text-muted hover:text-text-secondary text-sm">
            ← Ana sayfa
          </Link>
          <h1 className="mt-2 text-xl font-bold text-text-primary">Maçlar</h1>
          <p className="text-text-secondary text-sm">
            Benim: {initialMine.total} · Tümü: {allTotal} · Turnuva: {tournamentTotal}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/matches/new?type=planned" className="btn btn-secondary btn-sm">
            Planla
          </Link>
          <Link href="/matches/new?type=challenge" className="btn btn-secondary btn-sm">
            Meydan Oku
          </Link>
          <Link href="/matches/new" className="btn btn-primary btn-sm">
            + Maç Ekle
          </Link>
        </div>
      </div>

      <div className="mb-3">
        <p className="text-text-muted mb-2 text-xs font-semibold uppercase tracking-wide">
          Zaman
        </p>
        <div className="flex flex-wrap gap-2">
          {timeTabs.map((key) => (
            <Link
              key={key}
              href={hrefFor({ time: key, page: 1 })}
              className={`badge min-h-9 px-3 ${time === key ? "badge-win" : "badge-planned"}`}
            >
              {matchTimeFilterLabel(key)}
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="text-text-muted mb-2 text-xs font-semibold uppercase tracking-wide">
          Durum
        </p>
        <div className="flex flex-wrap gap-2">
          {statusTabs.map((tab) => (
            <Link
              key={tab.key}
              href={hrefFor({ status: tab.key, page: 1 })}
              className={`badge min-h-9 px-3 ${status === tab.key ? "badge-win" : "badge-planned"}`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      <MatchesScopeList
        currentUserId={session.user.id}
        status={status}
        time={time}
        initialMine={initialMine}
        allTotal={allTotal}
        tournamentTotal={tournamentTotal}
        tournaments={tournaments}
        highlightMatchId={highlightMatchId}
      />
    </div>
  );
}
