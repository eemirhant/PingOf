"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { AddPlayerError, addPlayerToOrganization } from "@/lib/players/add-player";
import { addPlayerSchema, type AddPlayerInput } from "@/lib/validations/players";

export type AddPlayerActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
};

function zodFieldErrors(error: {
  flatten: () => { fieldErrors: AddPlayerActionState["fieldErrors"] };
}) {
  return error.flatten().fieldErrors;
}

export async function addPlayerAction(
  _prevState: AddPlayerActionState,
  formData: FormData,
): Promise<AddPlayerActionState> {
  const session = await auth();

  if (!session?.user) {
    return { error: "Oturum bulunamadı" };
  }

  const raw: AddPlayerInput = {
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    temporaryPassword: String(formData.get("temporaryPassword") ?? ""),
  };

  const parsed = addPlayerSchema.safeParse(raw);

  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error) };
  }

  try {
    const player = await addPlayerToOrganization(
      session.user.organizationId,
      session.user.id,
      parsed.data,
    );

    revalidatePath("/settings");
    revalidatePath("/players");
    revalidatePath("/");
    revalidatePath("/", "layout");

    return {
      success: `${player.fullName} organizasyona eklendi. Bu e-posta ve geçici şifre ile giriş yapabilir.`,
    };
  } catch (error) {
    if (error instanceof AddPlayerError) {
      if (error.field && error.field !== "root") {
        return { fieldErrors: { [error.field]: [error.message] } };
      }
      return { error: error.message };
    }

    return { error: "Oyuncu eklenirken bir hata oluştu. Lütfen tekrar deneyin." };
  }
}
