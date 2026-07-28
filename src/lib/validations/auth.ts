import { z } from "zod";

export const emailSchema = z
  .string()
  .min(1, "E-posta adresi gereklidir")
  .email("Geçerli bir e-posta adresi girin");

export const passwordSchema = z
  .string()
  .min(1, "Şifre gereklidir")
  .min(8, "Şifre en az 8 karakter olmalıdır");

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
  .refine((data) => data.password === data.confirmPassword, {
    message: "Şifreler eşleşmiyor",
    path: ["confirmPassword"],
  });

export const joinSchema = z.object({
  inviteCode: z.string().min(1, "Davet kodu gereklidir"),
  fullName: z
    .string()
    .min(1, "Ad soyad gereklidir")
    .min(2, "Ad soyad en az 2 karakter olmalıdır"),
  email: emailSchema,
  password: passwordSchema,
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
