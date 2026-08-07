"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { InlineSuccess } from "@/components/ui/inline-success";
import { UserAvatar } from "@/components/ui/user-avatar";
import { updateProfileAction, type ProfileActionState } from "@/lib/actions/profile";
import { avatarColors } from "@/lib/design-tokens";
import { compressImageForUpload } from "@/lib/media/compress-image";
import { avatarImageSrc, isImageAvatar } from "@/lib/utils/avatar";

const initialState: ProfileActionState = {};

type ProfileFormProps = {
  userId: string;
  fullName: string;
  email: string;
  roleLabel: string;
  isOwner: boolean;
  avatarColor: string;
  avatarUrl?: string | null;
};

export function ProfileForm({
  userId,
  fullName,
  email,
  roleLabel,
  isOwner,
  avatarColor,
  avatarUrl,
}: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, initialState);
  const [selectedColor, setSelectedColor] = useState(avatarColor);
  const [namePreview, setNamePreview] = useState(fullName);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    isImageAvatar(avatarUrl) ? avatarUrl! : null,
  );
  const [removePhoto, setRemovePhoto] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [hasPendingPhoto, setHasPendingPhoto] = useState(false);
  const [avatarHighlight, setAvatarHighlight] = useState(false);
  const [compressing, startCompress] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  /** Compressed file kept in memory — do not rely on input.files = DataTransfer (fragile on mobile). */
  const pendingFileRef = useRef<File | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const showPhoto = Boolean(previewUrl) && !removePhoto;

  useEffect(() => {
    setSelectedColor(avatarColor);
    setNamePreview(fullName);
    if (!pendingFileRef.current) {
      setPreviewUrl(isImageAvatar(avatarUrl) ? avatarUrl! : null);
      setRemovePhoto(false);
    }
  }, [avatarColor, avatarUrl, fullName]);

  useEffect(() => {
    if (!state.success) return;

    pendingFileRef.current = null;
    setHasPendingPhoto(false);
    if (fileRef.current) fileRef.current.value = "";

    if (typeof state.avatarColor === "string") {
      setSelectedColor(state.avatarColor);
    }
    if (typeof state.fullName === "string") {
      setNamePreview(state.fullName);
    }
    if (state.avatarUrl !== undefined) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setPreviewUrl(isImageAvatar(state.avatarUrl) ? state.avatarUrl : null);
      setRemovePhoto(false);
    }

    // Header/list sync: revalidateProfileSurfaces + PROFILE_UPDATED event.
    setAvatarHighlight(true);
    const t = window.setTimeout(() => setAvatarHighlight(false), 900);
    return () => window.clearTimeout(t);
  }, [state]);

  useEffect(() => {
    if (state.error) {
      console.error("[Avatar Upload Client] action error string:", state.error);
    }
    if (state.fieldErrors?.photo?.[0]) {
      console.error(
        "[Avatar Upload Client] photo field error string:",
        state.fieldErrors.photo[0],
      );
    }
    if (localError) {
      console.error("[Avatar Upload Client] local error string:", localError);
    }
  }, [state.error, state.fieldErrors, localError]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  function onPickFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setLocalError(null);
    startCompress(async () => {
      try {
        const compressed = await compressImageForUpload(file, { maxEdge: 512, quality: 0.82 });
        pendingFileRef.current = compressed;
        setHasPendingPhoto(true);
        if (fileRef.current) fileRef.current.value = "";
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        const objectUrl = URL.createObjectURL(compressed);
        objectUrlRef.current = objectUrl;
        setPreviewUrl(objectUrl);
        setRemovePhoto(false);
      } catch {
        setLocalError("Görsel işlenemedi. JPG, PNG, WebP veya AVIF dene.");
        pendingFileRef.current = null;
        setHasPendingPhoto(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    });
  }

  function clearPhoto() {
    setRemovePhoto(true);
    pendingFileRef.current = null;
    setHasPendingPhoto(false);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function submitAction(formData: FormData) {
    console.log("[TRACE] client submitAction", {
      hasPendingFile: Boolean(pendingFileRef.current),
      pendingName: pendingFileRef.current?.name,
      pendingSize: pendingFileRef.current?.size,
      pendingType: pendingFileRef.current?.type,
      inputFilesLength: fileRef.current?.files?.length ?? 0,
    });
    if (pendingFileRef.current) {
      formData.set("photo", pendingFileRef.current);
      console.log("[TRACE] client set photo from pendingFileRef");
    } else {
      formData.delete("photo");
      console.log("[TRACE] client deleted photo — pendingFileRef empty");
    }
    formAction(formData);
  }

  return (
    <form action={submitAction}>
      <div className="card-title">Profil Bilgileri</div>

      <div className="mb-5 flex items-center gap-4">
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            className="profile-avatar-edit"
            onClick={() => fileRef.current?.click()}
            disabled={compressing || isPending}
            aria-label="Profil fotoğrafını değiştir"
          >
            {showPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={
                  previewUrl!.startsWith("blob:")
                    ? previewUrl!
                    : avatarImageSrc(previewUrl!)
                }
                alt={namePreview || fullName}
                className={`avatar avatar-xl object-cover ${avatarHighlight ? "avatar--highlight" : ""}`.trim()}
              />
            ) : (
              <UserAvatar
                userId={userId}
                fullName={namePreview || fullName}
                avatarUrl={null}
                avatarColor={selectedColor}
                size="xl"
                highlight={avatarHighlight}
              />
            )}
            <span className="profile-avatar-edit-overlay">
              {compressing ? "…" : "Değiştir"}
            </span>
          </button>

          {showPhoto || (isImageAvatar(avatarUrl) && !removePhoto) ? (
            <button
              type="button"
              className="text-text-muted hover:text-red text-xs font-semibold"
              onClick={clearPhoto}
            >
              Fotoğrafı kaldır
            </button>
          ) : (
            <span className="text-text-muted text-xs">Fotoğrafa tıkla</span>
          )}
        </div>

        <div>
          <div className="text-[1.0625rem] font-bold text-text-primary">
            {namePreview || fullName}
          </div>
          <div className="text-text-muted text-sm">{email}</div>
          <span
            className={`badge mt-1.5 ${isOwner ? "" : "badge-planned"}`}
            style={
              isOwner
                ? {
                    background: "rgba(234,179,8,0.12)",
                    color: "#fde047",
                    border: "1px solid rgba(234,179,8,0.2)",
                  }
                : undefined
            }
          >
            {roleLabel}
          </span>
          <p className="text-text-muted mt-2 text-xs">E-posta değiştirme v1 kapsamında değildir.</p>
        </div>
      </div>

      <input
        id="photo"
        name="photo"
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => onPickFile(e.target.files)}
      />
      <input type="hidden" name="avatarColor" value={selectedColor} readOnly />
      <input type="hidden" name="removePhoto" value={removePhoto ? "1" : "0"} readOnly />

      {(state.fieldErrors?.photo?.[0] || localError) && (
        <p className="form-error mb-4" role="alert">
          {state.fieldErrors?.photo?.[0] ?? localError}
        </p>
      )}

      <div className="form-group mb-4">
        <label htmlFor="fullName" className="form-label">
          Ad soyad
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          placeholder="Ahmet Yılmaz"
          autoComplete="name"
          defaultValue={fullName}
          className={`form-input ${state.fieldErrors?.fullName ? "error" : state.success ? "success" : ""}`}
          onChange={(event) => setNamePreview(event.target.value)}
          aria-invalid={Boolean(state.fieldErrors?.fullName)}
        />
        {state.fieldErrors?.fullName?.[0] ? (
          <p className="form-error">{state.fieldErrors.fullName[0]}</p>
        ) : null}
      </div>

      <div className="form-group mb-4">
        <label className="form-label">
          {showPhoto ? "Yedek avatar rengi" : "Avatar rengi"}
        </label>
        <div className="flex flex-wrap gap-2">
          {avatarColors.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Avatar rengi ${color}`}
              onClick={() => setSelectedColor(color)}
              className="h-11 w-11 rounded-full border-2 transition"
              style={{
                background: color,
                borderColor: selectedColor === color ? "#fff" : "transparent",
                boxShadow: selectedColor === color ? `0 0 0 2px ${color}` : undefined,
              }}
            />
          ))}
        </div>
        {state.fieldErrors?.avatarColor?.[0] ? (
          <p className="form-error">{state.fieldErrors.avatarColor[0]}</p>
        ) : (
          <p className="form-helper">Fotoğraf yoksa baş harfler bu renkte gösterilir.</p>
        )}
      </div>

      {state.error ? (
        <p className="form-error mb-4 rounded-md border border-red/20 bg-red/10 px-3 py-2" role="alert">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <InlineSuccess trigger={state.success} message={state.success} />
      ) : null}

      <Button
        type="submit"
        variant="primary"
        size="sm"
        loading={isPending || compressing}
        disabled={isPending || compressing}
      >
        {compressing
          ? "Fotoğraf hazırlanıyor…"
          : isPending
            ? hasPendingPhoto
              ? "Fotoğraf yükleniyor…"
              : "Kaydediliyor…"
            : "Profili Güncelle"}
      </Button>
    </form>
  );
}
