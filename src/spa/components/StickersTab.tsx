import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { callAdmin } from "@/spa/lib/adminApi";
import { MediaInput } from "@/spa/components/MediaInput";

type Sticker = { id: string; name: string; image_url: string; order_index: number };
const db = supabase as unknown as { from: (t: string) => any };

/** Shell → Stickers: el admin sube stickers (PNG/WebP/GIF) que todos pueden enviar en el Room. */
export function StickersTab() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-stickers"],
    queryFn: async (): Promise<Sticker[]> => {
      const { data, error } = await db.from("room_stickers").select("*").order("order_index").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-stickers"] }); qc.invalidateQueries({ queryKey: ["room-stickers"] }); };

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return toast.error("Pon un nombre y una imagen.");
    setBusy(true);
    try { await callAdmin("createSticker", { name: name.trim(), image_url: url.trim(), order_index: (q.data?.length ?? 0) * 10 + 10 }); toast.success("Sticker añadido"); setName(""); setUrl(""); refresh(); }
    catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }
  async function rename(st: Sticker, v: string) {
    if (!v.trim() || v === st.name) return;
    try { await callAdmin("updateSticker", { id: st.id, name: v.trim() }); refresh(); } catch (err) { toast.error((err as Error).message); }
  }
  async function remove(st: Sticker) {
    if (!confirm(`¿Eliminar el sticker «${st.name}»?`)) return;
    try { await callAdmin("deleteSticker", { id: st.id }); toast.success("Eliminado"); refresh(); } catch (err) { toast.error((err as Error).message); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <form onSubmit={add} className="h-fit space-y-3 rounded-2xl border bg-card p-5">
        <h2 className="flex items-center gap-2 font-semibold"><Plus className="h-4 w-4" /> Nuevo sticker</h2>
        <input className="input" placeholder="Nombre (ej. Jaja)" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        <MediaInput value={url} onChange={setUrl} bucket="branding" folder="stickers" accept="image/png,image/webp,image/gif" preview="image" />
        <p className="text-xs text-muted-foreground">Recomendado: PNG/WebP con fondo transparente, cuadrado (512×512).</p>
        <button disabled={busy} className="btn bg-primary text-primary-foreground border-primary"><Save className="h-3.5 w-3.5" /> Añadir</button>
      </form>
      <div className="rounded-2xl border bg-card p-5">
        <h2 className="mb-3 font-semibold">Stickers del Room ({q.data?.length ?? 0})</h2>
        {q.isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p>
          : q.error ? <p className="text-sm text-destructive">No se pudo cargar. ¿Ejecutaste la migración v2 (supabase/migration_v2.sql)?</p>
          : (q.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Todavía no hay stickers.</p>
          : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {q.data!.map((st) => (
                <div key={st.id} className="rounded-xl border p-2">
                  <img src={st.image_url} alt={st.name} className="aspect-square w-full object-contain" />
                  <input className="input mt-2 !py-1 text-xs" defaultValue={st.name} onBlur={(e) => rename(st, e.target.value)} />
                  <button onClick={() => remove(st)} className="btn mt-2 w-full justify-center hover:bg-destructive hover:text-destructive-foreground"><Trash2 className="h-3.5 w-3.5" /> Eliminar</button>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
