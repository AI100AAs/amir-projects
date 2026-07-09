/** Max edge length for vision uploads (keeps LM Studio payloads small). */
const MAX_DIM = 1280;
const JPEG_QUALITY = 0.85;
const MAX_FILE_BYTES = 12 * 1024 * 1024; // 12 MB before compression

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

/**
 * Read a File, orient/resize via canvas, and return a JPEG data URL
 * suitable for OpenAI-compatible vision APIs.
 */
export async function compressImageToDataUrl(file: File): Promise<string> {
  if (!isImageFile(file)) {
    throw new Error("Please choose a photo (JPG, PNG, or WebP).");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("That image is larger than 12 MB. Try a smaller photo.");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight, MAX_DIM);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process image.");

    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image. Try another photo."));
    img.src = src;
  });
}

function fitWithin(w: number, h: number, max: number): { width: number; height: number } {
  if (w <= max && h <= max) return { width: w, height: h };
  const scale = max / Math.max(w, h);
  return {
    width: Math.round(w * scale),
    height: Math.round(h * scale),
  };
}
