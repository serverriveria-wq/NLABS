import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Github, Trash2 } from "lucide-react";
import { useSiteSettings } from "@/lib/site-branding";
import { callAdmin } from "@/spa/lib/adminApi";
import { MediaInput } from "@/spa/components/MediaInput";

/** Shell → Branding: fondo de la vista previa de niveles GD e icono de GitHub. */
export function BrandingExtras() {
  const qc = useQueryClient();
  const site = useSiteSettings();
  const [busy, setBusy] = useState(false);

  async function save(key: "gd_preview_bg_url" | "github_icon_url", value: string) {
    setBusy(true);
    try { await callAdmin("updateSiteSettings", { [key]: value }); toast.success(value ? "Actualizado" : "Restablecido"); qc.invalidateQueries({ queryKey: ["site-settings"] }); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  const gd = site.data?.gd_preview_bg_url ?? "";
  const gh = site.data?.github_icon_url ?? "";
  return (
    <>
      <div className="rounded-2xl border bg-card p-5 md:col-span-3">
        <h2 className="mb-1 font-semibold">Fondo de la vista previa de niveles GD</h2>
        <p className="mb-3 text-sm text-muted-foreground">Se usa detrás de la tarjeta del nivel (según su ID) en el pie de cada proyecto Collab.</p>
        <MediaInput value={gd} onChange={(v) => save("gd_preview_bg_url", v)} bucket="branding" folder="gd-preview" accept="image/*" preview="image" />
        {gd && <button disabled={busy} onClick={() => save("gd_preview_bg_url", "")} className="btn mt-2"><Trash2 className="h-3.5 w-3.5" /> Quitar fondo</button>}
      </div>
      <div className="rounded-2xl border bg-card p-5 md:col-span-3">
        <h2 className="mb-1 flex items-center gap-2 font-semibold"><Github className="h-4 w-4" /> Icono de GitHub</h2>
        <p className="mb-3 text-sm text-muted-foreground">Aparece al costado del enlace al repositorio en Collabs, Arte y Música. Si no subes ninguno se usa el icono por defecto.</p>
        <MediaInput value={gh} onChange={(v) => save("github_icon_url", v)} bucket="branding" folder="github-icon" accept="image/*" preview="image" />
        {gh && <button disabled={busy} onClick={() => save("github_icon_url", "")} className="btn mt-2"><Trash2 className="h-3.5 w-3.5" /> Usar icono por defecto</button>}
      </div>
    </>
  );
}
