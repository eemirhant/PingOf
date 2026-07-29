import webpush from "web-push";

export type VapidConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

let configured = false;

export function getVapidPublicKey(): string | null {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  return key || null;
}

export function getVapidConfig(): VapidConfig | null {
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ||
    process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject =
    process.env.VAPID_SUBJECT?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    "mailto:noreply@pingof.local";

  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

/** Configure web-push once per process when keys are present. */
export function ensureWebPushConfigured(): VapidConfig | null {
  const config = getVapidConfig();
  if (!config) return null;
  if (!configured) {
    webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
    configured = true;
  }
  return config;
}
