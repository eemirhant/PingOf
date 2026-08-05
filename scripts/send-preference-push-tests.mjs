/**
 * Live push smoke test for every managed notification preference.
 * Usage: node --import tsx scripts/send-preference-push-tests.mjs
 * Or: npx tsx scripts/send-preference-push-tests.mjs
 *
 * Sends real OneSignal + in-app notifications to the first user who has
 * an active ChromePush subscription (or EXTERNAL_USER_ID env override).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnv() {
  const env = {};
  const raw = fs.readFileSync(path.join(root, ".env"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[t.slice(0, i).trim()] = v;
  }
  return env;
}

const MANAGED = [
  ["CHALLENGE_RECEIVED", "Bana yeni meydan okuması gönderildi"],
  ["CHALLENGE_ACCEPTED", "Gönderdiğim meydan okuması kabul edildi"],
  ["CHALLENGE_DECLINED", "Gönderdiğim meydan okuması reddedildi"],
  ["CHALLENGE_CANCELLED", "Meydan okuması iptal edildi"],
  ["MATCH_CREATED", "Yeni maç oluşturuldu"],
  ["MATCH_SCHEDULE_CHANGED", "Maç tarihi veya saati değişti"],
  ["MATCH_REMINDER", "Maç başlamadan önce hatırlatma"],
  ["MATCH_CANCELLED", "Maç iptal edildi"],
  ["MATCH_RESULT", "Maç sonucu girildi"],
  ["TOURNAMENT_ADDED", "Yeni turnuvaya eklendim"],
  ["TOURNAMENT_STARTED", "Turnuva başladı"],
  ["TOURNAMENT_MATCH_READY", "Yeni rakibim belli oldu"],
  ["TOURNAMENT_MATCH_CREATED", "Turnuva maçı oluşturuldu"],
  ["TOURNAMENT_COMPLETED", "Turnuva tamamlandı"],
  ["LEADERBOARD_RANK_CHANGED", "Sıralamam değişti"],
  ["LEADERBOARD_TOP3", "İlk 3'e girdim"],
  ["LEADERBOARD_STREAK", "Yeni galibiyet serisi oluşturdum"],
];

const env = loadEnv();
const appId = env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
const apiKey = env.ONESIGNAL_REST_API_KEY;
const authUrl = (env.AUTH_URL || "http://localhost:3000").replace(/\/$/, "");

if (!appId || !apiKey) {
  console.error("OneSignal env eksik");
  process.exit(1);
}

const prisma = new PrismaClient();

async function lookupUser(externalId) {
  const res = await fetch(
    `https://api.onesignal.com/apps/${encodeURIComponent(appId)}/users/by/external_id/${encodeURIComponent(externalId)}`,
    { headers: { Authorization: `Key ${apiKey}` } },
  );
  if (!res.ok) return null;
  const json = await res.json();
  const push = (json.subscriptions ?? []).find(
    (s) => s.type === "ChromePush" && s.enabled && s.token,
  );
  return push ? { onesignalId: json.identity?.onesignal_id, push } : null;
}

async function sendPush(externalId, type, label) {
  const body = {
    app_id: appId,
    target_channel: "push",
    include_aliases: { external_id: [externalId] },
    headings: { en: "PingOf test", tr: "PingOf test" },
    contents: {
      en: label,
      tr: label,
    },
    url: `${authUrl}/notifications`,
    data: { url: "/notifications", tag: `pingof-test-${type}` },
  };

  const started = Date.now();
  const res = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return {
    ok: res.ok && Boolean(json?.id),
    status: res.status,
    id: json?.id ?? null,
    errors: json?.errors ?? null,
    ms: Date.now() - started,
  };
}

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, fullName: true },
    orderBy: { createdAt: "asc" },
  });

  let targetId = process.env.EXTERNAL_USER_ID?.trim() || null;
  let targetName = "";

  if (targetId) {
    const u = users.find((x) => x.id === targetId);
    targetName = u?.fullName ?? targetId;
  } else {
    for (const u of users) {
      const hit = await lookupUser(u.id);
      if (hit) {
        targetId = u.id;
        targetName = u.fullName;
        console.log(
          `Abone bulundu: ${u.fullName} (${u.id.slice(0, 8)}…) sub=${hit.push.id}`,
        );
        break;
      }
    }
  }

  if (!targetId) {
    console.error(
      "OneSignal abonesi bulunamadı. localhost’ta giriş yapıp bildirim izni ver, sonra tekrar dene.",
    );
    process.exit(1);
  }

  // Force prefs on for this user so in-app path also works if we use create later
  const prefMap = Object.fromEntries(
    MANAGED.map(([type]) => [type, { inApp: true, push: true }]),
  );
  await prisma.userNotificationSettings.upsert({
    where: { userId: targetId },
    create: { userId: targetId, preferences: prefMap },
    update: { preferences: prefMap },
  });

  console.log(`\nHedef: ${targetName} / ${targetId}`);
  console.log(`Toplam ${MANAGED.length} push gönderilecek (≈1.2s aralık)\n`);

  const results = [];
  for (const [type, label] of MANAGED) {
    // Also write in-app notification
    await prisma.notification.create({
      data: {
        userId: targetId,
        type,
        title: `Test: ${label}`,
        body: `Bildirim tercihi testi — ${type}`,
        linkUrl: "/notifications",
        isRead: false,
      },
    });

    const push = await sendPush(targetId, type, `Test: ${label}`);
    const row = { type, label, ...push };
    results.push(row);
    console.log(
      push.ok
        ? `✓ ${type} → ${push.id} (${push.ms}ms)`
        : `✗ ${type} HTTP ${push.status} ${JSON.stringify(push.errors)}`,
    );
    await new Promise((r) => setTimeout(r, 1200));
  }

  const ok = results.filter((r) => r.ok).length;
  console.log(`\nSonuç: ${ok}/${results.length} push başarılı`);
  console.log(
    "Bilgisayarında masaüstü bildirimlerini ve /notifications sayfasını kontrol et.",
  );

  await prisma.$disconnect();
  process.exit(ok === results.length ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
