import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { validatePasswordResetToken } from "@/lib/auth/password-reset";

type ResetPasswordPageProps = {
  params: Promise<{ token: string }>;
};

export default async function ResetPasswordPage({ params }: ResetPasswordPageProps) {
  const { token } = await params;
  const record = await validatePasswordResetToken(token);

  return <ResetPasswordForm token={token} isValid={Boolean(record)} />;
}
