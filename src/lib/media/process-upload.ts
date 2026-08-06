/**
 * Image upload helpers for avatars / org logos via Vercel Blob.
 */

import { put } from "@vercel/blob";
import { randomUUID } from "crypto";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);
const MAX_RAW_BYTES = 2 * 1024 * 1024; // 2MB

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const USER_FACING_UNAVAILABLE = "Dosya yükleme şu anda kullanılamıyor.";

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
  if (mime === "image/avif") {
    if (buffer.length < 12) return false;
    if (buffer.toString("ascii", 4, 8) !== "ftyp") return false;
    const brandRegion = buffer.toString("ascii", 8, Math.min(buffer.length, 32));
    return brandRegion.includes("avif") || brandRegion.includes("avis");
  }
  return false;
}

export type UploadFolder = "avatars" | "logos";

function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

/**
 * Validate and save an uploaded image to Vercel Blob.
 * Returns the public Blob URL — never a data URL.
 */
export async function saveUploadedImage(
  file: File,
  folder: UploadFolder,
  _key: string,
): Promise<string> {
  void _key;

  if (!(file instanceof File) || file.size <= 0) {
    throw new ImageUploadError("Dosya seçilmedi");
  }

  const mime = file.type;
  if (!ALLOWED_MIME.has(mime)) {
    throw new ImageUploadError("Sadece JPG, PNG, WebP veya AVIF yükleyebilirsin");
  }

  if (file.size > MAX_RAW_BYTES) {
    throw new ImageUploadError("Dosya en fazla 2 MB olabilir");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!looksLikeImage(buffer, mime)) {
    throw new ImageUploadError("Geçersiz görsel dosyası");
  }

  if (!hasBlobToken()) {
    console.error("[BLOB] Missing BLOB_READ_WRITE_TOKEN");
    throw new ImageUploadError(USER_FACING_UNAVAILABLE);
  }

  const ext = EXT_BY_MIME[mime] ?? "jpg";
  const filename = `${randomUUID()}-${Date.now()}.${ext}`;
  const objectPath = `${folder}/${filename}`;

  console.log("[Blob Debug]", {
    hasToken: !!process.env.BLOB_READ_WRITE_TOKEN,
    tokenPrefix: process.env.BLOB_READ_WRITE_TOKEN?.slice(0, 18),
    filename,
    mimeType: mime,
    size: file.size,
    extension: ext,
  });

  try {
    const blob = await put(objectPath, buffer, {
      access: "public",
      contentType: mime,
      addRandomSuffix: false,
    });
    console.log("[Blob Upload Success]", blob.url);
    return blob.url;
  } catch (error) {
    const err = error as {
      name?: string;
      message?: string;
      stack?: string;
      status?: number;
      code?: string | number;
      response?: unknown;
      body?: unknown;
      cause?: unknown;
    };

    console.error("[BLOB] put failed — diagnostic", {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
      status: err?.status,
      code: err?.code,
      responseBody: err?.response ?? err?.body ?? undefined,
      cause: err?.cause,
    });
    console.error("[BLOB] put failed — original error object", error);

    throw new ImageUploadError("Fotoğraf depolanamadı. Lütfen tekrar dene.");
  }
}
