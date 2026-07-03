import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { put, del } from "@vercel/blob";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const blobEnabled = !!process.env.BLOB_READ_WRITE_TOKEN;

/** Reject anything larger than this to avoid huge/abusive uploads. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

/** Thrown on a rejected upload; API routes translate this into a 400. */
export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

/**
 * Sniff the real image type from the file's leading bytes instead of trusting
 * the client-supplied name/MIME. Returns the canonical extension or null.
 */
function detectImageExt(buf: Buffer): string | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  )) {
    return ".png";
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return ".jpg";
  }
  if (buf.length >= 4 && buf.subarray(0, 4).toString("ascii") === "GIF8") {
    return ".gif";
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return ".webp";
  }
  return null;
}

export async function saveUpload(
  file: File | null,
): Promise<string | undefined> {
  if (!file || file.size === 0) return undefined;

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(
      `Image is too large (max ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB).`,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = detectImageExt(buffer);
  if (!ext) {
    throw new UploadError(
      "Unsupported file type. Upload a PNG, JPEG, GIF, or WebP image.",
    );
  }

  const filename = `${randomUUID()}${ext}`;

  if (blobEnabled) {
    const blob = await put(`lineups/${filename}`, buffer, {
      access: "public",
      addRandomSuffix: false,
    });
    return blob.url;
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return `/uploads/${filename}`;
}

export async function deleteUpload(publicPath?: string): Promise<void> {
  if (!publicPath) return;

  // Vercel Blob URLs are absolute (https://...); local uploads start with /uploads/.
  if (blobEnabled && /^https?:\/\//.test(publicPath)) {
    try {
      await del(publicPath);
    } catch {
      // Already gone; ignore.
    }
    return;
  }

  if (!publicPath.startsWith("/uploads/")) return;
  const filename = path.basename(publicPath);
  try {
    await fs.unlink(path.join(UPLOAD_DIR, filename));
  } catch {
    // File already gone; ignore.
  }
}
