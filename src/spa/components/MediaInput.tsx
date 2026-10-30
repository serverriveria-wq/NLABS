import { useState } from "react";
import { Link2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { uploadAndSign } from "@/lib/storage";

type Bucket = "branding" | "modality-icons" | "project-media" | "gd-shares";

interface Props {
  value: string | null | undefined;
  onChange: (url: string) => void;
  bucket?: Bucket;
  folder?: string;
  accept?: string;
  preview?: "image" | "audio" | "video" | "none";
  className?: string;
  placeholder?: string;
}

/**
 * Reusable media input: pick between pasting a URL or uploading from device.
 * Preview renders for images / audio / video when a URL is present.
 */
export function MediaInput({
  value,
  onChange,
  bucket = "project-media",
  folder = "misc",
  accept = "image/*",
  preview = "image",
  className = "",
  placeholder = "https://…",
}: Props) {
  const [mode, setMode] = useState<"url" | "file">("url");
  const [uploading, setUploading] = useState(false);

  async function onFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadAndSign(bucket, file, folder);
      onChange(url);
      toast.success("Archivo subido");
    } catch (e: any) {
      toast.error(e.message ?? "Error al subir");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="inline-flex rounded-lg border bg-secondary/40 p-0.5 text-xs">
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 ${mode === "url" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
        >
          <Link2 className="h-3 w-3" /> URL
        </button>
        <button
          type="button"
          onClick={() => setMode("file")}
          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 ${mode === "file" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
        >
          <Upload className="h-3 w-3" /> Dispositivo
        </button>
      </div>

      {mode === "url" ? (
        <input
          type="url"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="input"
        />
      ) : (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-sm hover:bg-accent">
          <Upload className={`h-4 w-4 ${uploading ? "animate-pulse" : ""}`} />
          {uploading ? "Subiendo…" : "Seleccionar archivo"}
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </label>
      )}

      {value && (
        <div className="flex items-start gap-2">
          <div className="flex-1">
            {preview === "image" && (
              <img src={value} alt="" className="max-h-40 w-full rounded-lg border object-cover" />
            )}
            {preview === "audio" && <audio controls src={value} className="w-full" />}
            {preview === "video" && <video controls src={value} className="w-full rounded-lg border" />}
            {preview === "none" && (
              <p className="truncate rounded-lg border bg-secondary/40 px-2 py-1 text-xs text-muted-foreground">{value}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-lg border p-1.5 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
            title="Quitar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}