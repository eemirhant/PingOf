import type { CSSProperties } from "react";

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
};

export function UserAvatar({
  userId,
  fullName,
  avatarUrl,
  avatarColor,
  size = "sm",
  className = "",
  style,
}: UserAvatarProps) {
  const sizeClass = SIZE_CLASS[size];
  const classes = `avatar ${sizeClass} ${className}`.trim();
  const color = avatarColorForUser(userId, avatarUrl, avatarColor);

  if (isImageAvatar(avatarUrl)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- user uploads / blob URLs
      <img
        key={avatarUrl}
        src={avatarImageSrc(avatarUrl!)}
        alt={fullName}
        className={`${classes} object-cover`}
        style={{ background: "transparent", ...style }}
      />
    );
  }

  return (
    <div
      className={classes}
      style={{ background: color, ...style }}
      aria-hidden
    >
      {getInitials(fullName)}
    </div>
  );
}
