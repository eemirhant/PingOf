"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { InlineSuccess } from "@/components/ui/inline-success";
import {
  updateOrganizationLogoAction,
  type ProfileActionState,
} from "@/lib/actions/profile";
import { compressImageForUpload } from "@/lib/media/compress-image";
import { avatarImageSrc, isImageAvatar } from "@/lib/utils/avatar";

const initialState: ProfileActionState = {};

type OrganizationLogoFormProps = {
  organizationName: string;
  logoUrl?: string | null;
};

export function OrganizationLogoForm({
  organizationName,
  logoUrl,
}: OrganizationLogoFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateOrganizationLogoAction,
    initialState,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    isImageAvatar(logoUrl) ? logoUrl! : null,
  );
  const [removeLogo, setRemoveLogo] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [compressing, startCompress] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingFileRef = useRef<File | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pendingFileRef.current) {
      setPreviewUrl(isImageAvatar(logoUrl) ? logoUrl! : null);
      setRemoveLogo(false);
    }
  }, [logoUrl]);

  useEffect(() => {
    if (!state.success) return;
    pendingFileRef.current = null;
    if (fileRef.current) fileRef.current.value = "";
    // Brand sync: revalidatePath + PROFILE_UPDATED event (no duplicate refresh).
  }, [state.success]);

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
        const compressed = await compressImageForUpload(file, {
          maxEdge: 512,
          quality: 0.85,
        });
        pendingFileRef.current = compressed;
        if (fileRef.current) fileRef.current.value = "";
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        const objectUrl = URL.createObjectURL(compressed);
        objectUrlRef.current = objectUrl;
        setPreviewUrl(objectUrl);
        setRemoveLogo(false);
      } catch {
        setLocalError("Logo işlenemedi. JPG veya PNG dene.");
        pendingFileRef.current = null;
        if (fileRef.current) fileRef.current.value = "";
      }
    });
  }

  function submitAction(formData: FormData) {
    if (pendingFileRef.current) {
      formData.set("logo", pendingFileRef.current);
    } else {
      formData.delete("logo");
    }
    formAction(formData);
  }

  return (
    <form action={submitAction}>
      <div className="card-title">Organizasyon logosu</div>
      <p className="text-text-secondary mb-4 text-sm">
        Bu logo üst bardaki markanın yanında görünür. Yalnızca kurucu yükleyebilir.
      </p>

      <div className="mb-4 flex items-center gap-4">
        {previewUrl && !removeLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={
              previewUrl.startsWith("blob:")
                ? previewUrl
                : avatarImageSrc(previewUrl)
            }
            alt={`${organizationName} logosu`}
            className="h-14 w-14 rounded-[12px] object-cover"
            style={{ boxShadow: "0 4px 14px rgba(99,102,241,0.35)" }}
          />
        ) : (
          <div
            className="grid h-14 w-14 place-items-center rounded-[12px] text-lg font-extrabold text-white"
            style={{
              background: "linear-gradient(135deg, #6366f1, #7c3aed)",
              boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
            }}
          >
            {organizationName.slice(0, 1).toLocaleUpperCase("tr-TR")}
          </div>
        )}
        <div className="min-w-0">
          <div className="font-semibold text-text-primary">{organizationName}</div>
          <div className="text-text-muted text-xs">Üst bar önizlemesi</div>
        </div>
      </div>

      <input type="hidden" name="removeLogo" value={removeLogo ? "1" : "0"} readOnly />

      <div className="form-group mb-4">
        <label htmlFor="logo" className="form-label">
          Logo dosyası
        </label>
        <input
          id="logo"
          name="logo"
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="form-input"
          onChange={(e) => onPickFile(e.target.files)}
          disabled={removeLogo}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {(previewUrl || isImageAvatar(logoUrl)) && !removeLogo ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setRemoveLogo(true);
                pendingFileRef.current = null;
                if (objectUrlRef.current) {
                  URL.revokeObjectURL(objectUrlRef.current);
                  objectUrlRef.current = null;
                }
                setPreviewUrl(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              Logoyu kaldır
            </button>
          ) : null}
          {removeLogo ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setRemoveLogo(false);
                setPreviewUrl(isImageAvatar(logoUrl) ? logoUrl! : null);
              }}
            >
              Kaldırmayı iptal et
            </button>
          ) : null}
        </div>
        {state.fieldErrors?.logo?.[0] ? (
          <p className="form-error">{state.fieldErrors.logo[0]}</p>
        ) : (
          <p className="form-helper">Kare veya yatay logo önerilir · JPG/PNG/WebP.</p>
        )}
        {localError ? <p className="form-error">{localError}</p> : null}
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
        {compressing ? "Logo hazırlanıyor…" : isPending ? "Kaydediliyor…" : "Logoyu Kaydet"}
      </Button>
    </form>
  );
}
