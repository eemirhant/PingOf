import { describe, expect, it } from "vitest";

import { avatarColors } from "@/lib/design-tokens";
import {
  avatarColorForUser,
  avatarImageSrc,
  hashAvatarColor,
  isImageAvatar,
} from "@/lib/utils/avatar";

describe("hashAvatarColor", () => {
  it("is deterministic for the same userId", () => {
    expect(hashAvatarColor("user_abc")).toBe(hashAvatarColor("user_abc"));
  });

  it("stays within the palette", () => {
    for (const id of ["a", "b", "clxyz123", "user-with-long-cuid-value"]) {
      expect(avatarColors).toContain(hashAvatarColor(id));
    }
  });

  it("does not depend on list index — only userId", () => {
    const ids = ["u1", "u2", "u3", "u4", "u5"];
    const shuffled = [...ids].reverse();
    expect(ids.map(hashAvatarColor)).toEqual(
      shuffled.map(hashAvatarColor).reverse(),
    );
  });
});

describe("avatarColorForUser", () => {
  it("prefers explicit DB avatarColor over everything else", () => {
    expect(
      avatarColorForUser("user1", "/uploads/avatars/x.jpg", "#f97316"),
    ).toBe("#f97316");
  });

  it("uses legacy hex in avatarUrl when avatarColor is missing", () => {
    expect(avatarColorForUser("user1", "#10b981", null)).toBe("#10b981");
  });

  it("falls back to hash(userId) and never another user's color prop", () => {
    const a = avatarColorForUser("userA", null, null);
    const b = avatarColorForUser("userB", null, null);
    expect(a).toBe(hashAvatarColor("userA"));
    expect(b).toBe(hashAvatarColor("userB"));
    // Selecting a color for A must not change B's resolved color
    expect(avatarColorForUser("userB", null, "#f97316")).toBe("#f97316");
    expect(avatarColorForUser("userA", null, null)).toBe(hashAvatarColor("userA"));
  });

  it("ignores image avatarUrl when computing color without explicit color", () => {
    expect(avatarColorForUser("userZ", "https://blob.example/a.jpg", null)).toBe(
      hashAvatarColor("userZ"),
    );
  });
});

describe("isImageAvatar / avatarImageSrc", () => {
  it("detects uploaded and remote images", () => {
    expect(isImageAvatar("/uploads/avatars/u-1.jpg")).toBe(true);
    expect(isImageAvatar("https://public.blob.vercel-storage.com/x.jpg")).toBe(true);
    expect(isImageAvatar("#6366f1")).toBe(false);
    expect(isImageAvatar(null)).toBe(false);
  });

  it("adds cache-bust query from filename timestamp", () => {
    expect(avatarImageSrc("/uploads/avatars/user-1700000000000.jpg")).toBe(
      "/uploads/avatars/user-1700000000000.jpg?v=1700000000000",
    );
  });
});
