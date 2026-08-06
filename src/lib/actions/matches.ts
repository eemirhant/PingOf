"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  cancelMatch,
  createInstantMatch,
  createPlannedMatch,
  deleteMatch,
  enterPlannedMatchResult,
  joinPlannedMatch,
  MatchError,
  setMatchStakeSettled,
  updateInstantMatch,
} from "@/lib/matches/service";
import {
  instantMatchSchema,
  plannedMatchResultSchema,
  plannedMatchSchema,
  type InstantMatchInput,
} from "@/lib/validations/matches";

export type MatchActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
};

function zodFieldErrors(error: {
  flatten: () => { fieldErrors: MatchActionState["fieldErrors"] };
}) {
  return error.flatten().fieldErrors;
}

function parseInstantMatchForm(formData: FormData):
  | { ok: true; data: InstantMatchInput }
  | { ok: false; state: MatchActionState } {
  let parsedSets: InstantMatchInput["sets"] = [];
  let team1PlayerIds: string[] = [];
  let team2PlayerIds: string[] = [];

  try {
    parsedSets = JSON.parse(String(formData.get("sets") ?? "[]")) as InstantMatchInput["sets"];
    team1PlayerIds = JSON.parse(
      String(formData.get("team1PlayerIds") ?? "[]"),
    ) as string[];
    team2PlayerIds = JSON.parse(
      String(formData.get("team2PlayerIds") ?? "[]"),
    ) as string[];
  } catch {
    return { ok: false, state: { error: "Form verisi geçersiz" } };
  }

  const raw = {
    format: String(formData.get("format") ?? "SINGLES"),
    team1PlayerIds,
    team2PlayerIds,
    sets: parsedSets,
    stakeNote: String(formData.get("stakeNote") ?? ""),
    team1Name: String(formData.get("team1Name") ?? ""),
    team2Name: String(formData.get("team2Name") ?? ""),
  };

  const parsed = instantMatchSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      ok: false,
      state: { fieldErrors: zodFieldErrors(parsed.error), error: "Lütfen formu kontrol et" },
    };
  }

  return { ok: true, data: parsed.data };
}

export async function createInstantMatchAction(
  _prevState: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const session = await auth();

  if (!session?.user) {
    return { error: "Oturum bulunamadı" };
  }

  const parsed = parseInstantMatchForm(formData);
  if (!parsed.ok) return parsed.state;

  try {
    const match = await createInstantMatch(
      session.user.organizationId,
      session.user.id,
      parsed.data,
    );
    redirect(`/matches/${match.id}`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof MatchError) {
      return { error: error.message };
    }
    return { error: "Maç kaydedilirken bir hata oluştu" };
  }
}

export async function createPlannedMatchAction(
  _prevState: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const session = await auth();

  if (!session?.user) {
    return { error: "Oturum bulunamadı" };
  }

  let team1PlayerIds: string[] = [];
  let team2PlayerIds: string[] = [];

  try {
    team1PlayerIds = JSON.parse(
      String(formData.get("team1PlayerIds") ?? "[]"),
    ) as string[];
    team2PlayerIds = JSON.parse(
      String(formData.get("team2PlayerIds") ?? "[]"),
    ) as string[];
  } catch {
    return { error: "Form verisi geçersiz" };
  }

  const scheduledRaw = String(formData.get("scheduledAt") ?? "").trim();
  const scheduledAt = scheduledRaw ? new Date(scheduledRaw) : null;

  const parsed = plannedMatchSchema.safeParse({
    format: String(formData.get("format") ?? "SINGLES"),
    scheduledAt,
    team1PlayerIds: team1PlayerIds.filter(Boolean),
    team2PlayerIds: team2PlayerIds.filter(Boolean),
    stakeNote: String(formData.get("stakeNote") ?? ""),
    team1Name: String(formData.get("team1Name") ?? ""),
    team2Name: String(formData.get("team2Name") ?? ""),
  });

  if (!parsed.success) {
    const first =
      parsed.error.flatten().fieldErrors.scheduledAt?.[0] ??
      parsed.error.flatten().formErrors[0] ??
      "Lütfen formu kontrol et";
    return { fieldErrors: zodFieldErrors(parsed.error), error: first };
  }

  try {
    const match = await createPlannedMatch(
      session.user.organizationId,
      session.user.id,
      parsed.data,
    );
    redirect(`/matches/${match.id}`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof MatchError) {
      return { error: error.message };
    }
    console.error("createPlannedMatch failed", error);
    return { error: "Maç planlanırken bir hata oluştu" };
  }
}

