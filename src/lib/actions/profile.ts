"use server";

import { revalidatePath } from "next/cache";

import { auth, unstable_update } from "@/auth";
import { ImageUploadError, saveUploadedImage } from "@/lib/media/process-upload";
import {
  ProfileError,
  changeUserPassword,
  updateOrganizationLogo,
  updateUserProfile,
} from "@/lib/profile/update-profile";
import {
  changePasswordSchema,
  updateProfileSchema,
  type ChangePasswordInput,
  type UpdateProfileInput,
} from "@/lib/validations/profile";

export type ProfileActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
};

function zodFieldErrors(error: {
  flatten: () => { fieldErrors: ProfileActionState["fieldErrors"] };
}) {
  return error.flatten().fieldErrors;
}

export async function updateProfileAction(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const session = await auth();

  if (!session?.user) {
    return { error: "Oturum bulunamadı" };
  }

  const raw: UpdateProfileInput = {
    fullName: String(formData.get("fullName") ?? ""),
    avatarColor: String(formData.get("avatarColor") ?? ""),
  };

  const parsed = updateProfileSchema.safeParse(raw);

  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error) };
  }

  const removePhoto = String(formData.get("removePhoto") ?? "") === "1";
  const photo = formData.get("photo");

  let photoDataUrl: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    try {
      photoDataUrl = await saveUploadedImage(photo, "avatars", session.user.id);
    } catch (error) {
      if (error instanceof ImageUploadError) {
        return { fieldErrors: { photo: [error.message] } };
      }
      return { error: "Fotoğraf yüklenirken bir hata oluştu." };
    }
  }

  try {
    const updated = await updateUserProfile(session.user.id, session.user.organizationId, {
      ...parsed.data,
      photoDataUrl,
      removePhoto: removePhoto && !photoDataUrl,
    });

    await unstable_update({
      user: {
        fullName: updated.fullName,
        name: updated.fullName,
      },
    });    revalidatePath("/settings");
    revalidatePath("/");
    revalidatePath(`/players/${session.user.id}`);
    revalidatePath("/players");
    revalidatePath("/challenges");
    revalidatePath("/matches");
    revalidatePath("/matches/new");
    revalidatePath("/leaderboard");

    return { success: "Profil güncellendi." };
  } catch (error) {
    if (error instanceof ProfileError) {
      if (error.field) {
        return { fieldErrors: { [error.field]: [error.message] } };
      }
      return { error: error.message };
    }
    return { error: "Profil güncellenirken bir hata oluştu." };
  }
}

export async function updateOrganizationLogoAction(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const session = await auth();

  if (!session?.user) {
    return { error: "Oturum bulunamadı" };
  }

  const removeLogo = String(formData.get("removeLogo") ?? "") === "1";
  const logo = formData.get("logo");

  let logoDataUrl: string | null = null;
  if (!removeLogo && logo instanceof File && logo.size > 0) {
    try {
      logoDataUrl = await saveUploadedImage(logo, "logos", session.user.organizationId);
    } catch (error) {
      if (error instanceof ImageUploadError) {
        return { fieldErrors: { logo: [error.message] } };
      }
      return { error: "Logo yüklenirken bir hata oluştu." };
    }
  }

  if (!removeLogo && !logoDataUrl) {
    return { error: "Bir logo dosyası seç veya mevcut logoyu kaldır." };
  }

  try {
    await updateOrganizationLogo(
      session.user.organizationId,
      session.user.id,
      session.user.role,
      removeLogo ? null : logoDataUrl,
    );

    revalidatePath("/settings");
    revalidatePath("/");

    return {
      success: removeLogo ? "Organizasyon logosu kaldırıldı." : "Organizasyon logosu güncellendi.",
    };
  } catch (error) {
    if (error instanceof ProfileError) {
      if (error.field) {
        return { fieldErrors: { [error.field]: [error.message] } };
      }
      return { error: error.message };
    }
    return { error: "Logo güncellenirken bir hata oluştu." };
  }
}

export async function changePasswordAction(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const session = await auth();

  if (!session?.user) {
    return { error: "Oturum bulunamadı" };
  }

  const raw: ChangePasswordInput = {
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };

  const parsed = changePasswordSchema.safeParse(raw);

  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error) };
  }

  try {
    await changeUserPassword(session.user.id, session.user.organizationId, parsed.data);
    return { success: "Şifren güncellendi." };
  } catch (error) {
    if (error instanceof ProfileError) {
      if (error.field) {
        return { fieldErrors: { [error.field]: [error.message] } };
      }
      return { error: error.message };
    }
    return { error: "Şifre güncellenirken bir hata oluştu." };
  }
}
