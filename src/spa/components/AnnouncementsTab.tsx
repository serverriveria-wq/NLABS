import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MediaInput } from "@/spa/components/MediaInput";
import { AnnouncementCard, useAnnouncements } from "@/spa/pages/Notify";

const empty = { title: "", body: "", image_url: "", url: "", url_label: "", color: "#3b82f6", pinned: false };

export function AnnouncementsTab() {
  const qc = useQueryClient();
  const q = useAnnouncements();
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  async function save() {
    if (!form.title.trim()) return toast.error("El título es obligatorio");
    const row = { ...form, title: form.title.trim().slice(0, 200), body: form.body || null, image_url: form.image_url || null, url: form.url || null, url_label: form.url_label || null };
    const t = supabase.from("announcements" as never);
    const { error } = editing
      ? await t.update(row as never).eq("id", editing)
      : await t.insert(row as never);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Noticia actualizada" : "Noticia publicada");
    setForm(empty); setEditing(null);
    qc.invalidateQueries({ queryKey: ["announcements"] });
  }
  async function remove(id: string) {
    if (!confirm("¿Borrar esta noticia?")) return;
    const { error } = await supabase.from("announcements" as never).delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["announcements"] });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3 rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">{editing ? "Editar noticia" : "Nueva noticia"}</h2>
        <input className="input" placeholder="Título" value={form.title} onChange={(e) => set("title", e.target.value)} />
        <textarea className="input" rows={5} placeholder="Mensaje" value={form.body ?? ""} onChange={(e) => set("body", e.target.value)} />
        <MediaInput placeholder="Imagen (opcional) https://…" value={form.image_url ?? ""} onChange={(v: string) => set("image_url", v)} folder="announcements" />
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Enlace (https://…)" value={form.url ?? ""} onChange={(e) => set("url", e.target.value)} />
          <input className="input" placeholder="Texto del enlace" value={form.url_label ?? ""} onChange={(e) => set("url_label", e.target.value)} />
        </div>
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2">Color <input type="color" value={form.color ?? "#3b82f6"} onChange={(e) => set("color", e.target.value)} /></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.pinned} onChange={(e) => set("pinned", e.target.checked)} /> Fijado</label>
        </div>
        <p className="text-xs text-muted-foreground">Vista previa:</p>
        <AnnouncementCard a={{ ...form, id: "preview", created_at: new Date().toISOString() }} reactions={[]} />
        <div className="flex gap-2">
          <button className="btn bg-primary text-primary-foreground border-primary" onClick={save}>{editing ? "Guardar" : "Publicar"}</button>
          {editing && <button className="btn" onClick={() => { setForm(empty); setEditing(null); }}>Cancelar</button>}
        </div>
      </div>
      <div className="space-y-3">
        {(q.data?.items ?? []).map((a) => (
          <div key={a.id} className="space-y-1">
            <AnnouncementCard a={a} reactions={q.data!.reactions} />
            <div className="flex gap-2">
              <button className="btn" onClick={() => { setEditing(a.id); setForm({ ...empty, ...a }); }}>Editar</button>
              <button className="btn hover:bg-destructive hover:text-destructive-foreground" onClick={() => remove(a.id)}>Borrar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