export async function updateInstantMatchAction(
  _prevState: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const session = await auth();

  if (!session?.user) {
    return { error: "Oturum bulunamadı" };
  }

  const matchId = String(formData.get("matchId") ?? "").trim();
  if (!matchId) {
    return { error: "Maç bulunamadı" };
  }

  const parsed = parseInstantMatchForm(formData);
  if (!parsed.ok) return parsed.state;

  try {
    await updateInstantMatch(
      session.user.organizationId,
      { id: session.user.id, role: session.user.role },
      matchId,
      parsed.data,
    );
    redirect(`/matches/${matchId}`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof MatchError) {
      return { error: error.message };
    }
    return { error: "Maç güncellenirken bir hata oluştu" };
  }
}

export async function deleteMatchAction(
  _prevState: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const session = await auth();

  if (!session?.user) {
    return { error: "Oturum bulunamadı" };
  }

  const matchId = String(formData.get("matchId") ?? "").trim();
  if (!matchId) {
    return { error: "Maç bulunamadı" };
  }

  try {
    await deleteMatch(
      session.user.organizationId,
      { id: session.user.id, role: session.user.role },
      matchId,
    );
    redirect("/matches");
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof MatchError) {
      return { error: error.message };
    }
    return { error: "Maç silinirken bir hata oluştu" };
  }
}

export async function cancelMatchAction(
  _prevState: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const session = await auth();

  if (!session?.user) {
    return { error: "Oturum bulunamadı" };
  }

  const matchId = String(formData.get("matchId") ?? "").trim();
  if (!matchId) {
    return { error: "Maç bulunamadı" };
  }

  try {
    await cancelMatch(
      session.user.organizationId,
      { id: session.user.id, role: session.user.role },
      matchId,
    );
    redirect(`/matches/${matchId}`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof MatchError) {
      return { error: error.message };
    }
    return { error: "Maç iptal edilirken bir hata oluştu" };
  }
}

export async function joinPlannedMatchAction(
  _prevState: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const session = await auth();

  if (!session?.user) {
    return { error: "Oturum bulunamadı" };
  }

  const matchId = String(formData.get("matchId") ?? "").trim();
  if (!matchId) {
    return { error: "Maç bulunamadı" };
  }

  const teamRaw = String(formData.get("team") ?? "").trim();
  const preferredTeam =
    teamRaw === "1" ? (1 as const) : teamRaw === "2" ? (2 as const) : undefined;

  try {
    await joinPlannedMatch(
      session.user.organizationId,
      session.user.id,
      matchId,
      preferredTeam,
    );
    revalidatePath(`/matches/${matchId}`);
    return { success: "Maça katıldın" };
  } catch (error) {
    if (error instanceof MatchError) {
      return { error: error.message };
    }
    return { error: "Maça katılırken bir hata oluştu" };
  }
}

export async function enterPlannedMatchResultAction(
  _prevState: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const session = await auth();

  if (!session?.user) {
    return { error: "Oturum bulunamadı" };
  }

  const matchId = String(formData.get("matchId") ?? "").trim();
  if (!matchId) {
    return { error: "Maç bulunamadı" };
  }

  let sets: InstantMatchInput["sets"] = [];
  try {
    sets = JSON.parse(String(formData.get("sets") ?? "[]")) as InstantMatchInput["sets"];
  } catch {
    return { error: "Form verisi geçersiz" };
  }

  const parsed = plannedMatchResultSchema.safeParse({ sets });
  if (!parsed.success) {
    return { error: "Lütfen set skorlarını kontrol et", fieldErrors: zodFieldErrors(parsed.error) };
  }

  try {
    await enterPlannedMatchResult(
      session.user.organizationId,
      session.user.id,
      matchId,
      parsed.data,
    );
    redirect(`/matches/${matchId}`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof MatchError) {
      return { error: error.message };
    }
    return { error: "Sonuç kaydedilirken bir hata oluştu" };
  }
}

export async function setStakeSettledAction(
  _prevState: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Oturum bulunamadı" };
  }

  const matchId = String(formData.get("matchId") ?? "").trim();
  // Only "mark as paid" is supported — ignore client attempts to unset.
  const settledRaw = String(formData.get("settled") ?? "").trim();
  const settled = settledRaw === "true" || settledRaw === "1";

  if (!matchId) {
    return { error: "Maç bulunamadı" };
  }

  if (!settled) {
    return { error: "İddia yalnızca ödendi olarak işaretlenebilir" };
  }

  try {
    await setMatchStakeSettled(
      session.user.organizationId,
      session.user.id,
      matchId,
      true,
    );
    revalidatePath(`/matches/${matchId}`);
    revalidatePath(`/players/${session.user.id}`);
    revalidatePath("/matches");
    revalidatePath("/");
    return {
      success: "İddia ödendi olarak işaretlendi",
    };
  } catch (error) {
    if (error instanceof MatchError) {
      return { error: error.message };
    }
    return { error: "İddia güncellenirken bir hata oluştu" };
  }
}
