-- Separate avatar photo URL from per-user avatar color.
-- Prevents dual-purpose avatarUrl from making selected colors look like they "leak"
-- onto other users whose hashed defaults collide with the same hex.

ALTER TABLE "User" ADD COLUMN "avatarColor" TEXT;

-- Legacy: color was stored in avatarUrl as #rrggbb
UPDATE "User"
SET "avatarColor" = lower("avatarUrl")
WHERE "avatarUrl" ~ '^#[0-9A-Fa-f]{6}$';

UPDATE "User"
SET "avatarUrl" = NULL
WHERE "avatarUrl" ~ '^#[0-9A-Fa-f]{6}$';
