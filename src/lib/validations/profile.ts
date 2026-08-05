import { z } from "zod";

import { avatarColors } from "@/lib/design-tokens";
import { passwordSchema } from "@/lib/validations/auth";

const avatarColorSet = new Set<string>(avatarColors);

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(1, "Ad soyad gereklidir")
    .min(2, "Ad soyad en az 2 karakter olmalıdır")
    .max(80, "Ad soyad en fazla 80 karakter olabilir"),
  avatarColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Geçersiz avatar rengi")
    .refine((value) => avatarColorSet.has(value.toLowerCase()), {
      message: "Geçersiz avatar rengi",
    })
    .transform((value) => value.toLowerCase()),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mevcut şifre gereklidir"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Şifre tekrarı gereklidir"),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Şifreler eşleşmiyor",
        path: ["confirmPassword"],
      });
    }

    if (data.currentPassword === data.newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Yeni şifre mevcut şifreden farklı olmalıdır",
        path: ["newPassword"],
      });
    }
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
