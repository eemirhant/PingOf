"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

import {
  avatarColorForUser,
  avatarImageSrc,
  getInitials,
  isImageAvatar,
} from "@/lib/utils/avatar";

type AvatarSize = "xs" | "sm" | "lg" | "xl";

const SIZE_CLASS: Record<AvatarSize, string> = {
  xs: "avatar-xs",
  sm: "avatar-sm",
  lg: "avatar-lg",
  xl: "avatar-xl",
};

type UserAvatarProps = {
  userId: string;
  fullName: string;
  avatarUrl?: string | null;
  /** Per-user color from DB — must belong to this userId only. */
  avatarColor?: string | null;
  size?: AvatarSize;
  className?: string;
  style?: CSSProperties;
  /** Brief highlight after upload/success. */
  highlight?: boolean;
};

type LoadState = "loading" | "loaded" | "error";

/**
 * Avatar render order:
 * 1) image URL → <img>
 * 2) load error → initials
 * 3) no initials → default icon
 */
export function UserAvatar({
  userId,
  fullName,
  avatarUrl,
  avatarColor,
  size = "sm",
  className = "",
  style,
  highlight = false,
}: UserAvatarProps) {
  const sizeClass = SIZE_CLASS[size];
  const classes =
    `avatar ${sizeClass} ${highlight ? "avatar--highlight" : ""} ${className}`.trim();
  const color = avatarColorForUser(userId, avatarUrl, avatarColor);
  const hasImageUrl = isImageAvatar(avatarUrl);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const imgRef = useRef<HTMLImageElement | null>(null);
  const src = hasImageUrl ? avatarImageSrc(avatarUrl!) : null;

  useLayoutEffect(() => {
    if (!hasImageUrl) {
      setLoadState("loading");
      return;
    }
    setLoadState("loading");
    const img = imgRef.current;
    if (!img) return;
    // Cached images often finish before onLoad is attached.
    if (img.complete) {
      if (img.naturalWidth > 0) setLoadState("loaded");
      else setLoadState("error");
    }
  }, [hasImageUrl, src]);

  if (hasImageUrl && loadState !== "error" && src) {
    return (
      <span className={`avatar-wrap ${sizeClass}`} title={fullName}>
        {loadState === "loading" ? (
          <span className="avatar-progress ui-skeleton" aria-hidden />
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element -- Blob / upload URLs */}
        <img
          ref={imgRef}
          key={src}
          src={src}
          alt={fullName}
          className={`${classes} object-cover avatar--image ${loadState === "loaded" ? "avatar--loaded" : "avatar--loading"}`}
          style={{ background: "transparent", ...style }}
          onLoad={() => setLoadState("loaded")}
          onError={() => setLoadState("error")}
          decoding="async"
        />
      </span>
    );
  }

  const initials = getInitials(fullName);

  return (
    <div
      className={classes}
      style={{ background: color, ...style }}
      aria-hidden
      title={fullName}
    >
      {initials !== "?" ? (
        initials
      ) : (
        <span className="avatar-fallback-icon" aria-hidden>
          👤
        </span>
      )}
    </div>
  );
}
