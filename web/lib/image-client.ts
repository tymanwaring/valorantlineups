"use client";

/**
 * Client-side image helpers used by the steps editor. Screenshots pasted from
 * the clipboard are large PNGs; we downscale + re-encode to WebP before upload
 * to save storage/bandwidth. All of this runs in the browser.
 */

type CompressOptions = {
  /** Longest edge in pixels; larger images are scaled down to fit. */
  maxDim?: number;
  /** WebP quality 0–1. */
  quality?: number;
};

async function loadBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall through to the <img> path.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = document.createElement("img");
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not decode image"));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function dimsOf(src: ImageBitmap | HTMLImageElement): {
  w: number;
  h: number;
} {
  if ("width" in src && "height" in src) {
    const w =
      (src as HTMLImageElement).naturalWidth || (src as ImageBitmap).width;
    const h =
      (src as HTMLImageElement).naturalHeight || (src as ImageBitmap).height;
    return { w, h };
  }
  return { w: 0, h: 0 };
}

/**
 * Downscale to `maxDim` and re-encode as WebP. Falls back to the original file
 * when it can't help (animated GIFs, already-small images, unsupported canvas).
 */
export async function compressImage(
  file: File,
  { maxDim = 1920, quality = 0.85 }: CompressOptions = {},
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  // Preserve GIFs — canvas would flatten animation.
  if (file.type === "image/gif") return file;

  let src: ImageBitmap | HTMLImageElement;
  try {
    src = await loadBitmap(file);
  } catch {
    return file;
  }

  const { w: width, h: height } = dimsOf(src);
  if (!width || !height) return file;

  const scale = Math.min(1, maxDim / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(src as CanvasImageSource, 0, 0, w, h);
  if ("close" in src && typeof src.close === "function") src.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality),
  );
  if (!blob) return file;
  // If we didn't resize and the re-encode isn't smaller, keep the original.
  if (scale === 1 && blob.size >= file.size) return file;

  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${base}.webp`, { type: "image/webp" });
}

/**
 * Read the first image on the clipboard as a File, or null if there isn't one.
 * Throws a friendly error when the browser blocks/does not support it.
 */
export async function readClipboardImage(): Promise<File | null> {
  if (!navigator.clipboard?.read) {
    throw new Error("Your browser doesn't allow reading images from the clipboard.");
  }
  const items = await navigator.clipboard.read();
  for (const item of items) {
    const type = item.types.find((t) => t.startsWith("image/"));
    if (type) {
      const blob = await item.getType(type);
      const ext = type.split("/")[1] || "png";
      return new File([blob], `clipboard.${ext}`, { type });
    }
  }
  return null;
}

/** Assign a File to a file <input> so it submits with the form. */
export function setInputFile(input: HTMLInputElement, file: File): void {
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
}
