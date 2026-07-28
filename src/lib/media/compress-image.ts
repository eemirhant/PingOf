"use client";

/**
 * Client-side resize/compress before upload (keeps DB payloads small).
 */
export async function compressImageForUpload(
  file: File,
  options: { maxEdge?: number; quality?: number } = {},
): Promise<File> {
  const maxEdge = options.maxEdge ?? 512;
  const quality = options.quality ?? 0.82;

  if (!file.type.startsWith("image/")) {
    throw new Error("Geçersiz dosya türü");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Görsel işlenemedi");
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error("Görsel sıkıştırılamadı"));
      },
      "image/jpeg",
      quality,
    );
  });

  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
