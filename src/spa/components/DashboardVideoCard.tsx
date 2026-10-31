import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Film, Save, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadAndSign } from "@/lib/storage";
import { callAdmin } from "@/spa/lib/adminApi";

const db = supabase as unknown as { from: (t: string) => any };

/** Video en bucle del Dashboard. Se guarda en site_settings.dashboard_video_url (solo administradores, por RLS). */
export function DashboardVideoCard() {
  const qc = useQueryClient();
  const current = useQuery({ queryKey: ["dashboard-video"], queryFn: fetchVideo });
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(value: string | null) {
    if (value && !/^https:\/\//.test(value)) return toast.error("La URL debe empezar por https://");
    setBusy(true);
    try {
      await callAdmin("updateSiteSettings", { dashboard_video_url: value });
    } catch (e) {
      setBusy(false);
      return toast.error((e as Error).message);
    }
    setBusy(false);
    toast.success(value ? "Video actualizado" : "Video quitado");
    setUrl("");
    qc.invalidateQueries({ queryKey: ["dashboard-video"] });
  }
  async function onFile(f: File | undefined) {
    if (!f) return;
    if (!/^video\/(mp4|webm)$/.test(f.type)) return toast.error("Solo MP4 o WebM");
    if (f.size > 50 * 1024 * 1024) return toast.error("Máximo 50 MB");
    setBusy(true);
    try { await save(await uploadAndSign("branding", f, "dashboard-video")); }
    catch (e) { toast.error((e as Error).message); setBusy(false); }
  }

  return (
    <div className="rounded-2xl border bg-card p-5 md:col-span-3">
      <h2 className="mb-1 flex items-center gap-2 font-semibold"><Film className="h-4 w-4" /> Video del Dashboard</h2>
      <p className="mb-3 text-sm text-muted-foreground">Se reproduce en bucle, sin sonido, en la parte superior del Dashboard. MP4/WebM de hasta 50 MB, o un enlace https.</p>
      {current.data && <video src={current.data} autoPlay loop muted playsInline className="mb-3 max-h-48 rounded-xl" />}
      <div className="flex flex-wrap gap-2">
        <label className="btn cursor-pointer"><Upload className="h-3.5 w-3.5" /> Subir video
          <input type="file" accept="video/mp4,video/webm" className="hidden" disabled={busy} onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <input className="input min-w-52 flex-1" placeholder="https://… enlace directo al video" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button disabled={busy || !url} onClick={() => save(url.trim())} className="btn bg-primary text-primary-foreground border-primary"><Save className="h-3.5 w-3.5" /> Guardar</button>
        {current.data && <button disabled={busy} onClick={() => save(null)} className="btn"><Trash2 className="h-3.5 w-3.5" /> Quitar</button>}
      </div>
    </div>
  );
}

async function fetchVideo(): Promise<string | null> {
  const { data } = await db.from("site_settings").select("dashboard_video_url").eq("id", true).maybeSingle();
  return (data as { dashboard_video_url?: string | null } | null)?.dashboard_video_url ?? null;
}
export { fetchVideo };
