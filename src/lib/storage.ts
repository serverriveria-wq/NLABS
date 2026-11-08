import { supabase } from "@/integrations/supabase/client";

// 100 years - effectively permanent for private buckets
const LONG_EXPIRY = 60 * 60 * 24 * 365 * 100;

/** Reduce imágenes grandes (máx. 2560 px y ~2 MB) para evitar "Failed to fetch" por tamaño. GIF/SVG no se tocan. */
async function prepareImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 2 * 1024 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2560 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const keepPng = file.type === "image/png";
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, keepPng ? "image/webp" : "image/jpeg", 0.88));
    if (!blob || blob.size >= file.size) return file;
    const ext = keepPng ? "webp" : "jpg";
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + "." + ext, { type: blob.type });
  } catch { return file; }
}

const MAX_BYTES = 50 * 1024 * 1024;

function friendly(err: unknown): Error {
  const m = String((err as { message?: string })?.message ?? err);
  if (/failed to fetch|networkerror|load failed/i.test(m)) return new Error("No se pudo subir el archivo: es demasiado grande o se cortó la conexión. Prueba con uno más pequeño (máx. 50 MB).");
  if (/bucket not found/i.test(m)) return new Error("Falta el bucket de almacenamiento. Ejecuta supabase/migration_v5.sql en Supabase.");
  if (/row-level security|not allowed|unauthorized|403/i.test(m)) return new Error("Sin permiso para subir aquí. Ejecuta supabase/migration_v5.sql en Supabase.");
  return err instanceof Error ? err : new Error(m);
}

export async function uploadAndSign(
  bucket: "branding" | "modality-icons" | "project-media" | "gd-shares" | "art" | "music",
  file: File,
  folder = "",
): Promise<string> {
  file = await prepareImage(file);
  if (file.size > MAX_BYTES) throw new Error("El archivo pesa más de 50 MB.");
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const safeFolder = folder.replace(/^\/+|\/+$/g, "");
  const path = `${safeFolder ? safeFolder + "/" : ""}${crypto.randomUUID()}.${ext}`;
  try {
    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (upErr) throw upErr;
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, LONG_EXPIRY);
    if (error) throw error;
    return data.signedUrl;
  } catch (e) { throw friendly(e); }
}

/** Extrae la ruta del objeto a partir de una URL firmada, para poder borrarlo del bucket. */
export function pathFromSigned(url: string | null | undefined, bucket: string): string | null {
  if (!url) return null;
  const m = url.match(new RegExp(`/object/sign/${bucket}/([^?]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}
