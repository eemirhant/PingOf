import { z } from "zod";

export const registerDeviceTokenSchema = z.object({
  deviceId: z.string().min(8).max(128),
  fcmToken: z.string().min(20).max(4096),
  platform: z.string().min(1).max(32).optional(),
  browser: z.string().max(64).nullable().optional(),
  deviceName: z.string().max(256).nullable().optional(),
});

export const deactivateDeviceTokenSchema = z.object({
  deviceId: z.string().min(8).max(128).optional(),
  fcmToken: z.string().min(20).max(4096).optional(),
}).refine((data) => Boolean(data.deviceId || data.fcmToken), {
  message: "deviceId veya fcmToken gerekli",
});
