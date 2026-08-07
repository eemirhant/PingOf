/**
 * Sync all favicon / PWA / App Router icons from the official PingOf logo.
 * Source of truth: public/brand/pingof-icon.png (seeded from icon-512.png once).
 *
 * Run: node scripts/sync-brand-icons.js
 * (also wired as npm run pwa:icons)
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const BRAND_DIR = path.join(ROOT, "public", "brand");
const CANONICAL = path.join(BRAND_DIR, "pingof-icon.png");
const LEGACY_SOURCE = path.join(ROOT, "public", "icons", "icon-512.png");
const ICONS_DIR = path.join(ROOT, "public", "icons");
const PUBLIC = path.join(ROOT, "public");
const APP_DIR = path.join(ROOT, "src", "app");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function resolveSource() {
  if (fs.existsSync(CANONICAL)) return CANONICAL;
  if (fs.existsSync(LEGACY_SOURCE)) return LEGACY_SOURCE;
  console.error("Missing brand logo. Expected:", CANONICAL);
  process.exit(1);
}

async function resizePng(source, size, outPath, { paddingRatio = 0 } = {}) {
  if (paddingRatio <= 0) {
    await sharp(source)
      .resize(size, size, { fit: "cover", position: "centre" })
      .png()
      .toFile(outPath);
    return;
  }

  // Maskable: keep logo in safe zone (~80% of canvas).
  const inner = Math.round(size * (1 - paddingRatio * 2));
  const logo = await sharp(source)
    .resize(inner, inner, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  const { data } = await sharp(source)
    .resize(1, 1, { fit: "cover" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bg = { r: data[0], g: data[1], b: data[2], alpha: 1 };

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: bg,
    },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png()
    .toFile(outPath);
}

/** Build a multi-size .ico with embedded PNGs (modern browsers). */
function buildIco(pngBuffersWithSize) {
  const count = pngBuffersWithSize.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  let offset = 6 + count * 16;
  const parts = [header];

  for (const { size, png } of pngBuffersWithSize) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    parts.push(entry);
    offset += png.length;
  }

  for (const { png } of pngBuffersWithSize) {
    parts.push(png);
  }

  return Buffer.concat(parts);
}

async function main() {
  ensureDir(BRAND_DIR);
  ensureDir(ICONS_DIR);
  ensureDir(APP_DIR);

  // Promote legacy icon-512 to canonical brand asset once.
  if (!fs.existsSync(CANONICAL) && fs.existsSync(LEGACY_SOURCE)) {
    fs.copyFileSync(LEGACY_SOURCE, CANONICAL);
    console.log("seeded canonical brand logo →", CANONICAL);
  }

  const source = resolveSource();
  const version = String(Math.floor(fs.statSync(source).mtimeMs));

  console.log("Source:", source);
  console.log("Version:", version);

  // PWA / public icons
  await resizePng(source, 192, path.join(ICONS_DIR, "icon-192.png"));
  await resizePng(source, 512, path.join(ICONS_DIR, "icon-512.png"));
  await resizePng(source, 192, path.join(ICONS_DIR, "icon-maskable-192.png"), {
    paddingRatio: 0.1,
  });
  await resizePng(source, 512, path.join(ICONS_DIR, "icon-maskable-512.png"), {
    paddingRatio: 0.1,
  });
  await resizePng(source, 180, path.join(ICONS_DIR, "apple-touch-icon.png"));

  // Next.js App Router conventions
  await resizePng(source, 512, path.join(APP_DIR, "icon.png"));
  await resizePng(source, 180, path.join(APP_DIR, "apple-icon.png"));

  // Remove legacy emoji SVG so App Router uses icon.png
  const legacySvg = path.join(APP_DIR, "icon.svg");
  if (fs.existsSync(legacySvg)) {
    fs.unlinkSync(legacySvg);
    console.log("removed", legacySvg);
  }

  // favicon.ico (16 / 32 / 48)
  const icoParts = [];
  for (const size of [16, 32, 48]) {
    const png = await sharp(source)
      .resize(size, size, { fit: "cover", position: "centre" })
      .png()
      .toBuffer();
    icoParts.push({ size, png });
  }
  const ico = buildIco(icoParts);
  fs.writeFileSync(path.join(PUBLIC, "favicon.ico"), ico);
  fs.writeFileSync(path.join(APP_DIR, "favicon.ico"), ico);

  fs.writeFileSync(
    path.join(ICONS_DIR, "icon-version.json"),
    JSON.stringify(
      { version, generatedAt: new Date().toISOString() },
      null,
      2,
    ),
  );

  // Keep manifest icon URLs cache-busted in sync with generated assets.
  const manifestPath = path.join(PUBLIC, "manifest.webmanifest");
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (Array.isArray(manifest.icons)) {
      manifest.icons = manifest.icons.map((icon) => {
        const base = String(icon.src || "").split("?")[0];
        return { ...icon, src: `${base}?v=${version}` };
      });
      fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
      console.log("updated", manifestPath);
    }
  }

  console.log("Brand icons synced.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
