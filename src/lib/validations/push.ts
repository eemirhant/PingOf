import { z } from "zod";

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().min(1).max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
