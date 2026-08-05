-- Drop DND columns from notification settings (feature removed).
ALTER TABLE "UserNotificationSettings" DROP COLUMN IF EXISTS "dndEnabled";
ALTER TABLE "UserNotificationSettings" DROP COLUMN IF EXISTS "dndStartMin";
ALTER TABLE "UserNotificationSettings" DROP COLUMN IF EXISTS "dndEndMin";
