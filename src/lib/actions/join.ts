"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth, signIn } from "@/auth";
import {
  JoinError,
  joinOrganizationWithInvite,
  regenerateOrganizationInviteCode,
} from "@/lib/auth/join";
import type { AuthActionState } from "@/lib/actions/auth";
import { joinSchema, type JoinInput } from "@/lib/validations/auth";

function zodFieldErrors(error: {
  flatten: () => { fieldErrors: AuthActionState["fieldErrors"] };
}) {
  return error.flatten().fieldErrors;
}

export async function joinAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const raw: JoinInput = {
    inviteCode: String(formData.get("inviteCode") ?? ""),
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };

  const parsed = joinSchema.safeParse(raw);

  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error) };
  }

  try {
    await joinOrganizationWithInvite(parsed.data);
  } catch (error) {
    if (error instanceof JoinError) {
      if (error.field === "inviteCode") {
        return { error: error.message };
      }
      if (error.field && error.field !== "root") {
        return { fieldErrors: { [error.field]: [error.message] } };
      }
      return { error: error.message };
    }

    return { error: "Katılım sırasında bir hata oluştu. Lütfen tekrar deneyin." };
  }

  try {
    const result = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });

    if (result?.error) {
      return {
        error:
          "Hesap oluşturuldu ancak otomatik giriş yapılamadı. Lütfen giriş sayfasından deneyin.",
      };
    }
  } catch {
    return {
      error:
        "Hesap oluşturuldu ancak otomatik giriş yapılamadı. Lütfen giriş sayfasından deneyin.",
    };
  }

  redirect("/");
}

export type RegenerateInviteState = {
  error?: string;
  success?: string;
  inviteCode?: string;
};

export async function regenerateInviteAction(
  _prevState: RegenerateInviteState,
  formData: FormData,
): Promise<RegenerateInviteState> {
  void formData;
  const session = await auth();

  if (!session?.user) {
    return { error: "Oturum bulunamadı" };
  }

  if (session.user.role !== "OWNER") {
    return { error: "Davet linkini yalnızca kurucu sıfırlayabilir" };
  }

  try {
    const organization = await regenerateOrganizationInviteCode(
      session.user.organizationId,
      session.user.id,
    );

    revalidatePath("/settings");

    return {
      success: "Davet linki yenilendi. Eski link artık geçersiz.",
      inviteCode: organization.inviteCode,
    };
  } catch (error) {
    if (error instanceof JoinError) {
      return { error: error.message };
    }
    return { error: "Davet linki yenilenemedi. Lütfen tekrar deneyin." };
  }
}
