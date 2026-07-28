"use client";

import { useActionState, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { updateProfileAction, type ProfileActionState } from "@/lib/actions/profile";
import { avatarColors } from "@/lib/design-tokens";
import { compressImageForUpload } from "@/lib/media/compress-image";
import { isImageAvatar } from "@/lib/utils/avatar";

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
  const [compressing, startCompress] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const showPhoto = Boolean(previewUrl) && !removePhoto;

  function onPickFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setLocalError(null);
    startCompress(async () => {
      try {
        const compressed = await compressImageForUpload(file, { maxEdge: 512, quality: 0.82 });
        const dt = new DataTransfer();
        dt.items.add(compressed);
        if (fileRef.current) fileRef.current.files = dt.files;
        const objectUrl = URL.createObjectURL(compressed);
        setPreviewUrl(objectUrl);
        setRemovePhoto(false);
      } catch {
        setLocalError("Görsel işlenemedi. JPG veya PNG dene.");
        if (fileRef.current) fileRef.current.value = "";
      }
    });
  }

  function clearPhoto() {
    setRemovePhoto(true);
    setPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <form action={formAction}>
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
                src={previewUrl!}
                alt={namePreview || fullName}
                className="avatar avatar-xl object-cover"
              />
            ) : (
              <UserAvatar
                userId={userId}
                fullName={namePreview || fullName}
                avatarUrl={selectedColor}
                size="xl"
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
        accept="image/jpeg,image/png,image/webp"
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
          className={`form-input ${state.fieldErrors?.fullName ? "error" : ""}`}
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
        <p
          className="mb-4 rounded-md border px-3 py-2 text-sm text-green"
          style={{
            background: "rgba(16,185,129,0.08)",
            borderColor: "rgba(16,185,129,0.2)",
          }}
          role="status"
        >
          ✅ {state.success}
        </p>
      ) : null}

      <Button type="submit" variant="primary" size="sm" disabled={isPending || compressing}>
        {compressing ? "Fotoğraf hazırlanıyor…" : isPending ? "Kaydediliyor…" : "Profili Güncelle"}
      </Button>
    </form>
  );
}
