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
    console.error("[Blob Debug] file missing or empty", {
      isFile: file instanceof File,
      fileSize: file instanceof File ? file.size : null,
    });
    throw new ImageUploadError("Dosya seçilmedi");
  }

  const mime = file.type;
  if (!ALLOWED_MIME.has(mime)) {
    console.error("[Blob Debug] mime validation failed / unsupported extension", {
      mimeType: mime,
      extension: EXT_BY_MIME[mime] ?? "unsupported",
    });
    throw new ImageUploadError("Sadece JPG, PNG, WebP veya AVIF yükleyebilirsin");
  }

  if (file.size > MAX_RAW_BYTES) {
    console.error("[Blob Debug] file too large", {
      fileSize: file.size,
      maxBytes: MAX_RAW_BYTES,
    });
    throw new ImageUploadError("Dosya en fazla 2 MB olabilir");
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch (error) {
    console.error("[Blob Debug] buffer conversion failed", error);
    if (error instanceof Error) {
      console.error("[Blob Debug] buffer conversion failed details", {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause,
        serialized: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
    }
    throw error;
  }

  if (!looksLikeImage(buffer, mime)) {
    console.error("[Blob Debug] magic byte validation failed", {
      mimeType: mime,
      bufferLength: buffer.length,
    });
    throw new ImageUploadError("Geçersiz görsel dosyası");
  }

  if (!hasBlobToken()) {
    console.error("[Blob Debug] missing blob token before put()", {
      hasBlobToken: false,
      tokenLength: tokenRaw?.length ?? 0,
    });
    console.error("[BLOB] Missing BLOB_READ_WRITE_TOKEN");
    throw new ImageUploadError(USER_FACING_UNAVAILABLE);
  }

  const ext = EXT_BY_MIME[mime] ?? "jpg";
  const filename = `${randomUUID()}-${Date.now()}.${ext}`;
  const objectPath = `${folder}/${filename}`;

  console.log("[Blob Debug] Calling put()", {
    objectPath,
    mimeType: mime,
    bufferLength: buffer.length,
  });

  try {
    const blob = await put(objectPath, buffer, {
      access: "public",
      contentType: mime,
      addRandomSuffix: false,
    });
    console.log("[Blob Debug] Upload success", {
      pathname: blob.pathname,
      url: blob.url,
    });
    return blob.url;
  } catch (error) {
    console.error("[Blob Debug] put() failed — raw error", error);
    if (error instanceof Error) {
      console.error("[Blob Debug] put() failed — name", error.name);
      console.error("[Blob Debug] put() failed — message", error.message);
      console.error("[Blob Debug] put() failed — stack", error.stack);
      console.error("[Blob Debug] put() failed — cause", error.cause);
      console.error(
        "[Blob Debug] put() failed — serialized",
        JSON.stringify(error, Object.getOwnPropertyNames(error)),
      );
    } else {
      console.error(
        "[Blob Debug] put() failed — non-Error serialized",
        JSON.stringify(error, error !== null && typeof error === "object" ? Object.getOwnPropertyNames(error) : undefined),
      );
    }

    throw new ImageUploadError("Fotoğraf depolanamadı. Lütfen tekrar dene.");
  }
}
