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
  avatarUrl?: string | null;
  avatarColor?: string | null;
  fullName?: string;
};

function zodFieldErrors(error: {
  flatten: () => { fieldErrors: ProfileActionState["fieldErrors"] };
}) {
  return error.flatten().fieldErrors;
}

function revalidateProfileSurfaces(userId: string) {
  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath(`/players/${userId}`);
  revalidatePath("/players");
  revalidatePath("/challenges");
  revalidatePath("/matches");
  revalidatePath("/matches/new");
  revalidatePath("/leaderboard");
  revalidatePath("/tournaments");
}

export async function updateProfileAction(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  console.log("[TRACE] updateProfileAction entered");
  console.log("[ACTION] updateProfileAction entered");

  for (const [k, v] of formData.entries()) {
    if (v instanceof File) {
      console.log("[TRACE] formData entry", k, {
        constructor: v.constructor?.name,
        type: v.type,
        size: v.size,
        name: v.name,
      });
    } else {
      console.log("[TRACE]", k, v);
    }
  }

  const session = await auth();

  if (!session?.user) {
    console.log("[ACTION] RETURN: no session — skipping upload");
    console.log("[TRACE] RETURN early: no session");
    return { error: "Oturum bulunamadı" };
  }

  const raw: UpdateProfileInput = {
    fullName: String(formData.get("fullName") ?? ""),
    avatarColor: String(formData.get("avatarColor") ?? ""),
  };

  const parsed = updateProfileSchema.safeParse(raw);

  if (!parsed.success) {
    console.log("[ACTION] RETURN: zod validation failed — skipping upload", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
    console.log("[TRACE] RETURN early: zod failed");
    return { fieldErrors: zodFieldErrors(parsed.error) };
  }

  const removePhoto = String(formData.get("removePhoto") ?? "") === "1";
  const photo = formData.get("photo");

  console.log("[TRACE] photo raw value", photo);
  console.log("[TRACE] photo instanceof File =", photo instanceof File);
  if (photo && typeof photo === "object") {
    const p = photo as File;
    console.log("[TRACE] photo.constructor.name =", p.constructor?.name);
    console.log("[TRACE] photo.size =", "size" in p ? p.size : undefined);
    console.log("[TRACE] photo.type =", "type" in p ? p.type : undefined);
    console.log("[TRACE] photo.name =", "name" in p ? p.name : undefined);
    console.log({
      constructor: p.constructor?.name,
      type: "type" in p ? p.type : undefined,
      size: "size" in p ? p.size : undefined,
      name: "name" in p ? p.name : undefined,
    });
  }

  console.log("[ACTION] formData.get('photo') raw", {
    isNull: photo === null,
    typeofPhoto: typeof photo,
    isString: typeof photo === "string",
    isFile: photo instanceof File,
    isBlob: typeof Blob !== "undefined" && photo instanceof Blob,
    constructor: photo && typeof photo === "object" ? (photo as { constructor?: { name?: string } }).constructor?.name : undefined,
    type: photo && typeof photo === "object" && "type" in photo ? (photo as File).type : undefined,
    size: photo && typeof photo === "object" && "size" in photo ? (photo as File).size : undefined,
    name: photo && typeof photo === "object" && "name" in photo ? (photo as File).name : undefined,
  });

  console.log("[ACTION] photo instanceof File =", photo instanceof File);
  if (photo instanceof File) {
    console.log("[ACTION] photo.size =", photo.size);
    console.log("[ACTION] photo.size > 0 =", photo.size > 0);
  } else if (photo === null) {
    console.log("[ACTION] photo is null (formData.get returned null)");
  } else if (typeof photo === "string") {
    console.log("[ACTION] photo is string =", photo.slice(0, 80));
  } else {
    console.log("[ACTION] photo is unexpected type", {
      typeofPhoto: typeof photo,
      constructor: photo && typeof photo === "object" ? (photo as { constructor?: { name?: string } }).constructor?.name : undefined,
    });
  }

  const gate = photo instanceof File && photo.size > 0;
  console.log("[ACTION] removePhoto =", removePhoto);
  console.log("[ACTION] upload gate: photo instanceof File && photo.size > 0 =", gate);
  console.log("[TRACE] gate photo instanceof File && photo.size > 0 =", gate);
  if (!gate) {
    console.log("[TRACE] gate false because", {
      photoIsNull: photo === null,
      photoIsString: typeof photo === "string",
      photoIsFile: photo instanceof File,
      photoSize: photo instanceof File ? photo.size : null,
      sizeGtZero: photo instanceof File ? photo.size > 0 : false,
    });
  }

  let photoDataUrl: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    console.log("[ACTION] calling saveUploadedImage");
    console.log("[Avatar Upload Action] starting saveUploadedImage", {
      photoName: photo.name,
      photoType: photo.type,
      photoSize: photo.size,
    });
    try {
      console.log("[TRACE] before saveUploadedImage");
      console.log("[ACTION] before saveUploadedImage");
      photoDataUrl = await saveUploadedImage(photo, "avatars", session.user.id);
      console.log("[TRACE] after saveUploadedImage");
      console.log("[ACTION] after saveUploadedImage");
      console.log("[Avatar Upload Action] saveUploadedImage returned", photoDataUrl);
    } catch (error) {
      console.error("[Avatar Upload Action] saveUploadedImage threw", error);
      if (error instanceof Error) {
        console.error("[Avatar Upload Action] error details", {
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: error.cause,
          serialized: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        });
      }
      if (error instanceof ImageUploadError) {
        console.log("[ACTION] RETURN: ImageUploadError from saveUploadedImage", error.message);
        return { fieldErrors: { photo: [error.message] } };
      }
      console.error("[profile] photo upload failed", error);
      console.log("[ACTION] RETURN: unexpected upload error");
      return { error: "Fotoğraf yüklenirken bir hata oluştu." };
    }
  } else {
    let skipReason = "unknown";
    if (photo === null) {
      skipReason = "formData.get('photo') === null";
    } else if (typeof photo === "string") {
      skipReason = "typeof photo === 'string'";
    } else if (!(photo instanceof File)) {
      skipReason = "!(photo instanceof File)";
    } else if (photo.size <= 0) {
      skipReason = "photo.size <= 0 (empty File)";
    }
    console.log("[ACTION] skipping upload because", skipReason);
    console.log("[TRACE] skipping upload because", skipReason);
    console.log("[Avatar Upload Action] no photo file in formData", {
      isFile: photo instanceof File,
      size: photo instanceof File ? photo.size : null,
      skipReason,
    });
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
    });

    revalidateProfileSurfaces(session.user.id);

    console.log("[ACTION] RETURN: profile update success", {
      hadUpload: Boolean(photoDataUrl),
      avatarUrl: updated.avatarUrl,
    });

    return {
      success: "Profil güncellendi.",
      avatarUrl: updated.avatarUrl,
      avatarColor: updated.avatarColor,
      fullName: updated.fullName,
    };
  } catch (error) {
    if (error instanceof ProfileError) {
      if (error.field) {
        console.log("[ACTION] RETURN: ProfileError field", error.field, error.message);
        return { fieldErrors: { [error.field]: [error.message] } };
      }
      console.log("[ACTION] RETURN: ProfileError", error.message);
      return { error: error.message };
    }
    console.error("[profile] update failed", error);
    console.log("[ACTION] RETURN: unexpected profile update error");
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
      console.error("[profile] logo upload failed", error);
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

    revalidatePath("/", "layout");
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
