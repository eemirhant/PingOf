"use server";

import { auth } from "@/auth";
import type { MatchListTimeFilter } from "@/domain/match-time-filter";
import {
  serializeMatchesList,
  type MatchesListScope,
} from "@/lib/matches/list-payload";
import {
  listMatchesForOrganization,
  type MatchListStatusFilter,
} from "@/lib/matches/service";

export async function fetchMatchesListAction(input: {
  page: number;
  status: MatchListStatusFilter;
  time: MatchListTimeFilter;
  scope: MatchesListScope;
  /** When scope is tournament: null/undefined = all tournaments, else one tournament. */
  tournamentId?: string | null;
}) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Oturum gerekli");
  }

  const isTournament = input.scope === "tournament";

  const result = await listMatchesForOrganization(session.user.organizationId, {
    page: input.page,
    pageSize: 20,
    status: input.status,
    time: input.time,
    participantUserId: input.scope === "mine" ? session.user.id : undefined,
    matchKind: isTournament ? "tournament" : "regular",
    tournamentId:
      isTournament && input.tournamentId ? input.tournamentId : undefined,
  });

  return serializeMatchesList(result);
}
