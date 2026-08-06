import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

function readPrivateKey(): string | null {
  const raw = process.env.FIREBASE_PRIVATE_KEY?.trim();
  if (!raw) return null;
  return raw.replace(/\\n/g, "\n");
}

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID?.trim() &&
      process.env.FIREBASE_CLIENT_EMAIL?.trim() &&
      readPrivateKey(),
  );
}

function getOrInitApp(): App | null {
  if (!isFirebaseAdminConfigured()) return null;

  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = process.env.FIREBASE_PROJECT_ID!.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!.trim();
  const privateKey = readPrivateKey()!;

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    projectId,
  });
}

/** Singleton Firebase Admin Messaging instance (Node.js only). */
export function getFirebaseMessaging(): Messaging | null {
  const app = getOrInitApp();
  if (!app) return null;
  return getMessaging(app);
}
