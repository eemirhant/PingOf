import type { CSSProperties } from "react";

import { avatarColorForUser, getInitials, isImageAvatar } from "@/lib/utils/avatar";

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
  size?: AvatarSize;
  className?: string;
  style?: CSSProperties;
};

export function UserAvatar({
  userId,
  fullName,
  avatarUrl,
  size = "sm",
  className = "",
  style,
}: UserAvatarProps) {
  const sizeClass = SIZE_CLASS[size];
  const classes = `avatar ${sizeClass} ${className}`.trim();

  if (isImageAvatar(avatarUrl)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data URLs / user uploads
      <img
        src={avatarUrl!}
        alt={fullName}
        className={`${classes} object-cover`}
        style={{ background: "transparent", ...style }}
      />
    );
  }

  return (
    <div
      className={classes}
      style={{ background: avatarColorForUser(userId, avatarUrl), ...style }}
      aria-hidden
    >
      {getInitials(fullName)}
    </div>
  );
}
