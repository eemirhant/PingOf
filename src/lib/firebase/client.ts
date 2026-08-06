"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import type { Messaging } from "firebase/messaging";

import {
  getFirebaseVapidKey,
  getFirebaseWebConfig,
} from "@/lib/firebase/config";

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;

  const config = getFirebaseWebConfig();
  if (!config) return null;

  if (!app) {
    app = getApps()[0] ?? initializeApp(config);
  }
  return app;
}

/**
 * Lazily load firebase/messaging only in the browser (never on the server).
 */
export async function getFirebaseMessagingClient(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;

  const { isSupported, getMessaging } = await import("firebase/messaging");

  const supported = await isSupported().catch(() => false);
  if (!supported) return null;

  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;

  if (!messaging) {
    messaging = getMessaging(firebaseApp);
  }
  return messaging;
}

export function getClientVapidKey(): string | null {
  return getFirebaseVapidKey();
}
