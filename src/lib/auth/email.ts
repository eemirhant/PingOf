/**
 * Email delivery for password reset links.
 * v1: without RESEND_API_KEY, logs the link to the server console (dev-friendly).
 * With RESEND_API_KEY set, sends a real email via Resend API.
 */

type SendPasswordResetEmailParams = {
  to: string;
  resetUrl: string;
};

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: SendPasswordResetEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "PingOf <onboarding@resend.dev>";

  if (!apiKey) {
    console.info("\n========== PingOf — Şifre Sıfırlama Linki ==========");
    console.info(`Alıcı: ${to}`);
    console.info(`Link : ${resetUrl}`);
    console.info("===================================================\n");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "PingOf — Şifre sıfırlama",
      html: `
        <p>Merhaba,</p>
        <p>Şifreni sıfırlamak için aşağıdaki linke tıkla. Link <strong>1 saat</strong> geçerlidir ve yalnızca bir kez kullanılabilir.</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.</p>
        <p>— PingOf</p>
      `,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("Resend email failed:", response.status, body);
    throw new Error("E-posta gönderilemedi");
  }
}
