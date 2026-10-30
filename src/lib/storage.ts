import { supabase } from "@/integrations/supabase/client";

// 100 years - effectively permanent for private buckets
const LONG_EXPIRY = 60 * 60 * 24 * 365 * 100;

export async function uploadAndSign(
  bucket: "branding" | "modality-icons" | "project-media" | "gd-shares" | "art" | "music",
  file: File,
  folder = "",
): Promise<string> {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const safeFolder = folder.replace(/^\/+|\/+$/g, "");
  const path = `${safeFolder ? safeFolder + "/" : ""}${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (upErr) throw upErr;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, LONG_EXPIRY);
  if (error) throw error;
  return data.signedUrl;
}

/** Extrae la ruta del objeto a partir de una URL firmada, para poder borrarlo del bucket. */
export function pathFromSigned(url: string | null | undefined, bucket: string): string | null {
  if (!url) return null;
  const m = url.match(new RegExp(`/object/sign/${bucket}/([^?]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}
