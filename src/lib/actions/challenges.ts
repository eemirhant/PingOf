"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  acceptChallenge,
  ChallengeError,
  createChallenge,
  declineChallenge,
} from "@/lib/challenges/service";
import { createChallengeSchema } from "@/lib/validations/challenges";

export type ChallengeActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
};

function zodFieldErrors(error: {
  flatten: () => { fieldErrors: ChallengeActionState["fieldErrors"] };
}) {
  return error.flatten().fieldErrors;
}

export async function createChallengeAction(
  _prevState: ChallengeActionState,
  formData: FormData,
): Promise<ChallengeActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Oturum bulunamadı" };
  }

  const proposedRaw = String(formData.get("proposedAt") ?? "").trim();
  const noteRaw = String(formData.get("note") ?? "");

  const parsed = createChallengeSchema.safeParse({
    toUserId: String(formData.get("toUserId") ?? "").trim(),
    proposedAt: proposedRaw ? new Date(proposedRaw) : null,
    note: noteRaw,
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const first =
      flat.fieldErrors.toUserId?.[0] ??
      flat.fieldErrors.proposedAt?.[0] ??
      flat.fieldErrors.note?.[0] ??
      flat.formErrors[0] ??
      "Lütfen formu kontrol et";
    return { error: first, fieldErrors: zodFieldErrors(parsed.error) };
  }

  try {
    await createChallenge(session.user.organizationId, session.user.id, parsed.data);
    redirect("/challenges?tab=outgoing");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof ChallengeError) {
      return { error: error.message };
    }
    return { error: "Meydan okuma gönderilirken bir hata oluştu" };
  }
}

export async function acceptChallengeAction(
  _prevState: ChallengeActionState,
  formData: FormData,
): Promise<ChallengeActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Oturum bulunamadı" };
  }

  const challengeId = String(formData.get("challengeId") ?? "").trim();
  if (!challengeId) {
    return { error: "Teklif bulunamadı" };
  }

  try {
    const result = await acceptChallenge(
      session.user.organizationId,
      session.user.id,
      challengeId,
    );
    redirect(`/matches/${result.matchId}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof ChallengeError) {
      return { error: error.message };
    }
    return { error: "Teklif kabul edilirken bir hata oluştu" };
  }
}

export async function declineChallengeAction(
  _prevState: ChallengeActionState,
  formData: FormData,
): Promise<ChallengeActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Oturum bulunamadı" };
  }

  const challengeId = String(formData.get("challengeId") ?? "").trim();
  if (!challengeId) {
    return { error: "Teklif bulunamadı" };
  }

  try {
    await declineChallenge(
      session.user.organizationId,
      session.user.id,
      challengeId,
    );
    revalidatePath("/challenges");
    return { success: "Teklif reddedildi" };
  } catch (error) {
    if (error instanceof ChallengeError) {
      return { error: error.message };
    }
    return { error: "Teklif reddedilirken bir hata oluştu" };
  }
}
