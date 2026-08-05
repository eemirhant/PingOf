"use server";

import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/auth";
import { sendPasswordResetEmail } from "@/lib/auth/email";
import {
  PasswordResetError,
  createPasswordResetToken,
  resetPasswordWithToken,
} from "@/lib/auth/password-reset";
import { RegisterError, registerOrganization } from "@/lib/auth/register";
import { getRequestOrigin } from "@/lib/dev/public-url";
import { toSafeInternalPath } from "@/lib/url/safe-path";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
} from "@/lib/validations/auth";

export type ActionFieldErrors = Partial<Record<string, string[]>>;

export type AuthActionState = {
  error?: string;
  success?: string;
  fieldErrors?: ActionFieldErrors;
};

function zodFieldErrors(error: { flatten: () => { fieldErrors: ActionFieldErrors } }) {
  return error.flatten().fieldErrors;
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const raw: LoginInput = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };

  const parsed = loginSchema.safeParse(raw);

  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error) };
  }

  try {
    const result = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });

    if (result?.error) {
      return { error: "E-posta veya şifre hatalı" };
    }
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError) {
      return { error: "E-posta veya şifre hatalı" };
    }
    console.error("[auth] loginAction failed", error);
    return {
      error: "Giriş şu an yapılamıyor. Lütfen biraz sonra tekrar deneyin.",
    };
  }

  redirect(toSafeInternalPath(formData.get("callbackUrl"), "/"));
}

export async function registerAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const raw: RegisterInput = {
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    organizationName: String(formData.get("organizationName") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };

  const parsed = registerSchema.safeParse(raw);

  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error) };
  }

  try {
    await registerOrganization(parsed.data);
  } catch (error) {
    if (error instanceof RegisterError) {
      if (error.field && error.field !== "root") {
        return { fieldErrors: { [error.field]: [error.message] } };
      }
      return { error: error.message };
    }

    return { error: "Kayıt işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin." };
  }

  try {
    const result = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });

    if (result?.error) {
      return {
        error:
          "Hesap oluşturuldu ancak otomatik giriş yapılamadı. Lütfen giriş sayfasından deneyin.",
      };
    }
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("[auth] registerAction auto-login failed", error);
    return {
      error:
        "Hesap oluşturuldu ancak otomatik giriş yapılamadı. Lütfen giriş sayfasından deneyin.",
    };
  }

  redirect("/");
}

export async function forgotPasswordAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const raw: ForgotPasswordInput = {
    email: String(formData.get("email") ?? ""),
  };

  const parsed = forgotPasswordSchema.safeParse(raw);

  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error) };
  }

  const successMessage =
    "E-posta adresin sistemde kayıtlıysa sıfırlama linki gönderildi. Gelen kutunu kontrol et.";

  try {
    const result = await createPasswordResetToken(parsed.data.email);

    if (result) {
      const baseUrl = await getRequestOrigin();
      const resetUrl = `${baseUrl}/reset-password/${result.rawToken}`;
      await sendPasswordResetEmail({ to: result.email, resetUrl });
    }
  } catch (error) {
    console.error("forgotPasswordAction error:", error);
  }

  return { success: successMessage };
}

export async function resetPasswordAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const raw: ResetPasswordInput = {
    token: String(formData.get("token") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };

  const parsed = resetPasswordSchema.safeParse(raw);

  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error) };
  }

  try {
    await resetPasswordWithToken(parsed.data.token, parsed.data.password);
  } catch (error) {
    if (error instanceof PasswordResetError) {
      return { error: error.message };
    }
    return { error: "Şifre sıfırlanırken bir hata oluştu. Lütfen tekrar deneyin." };
  }

  redirect("/login?reset=success");
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
