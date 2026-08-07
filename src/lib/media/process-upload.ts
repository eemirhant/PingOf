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

  console.log("[TRACE] saveUploadedImage entered");
  console.log("[UPLOAD] START");

  const mimeType = file instanceof File ? file.type : "";
  const extension = EXT_BY_MIME[mimeType] ?? (mimeType ? "unsupported" : "unknown");
  const fileName = file instanceof File ? file.name : "(invalid)";
  const fileSize = file instanceof File ? file.size : 0;
  const tokenRaw = process.env.BLOB_READ_WRITE_TOKEN;
  const hasBlobToken = Boolean(tokenRaw?.trim());

  console.log("[Blob Debug] Upload started", {
    fileName,
    mimeType,
    extension,
    fileSize,
    isVercel: Boolean(process.env.VERCEL),
    hasBlobToken,
    tokenLength: tokenRaw?.length ?? 0,
  });

  if (!(file instanceof File) || file.size <= 0) {
    const error = new ImageUploadError("Dosya seçilmedi");
    console.error("[UPLOAD] THROW", error);
    throw error;
  }

  console.log("[UPLOAD] mime ok");
  const mime = file.type;
  if (!ALLOWED_MIME.has(mime)) {
    const error = new ImageUploadError("Sadece JPG, PNG, WebP veya AVIF yükleyebilirsin");
    console.error("[UPLOAD] THROW", error);
    throw error;
  }

  console.log("[UPLOAD] size ok");
  if (file.size > MAX_RAW_BYTES) {
    const error = new ImageUploadError("Dosya en fazla 2 MB olabilir");
    console.error("[UPLOAD] THROW", error);
    throw error;
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch (error) {
    console.error("[UPLOAD] THROW", error);
    throw error;
  }

  console.log("[UPLOAD] magic bytes ok");
  if (!looksLikeImage(buffer, mime)) {
    const error = new ImageUploadError("Geçersiz görsel dosyası");
    console.error("[UPLOAD] THROW", error);
    throw error;
  }

  if (!hasBlobToken) {
    console.error("[BLOB] Missing BLOB_READ_WRITE_TOKEN");
    const error = new ImageUploadError(USER_FACING_UNAVAILABLE);
    console.error("[UPLOAD] THROW", error);
    throw error;
  }

  const ext = EXT_BY_MIME[mime] ?? "jpg";
  const filename = `${randomUUID()}-${Date.now()}.${ext}`;
  const objectPath = `${folder}/${filename}`;

  console.log("[UPLOAD] BEFORE PUT");
  console.log("[TRACE] before blob.put");
  const tokenForDiag = process.env.BLOB_READ_WRITE_TOKEN;
  console.log({
    hasToken: !!tokenForDiag,
    tokenPrefix: tokenForDiag?.slice(0, 20),
    vercelEnv: process.env.VERCEL_ENV,
    nodeEnv: process.env.NODE_ENV,
    vercel: process.env.VERCEL,
  });
  console.log("[TRACE] token typeof", typeof tokenForDiag);
  console.log("[TRACE] token is undefined", tokenForDiag === undefined);
  console.log("[TRACE] token is null", tokenForDiag === null);
  console.log("[TRACE] token is empty string", tokenForDiag === "");
  console.log("[TRACE] token length", tokenForDiag?.length ?? null);
  console.log("[TRACE] token trimmed empty", tokenForDiag?.trim() === "");
  try {
    const blob = await put(objectPath, buffer, {
      access: "public",
      contentType: mime,
      addRandomSuffix: false,
    });
    console.log("[TRACE] blob.put success");
    console.log("[UPLOAD] AFTER PUT");
    console.log("[UPLOAD] RETURN:", "success", blob.url);
    return blob.url;
  } catch (error) {
    console.error("[TRACE] blob.put failed", error);
    console.error(error);
    if (error instanceof Error) {
      console.error("[TRACE] error.name", error.name);
      console.error("[TRACE] error.message", error.message);
      console.error("[TRACE] error.stack", error.stack);
    }
    console.error("[UPLOAD] THROW", error);
    if (error instanceof Error) {
      console.error(
        "[Blob Debug] put() failed — serialized",
        JSON.stringify(error, Object.getOwnPropertyNames(error)),
      );
    }
    const userError = new ImageUploadError("Fotoğraf depolanamadı. Lütfen tekrar dene.");
    console.error("[UPLOAD] THROW", userError);
    throw userError;
  }
}
