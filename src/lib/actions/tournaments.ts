"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";

import { auth } from "@/auth";
import {
  cancelTournament,
  createTournament,
  shuffleTournamentSeeds,
  startTournament,
  TournamentError,
} from "@/lib/tournaments/service";
import { createTournamentSchema } from "@/lib/validations/tournament";

export type TournamentActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
};

function zodFieldErrors(error: {
  flatten: () => { fieldErrors: TournamentActionState["fieldErrors"] };
}) {
  return error.flatten().fieldErrors;
}

function parsePairsFromForm(formData: FormData): [string, string][] {
  const raw = String(formData.get("pairsJson") ?? "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (p): p is [string, string] =>
          Array.isArray(p) &&
          p.length === 2 &&
          typeof p[0] === "string" &&
          typeof p[1] === "string",
      )
      .map(([a, b]) => [a, b] as [string, string]);
  } catch {
    return [];
  }
}

export async function createTournamentAction(
  _prevState: TournamentActionState,
  formData: FormData,
): Promise<TournamentActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Oturum bulunamadı" };
  }

  const format = String(formData.get("format") ?? "").trim();
  const participantIds = formData
    .getAll("participantIds")
    .map((v) => String(v).trim())
    .filter(Boolean);

  const parsed = createTournamentSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    type: String(formData.get("type") ?? ""),
    format,
    startsAt: String(formData.get("startsAt") ?? ""),
    participantIds: format === "SINGLES" ? participantIds : [],
    pairs: format === "DOUBLES" ? parsePairsFromForm(formData) : [],
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const first =
      flat.fieldErrors.name?.[0] ??
      flat.fieldErrors.type?.[0] ??
      flat.fieldErrors.format?.[0] ??
      flat.fieldErrors.startsAt?.[0] ??
      flat.fieldErrors.participantIds?.[0] ??
      flat.fieldErrors.pairs?.[0] ??
      flat.formErrors[0] ??
      "Lütfen formu kontrol et";
    return { error: first, fieldErrors: zodFieldErrors(parsed.error) };
  }

  try {
    const tournament = await createTournament(
      session.user.organizationId,
      session.user.id,
      parsed.data,
    );
    revalidatePath(`/tournaments/${tournament.id}`);
    revalidatePath("/tournaments");
    revalidatePath("/");
    redirect(`/tournaments/${tournament.id}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof TournamentError) {
      return { error: error.message };
    }
    console.error("createTournament failed", error);
    return { error: "Turnuva oluşturulurken bir hata oluştu" };
  }
}

export async function startTournamentAction(
  _prevState: TournamentActionState,
  formData: FormData,
): Promise<TournamentActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Oturum bulunamadı" };
  }

  const tournamentId = String(formData.get("tournamentId") ?? "").trim();
  if (!tournamentId) return { error: "Turnuva bulunamadı" };

  try {
    await startTournament(session.user.organizationId, tournamentId);
    revalidatePath(`/tournaments/${tournamentId}`);
    revalidatePath("/tournaments");
    revalidatePath("/");
    return { success: "Turnuva başlatıldı" };
  } catch (error) {
    if (error instanceof TournamentError) {
      return { error: error.message };
    }
    return { error: "Turnuva başlatılırken bir hata oluştu" };
  }
}

export async function shuffleTournamentAction(
  _prevState: TournamentActionState,
  formData: FormData,
): Promise<TournamentActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Oturum bulunamadı" };
  }

  const tournamentId = String(formData.get("tournamentId") ?? "").trim();
  if (!tournamentId) return { error: "Turnuva bulunamadı" };

  try {
    await shuffleTournamentSeeds(session.user.organizationId, tournamentId);
    revalidatePath(`/tournaments/${tournamentId}`);
    return { success: "Eşleşmeler karıştırıldı" };
  } catch (error) {
    if (error instanceof TournamentError) {
      return { error: error.message };
    }
    return { error: "Karıştırma sırasında bir hata oluştu" };
  }
}

export async function cancelTournamentAction(
  _prevState: TournamentActionState,
  formData: FormData,
): Promise<TournamentActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Oturum bulunamadı" };
  }

  const tournamentId = String(formData.get("tournamentId") ?? "").trim();
  if (!tournamentId) return { error: "Turnuva bulunamadı" };

  try {
    await cancelTournament(
      session.user.organizationId,
      {
        id: session.user.id,
        role: session.user.role as UserRole,
      },
      tournamentId,
    );
    revalidatePath(`/tournaments/${tournamentId}`);
    revalidatePath("/tournaments");
    revalidatePath("/");
    return { success: "Turnuva iptal edildi" };
  } catch (error) {
    if (error instanceof TournamentError) {
      return { error: error.message };
    }
    return { error: "Turnuva iptal edilirken bir hata oluştu" };
  }
}
