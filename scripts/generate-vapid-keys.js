#!/usr/bin/env node
/**
 * Generates VAPID keys for Web Push and prints .env lines.
 * Usage: node scripts/generate-vapid-keys.js
 */
const webpush = require("web-push");

const keys = webpush.generateVAPIDKeys();

console.log("\n# Web Push (v2) — add these to .env (never commit private key)\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY="${keys.publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${keys.privateKey}"`);
console.log(`VAPID_SUBJECT="mailto:noreply@yourdomain.com"`);
console.log("");
