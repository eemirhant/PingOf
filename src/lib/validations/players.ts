import { z } from "zod";

import { emailSchema, passwordSchema } from "@/lib/validations/auth";

export const addPlayerSchema = z.object({
  fullName: z
    .string()
    .min(1, "Ad soyad gereklidir")
    .min(2, "Ad soyad en az 2 karakter olmalıdır"),
  email: emailSchema,
  temporaryPassword: passwordSchema,
});

export type AddPlayerInput = z.infer<typeof addPlayerSchema>;
