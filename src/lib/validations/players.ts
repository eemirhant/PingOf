import { z } from "zod";

import { emailSchema, passwordSchema } from "@/lib/validations/auth";
import { passwordsMatchIdentity } from "@/lib/validations/password-strength";

export const addPlayerSchema = z
  .object({
    fullName: z
      .string()
      .min(1, "Ad soyad gereklidir")
      .min(2, "Ad soyad en az 2 karakter olmalıdır"),
    email: emailSchema,
    temporaryPassword: passwordSchema,
  })
  .superRefine((data, ctx) => {
    if (passwordsMatchIdentity(data.temporaryPassword, data.email)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Şifre e-posta ile aynı olamaz",
        path: ["temporaryPassword"],
      });
    }

    if (passwordsMatchIdentity(data.temporaryPassword, data.fullName)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Şifre kullanıcı adı ile aynı olamaz",
        path: ["temporaryPassword"],
      });
    }
  });

export type AddPlayerInput = z.infer<typeof addPlayerSchema>;
