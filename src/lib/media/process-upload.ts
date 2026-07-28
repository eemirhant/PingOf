/**
 * Image upload helpers for avatars / org logos.
 * Files are saved under public/uploads (short URLs — safe for JWT cookies).
 */

import { mkdir, writeFile } from "fs/promises";
import path from "path";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_RAW_BYTES = 2 * 1024 * 1024; // 2MB

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export class ImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageUploadError";
  }
}

function looksLikeImage(buffer: Buffer, mime: string): boolean {
  if (mime === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mime === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  if (mime === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    );
  }
  return false;
}

export type UploadFolder = "avatars" | "logos";

/**
 * Validate and save an uploaded image. Returns a short public path like
 * `/uploads/avatars/userId-timestamp.jpg` (never a data URL — those blow JWT cookies).
 */
export async function saveUploadedImage(
  file: File,
  folder: UploadFolder,
  key: string,
): Promise<string> {
  if (!(file instanceof File) || file.size <= 0) {
    throw new ImageUploadError("Dosya seçilmedi");
  }

  const mime = file.type;
  if (!ALLOWED_MIME.has(mime)) {
    throw new ImageUploadError("Sadece JPG, PNG veya WebP yükleyebilirsin");
  }

  if (file.size > MAX_RAW_BYTES) {
    throw new ImageUploadError("Dosya en fazla 2 MB olabilir");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!looksLikeImage(buffer, mime)) {
    throw new ImageUploadError("Geçersiz görsel dosyası");
  }

  const ext = EXT_BY_MIME[mime] ?? "jpg";
  const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "file";
  const filename = `${safeKey}-${Date.now()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/${folder}/${filename}`;
}

/** @deprecated Prefer saveUploadedImage — data URLs break JWT session cookies. */
export async function fileToStoredDataUrl(_file: File): Promise<string> {
  void _file;
  throw new ImageUploadError(
    "Bu yükleme yolu artık kullanılmıyor. Sayfayı yenileyip tekrar dene.",
  );
}
