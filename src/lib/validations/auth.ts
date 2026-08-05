import { z } from "zod";

import {
  PASSWORD_SPECIAL_CHAR_REGEX,
  isWeakPasswordPattern,
  passwordsMatchIdentity,
} from "@/lib/validations/password-strength";

const EMAIL_ERROR = "Geçerli bir e-posta adresi giriniz.";

/**
 * Practical RFC-inspired email check:
 * - ASCII only (rejects Turkish / non-ASCII)
 * - exactly one @
 * - local + domain with TLD required
 * - no consecutive dots, no spaces
 */
export function isValidEmailFormat(value: string): boolean {
  if (!value) return false;
  if (/\s/.test(value)) return false;
  if (/[^\x00-\x7F]/.test(value)) return false;
  if ((value.match(/@/g) ?? []).length !== 1) return false;
  if (value.includes("..")) return false;

  const [local, domain] = value.split("@");
  if (!local || !domain) return false;
  if (local.startsWith(".") || local.endsWith(".")) return false;
  if (domain.startsWith(".") || domain.endsWith(".") || domain.startsWith("-")) {
    return false;
  }
  if (!domain.includes(".")) return false;

  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)) return false;

  const labels = domain.split(".");
  if (labels.length < 2) return false;

  const tld = labels[labels.length - 1];
  if (!tld || tld.length < 2 || !/^[a-z]+$/i.test(tld)) return false;

  for (const label of labels) {
    if (!label || label.length > 63) return false;
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)) return false;
  }

  return true;
}

export const emailSchema = z
  .string({ required_error: "E-posta adresi gereklidir" })
  .transform((value) => value.trim().toLowerCase())
  .pipe(
    z
      .string()
      .min(1, "E-posta adresi gereklidir")
      .refine(isValidEmailFormat, EMAIL_ERROR),
  );

export const passwordSchema = z
  .string({ required_error: "Şifre gereklidir" })
  .min(1, "Şifre gereklidir")
  .min(8, "Şifre en az 8 karakter olmalıdır")
  .refine((value) => !/\s/.test(value), {
    message: "Şifrede boşluk karakteri kullanılamaz",
  })
  .refine((value) => /[A-Z]/.test(value), {
    message: "En az bir büyük harf kullanılmalıdır",
  })
  .refine((value) => /[a-z]/.test(value), {
    message: "En az bir küçük harf kullanılmalıdır",
  })
  .refine((value) => /[0-9]/.test(value), {
    message: "En az bir rakam kullanılmalıdır",
  })
  .refine((value) => PASSWORD_SPECIAL_CHAR_REGEX.test(value), {
    message: "En az bir özel karakter kullanılmalıdır",
  })
  .refine((value) => !isWeakPasswordPattern(value), {
    message: "Bu şifre çok zayıf. Daha güçlü bir şifre seçin",
  });

function refinePasswordNotIdentity<
  T extends { password: string; email?: string; fullName?: string },
>(data: T, ctx: z.RefinementCtx, passwordPath: string = "password") {
  if (passwordsMatchIdentity(data.password, data.email)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Şifre e-posta ile aynı olamaz",
      path: [passwordPath],
    });
  }

  if (passwordsMatchIdentity(data.password, data.fullName)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Şifre kullanıcı adı ile aynı olamaz",
      path: [passwordPath],
    });
  }
}

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Şifre gereklidir"),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(1, "Ad soyad gereklidir")
      .min(2, "Ad soyad en az 2 karakter olmalıdır"),
    email: emailSchema,
    organizationName: z
      .string()
      .min(1, "Organizasyon adı gereklidir")
      .min(2, "Organizasyon adı en az 2 karakter olmalıdır"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Şifre tekrarı gereklidir"),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Şifreler eşleşmiyor",
        path: ["confirmPassword"],
      });
    }
    refinePasswordNotIdentity(data, ctx);
  });

export const joinSchema = z
  .object({
    inviteCode: z.string().min(1, "Davet kodu gereklidir"),
    fullName: z
      .string()
      .min(1, "Ad soyad gereklidir")
      .min(2, "Ad soyad en az 2 karakter olmalıdır"),
    email: emailSchema,
    password: passwordSchema,
  })
  .superRefine((data, ctx) => {
    refinePasswordNotIdentity(data, ctx);
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Geçersiz sıfırlama linki"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Şifre tekrarı gereklidir"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Şifreler eşleşmiyor",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type JoinInput = z.infer<typeof joinSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
