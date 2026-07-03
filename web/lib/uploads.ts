import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { put, del } from "@vercel/blob";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const blobEnabled = !!process.env.BLOB_READ_WRITE_TOKEN;

function safeExt(name: string): string {
  const ext = path.extname(name) || ".png";
  return /^\.(png|jpg|jpeg|gif|webp)$/i.test(ext) ? ext : ".png";
}

export async function saveUpload(
  file: File | null,
): Promise<string | undefined> {
  if (!file || file.size === 0) return undefined;
  const filename = `${randomUUID()}${safeExt(file.name)}`;

  if (blobEnabled) {
    const blob = await put(`lineups/${filename}`, file, {
      access: "public",
      addRandomSuffix: false,
    });
    return blob.url;
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
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
