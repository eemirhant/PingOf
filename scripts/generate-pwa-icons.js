/**
 * Generate PingOf PWA PNG icons (no external deps).
 * Run: node scripts/generate-pwa-icons.js
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const OUT = path.join(__dirname, "..", "public", "icons");

const BG = [10, 11, 15, 255]; // #0a0b0f
const ACCENT = [99, 102, 241, 255]; // #6366f1
const WHITE = [241, 245, 249, 255]; // #f1f5f9
const PURPLE = [168, 85, 247, 255];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function setPixel(rgba, w, x, y, color) {
  if (x < 0 || y < 0 || x >= w || y >= w) return;
  const i = (y * w + x) * 4;
  rgba[i] = color[0];
  rgba[i + 1] = color[1];
  rgba[i + 2] = color[2];
  rgba[i + 3] = color[3];
}

function fillRect(rgba, w, x0, y0, x1, y1, color) {
  const xa = Math.max(0, Math.floor(x0));
  const ya = Math.max(0, Math.floor(y0));
  const xb = Math.min(w - 1, Math.ceil(x1));
  const yb = Math.min(w - 1, Math.ceil(y1));
  for (let y = ya; y <= yb; y++) {
    for (let x = xa; x <= xb; x++) setPixel(rgba, w, x, y, color);
  }
}

function fillCircle(rgba, w, cx, cy, r, color) {
  const r2 = r * r;
  const x0 = Math.floor(cx - r);
  const y0 = Math.floor(cy - r);
  const x1 = Math.ceil(cx + r);
  const y1 = Math.ceil(cy + r);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r2) setPixel(rgba, w, x, y, color);
    }
  }
}

function fillRing(rgba, w, cx, cy, rOuter, rInner, color) {
  const ro2 = rOuter * rOuter;
  const ri2 = rInner * rInner;
  const x0 = Math.floor(cx - rOuter);
  const y0 = Math.floor(cy - rOuter);
  const x1 = Math.ceil(cx + rOuter);
  const y1 = Math.ceil(cy + rOuter);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 <= ro2 && d2 >= ri2) setPixel(rgba, w, x, y, color);
    }
  }
}

/** Draw PingOf mark: dark bg, indigo rounded plate, white table-tennis disc + purple accent. */
function renderIcon(size, { maskable }) {
  const rgba = Buffer.alloc(size * size * 4);
  // Full canvas background (maskable needs safe padding — keep edge as bg)
  fillRect(rgba, size, 0, 0, size, size, BG);

  const pad = maskable ? size * 0.18 : size * 0.08;
  const plate = size - pad * 2;
  const cx = size / 2;
  const cy = size / 2;
  const plateR = plate / 2;

  // Soft gradient-ish plate: accent circle + purple offset glow
  fillCircle(rgba, size, cx + plateR * 0.15, cy - plateR * 0.1, plateR * 0.95, PURPLE);
  fillCircle(rgba, size, cx, cy, plateR * 0.92, ACCENT);

  // Ball (white) with seam hint
  const ballR = plateR * 0.28;
  fillCircle(rgba, size, cx - plateR * 0.22, cy + plateR * 0.08, ballR, WHITE);
  fillRing(
    rgba,
    size,
    cx - plateR * 0.22,
    cy + plateR * 0.08,
    ballR * 0.55,
    ballR * 0.35,
    ACCENT,
  );

  // Paddle oval
  const px = cx + plateR * 0.28;
  const py = cy - plateR * 0.05;
  const prx = plateR * 0.34;
  const pry = plateR * 0.42;
  for (let y = Math.floor(py - pry); y <= Math.ceil(py + pry); y++) {
    for (let x = Math.floor(px - prx); x <= Math.ceil(px + prx); x++) {
      const dx = (x + 0.5 - px) / prx;
      const dy = (y + 0.5 - py) / pry;
      if (dx * dx + dy * dy <= 1) setPixel(rgba, size, x, y, WHITE);
    }
  }
  // Handle
  fillRect(
    rgba,
    size,
    px + prx * 0.35,
    py + pry * 0.55,
    px + prx * 0.95,
    py + pry * 1.15,
    WHITE,
  );

  return encodePng(size, size, rgba);
}

function write(name, buf) {
  const file = path.join(OUT, name);
  fs.writeFileSync(file, buf);
  console.log("wrote", file, buf.length, "bytes");
}

fs.mkdirSync(OUT, { recursive: true });

write("icon-192.png", renderIcon(192, { maskable: false }));
write("icon-512.png", renderIcon(512, { maskable: false }));
write("icon-maskable-192.png", renderIcon(192, { maskable: true }));
write("icon-maskable-512.png", renderIcon(512, { maskable: true }));
write("apple-touch-icon.png", renderIcon(180, { maskable: false }));

console.log("PWA icons ready.");
