import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const MAX_BYTES = 5 * 1024 * 1024;

export type PaslonImageKind = "foto" | "visi-misi";

export function uploadsRoot() {
  return path.join(process.cwd(), "uploads");
}

export function paslonUploadDir() {
  return path.join(uploadsRoot(), "paslon");
}

function filenameFor(nomor: string, kind: PaslonImageKind, ext: string) {
  return kind === "foto" ? `${nomor}${ext}` : `${nomor}-visi-misi${ext}`;
}

export async function savePaslonImage(
  nomor: string,
  file: File,
  kind: PaslonImageKind
): Promise<string> {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new Error("Format gambar harus JPG, PNG, WEBP, atau GIF");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Ukuran gambar maksimal 5 MB");
  }

  const dir = paslonUploadDir();
  await mkdir(dir, { recursive: true });

  const filename = filenameFor(nomor, kind, ext);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `/api/uploads/paslon/${filename}`;
}

export async function deletePaslonUploadFile(
  url: string | null | undefined
) {
  if (!url?.startsWith("/api/uploads/paslon/")) return;
  const filename = path.basename(url);
  if (!filename || filename.includes("..")) return;
  try {
    await unlink(path.join(paslonUploadDir(), filename));
  } catch {
    // ignore missing file
  }
}
