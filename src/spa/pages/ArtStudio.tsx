import { useEffect, useMemo, useState } from "react";
import { GithubField, GithubLink, parseList } from "@/spa/components/GithubField";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImageIcon, Loader2, Pencil, Plus, Search, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { pathFromSigned, uploadAndSign } from "@/lib/storage";
import { Modal } from "@/spa/components/Modal";
import { Button } from "@/components/ui/button";

const db = supabase as unknown as { from: (t: string) => any; channel: (n: string) => any; removeChannel: (c: unknown) => void };
const CATS = ["Ilustración", "Fondo", "Logo", "Thumbnail", "Pixel art", "Concepto", "Personaje", "Otro"];
const VIS: Record<string, string> = { team: "Equipo", public: "Público", private: "Privado (solo yo)" };
type Art = { id: string; author_id: string; title: string; description: string | null; image_url: string; category: string | null; tags: string[]; project_id: string | null; credits: string | null; visibility: string; created_at: string };

export default function ArtStudio() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("");
  const [mine, setMine] = useState(false);
  const [view, setView] = useState<number | null>(null);
  const [edit, setEdit] = useState<Art | "new" | null>(null);

  const me = useQuery({ queryKey: ["me-id"], queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null });
  const art = useQuery({ queryKey: ["artworks"], queryFn: async (): Promise<Art[]> => { const { data, error } = await db.from("artworks").select("*").order("created_at", { ascending: false }); if (error) throw error; return data; } });
  const people = useQuery({ queryKey: ["people-map"], queryFn: async () => { const { data } = await supabase.from("profiles").select("id, username, display_name"); return Object.fromEntries((data ?? []).map((p) => [p.id, p.display_name || p.username])); } });
  const projects = useQuery({ queryKey: ["projects-min"], queryFn: async () => { const { data } = await supabase.from("projects").select("id, name").order("name"); return data ?? []; } });
  const isAdmin = useQuery({ queryKey: ["is-admin"], queryFn: async () => { const { data } = await supabase.from("user_roles").select("role"); return (data ?? []).some((r) => ["founder", "owner", "administrator"].includes(r.role)); } });

  useEffect(() => {
    const ch = db.channel("art-live").on("postgres_changes", { event: "*", schema: "public", table: "artworks" }, () => qc.invalidateQueries({ queryKey: ["artworks"] })).subscribe();
    return () => db.removeChannel(ch);
  }, [qc]);

  const list = useMemo(() => (art.data ?? []).filter((a) =>
    (!cat || a.category === cat) && (!mine || a.author_id === me.data) &&
    (a.title + " " + (a.description ?? "") + " " + a.tags.join(" ")).toLowerCase().includes(search.toLowerCase())), [art.data, cat, mine, search, me.data]);

  useEffect(() => {
    if (view === null) return;
    const h = (e: KeyboardEvent) => { if (e.key === "ArrowRight") setView((v) => (v === null ? v : Math.min(list.length - 1, v + 1))); if (e.key === "ArrowLeft") setView((v) => (v === null ? v : Math.max(0, v - 1))); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [view, list.length]);

  async function remove(a: Art) {
    if (!window.confirm(`¿Eliminar «${a.title}»?`)) return;
    const { error } = await db.from("artworks").delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    const p = pathFromSigned(a.image_url, "art"); if (p) await supabase.storage.from("art").remove([p]);
    toast.success("Obra eliminada"); setView(null); qc.invalidateQueries({ queryKey: ["artworks"] });
  }
  const cur = view !== null ? list[view] : null;
  const canEdit = (a: Art) => a.author_id === me.data || isAdmin.data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <Helmet><title>Arte — NLabs</title></Helmet>
      <Link to="/createcolab" className="text-xs text-muted-foreground hover:text-foreground">← Crear</Link>
      <div className="mb-4 mt-1 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><ImageIcon className="h-6 w-6 text-primary" /> Galería de arte</h1><p className="text-sm text-muted-foreground">Ilustraciones, fondos, logos y thumbnails del team.</p></div>
        <Button onClick={() => setEdit("new")} className="gap-1.5"><Plus className="h-4 w-4" /> Subir arte</Button>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-52 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input className="input !pl-9" placeholder="Buscar por título, etiqueta…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <select className="input !w-auto" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Todas las categorías</option>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Solo mis obras</label>
      </div>
      {art.isLoading ? <div className="columns-2 gap-3 md:columns-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="mb-3 h-40 animate-pulse rounded-xl bg-secondary" />)}</div>
        : art.error ? <p className="text-sm text-destructive">No se pudo cargar la galería.</p>
        : list.length === 0 ? <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground"><ImageIcon className="mx-auto mb-2 h-8 w-8 opacity-40" />{(art.data?.length ?? 0) === 0 ? "Aún no hay obras. ¡Sube la primera!" : "Nada coincide con tu búsqueda."}</div>
        : (
          <div className="columns-2 gap-3 md:columns-3 lg:columns-4">
            {list.map((a, i) => (
              <button key={a.id} onClick={() => setView(i)} className="group mb-3 block w-full break-inside-avoid overflow-hidden rounded-xl border bg-card text-left shadow-sm transition hover:shadow-md">
                <img src={a.image_url} alt={a.title} loading="lazy" className="w-full object-cover" />
                <div className="p-2.5"><p className="truncate text-sm font-medium">{a.title}</p><p className="truncate text-xs text-muted-foreground">{people.data?.[a.author_id] ?? "—"}{a.category ? ` · ${a.category}` : ""}{a.visibility === "private" ? " · 🔒" : ""}</p></div>
              </button>
            ))}
          </div>
        )}

      {cur && (
        <Modal onClose={() => setView(null)} wide title={cur.title}>
          <div className="relative">
            <img src={cur.image_url} alt={cur.title} className="max-h-[65vh] w-full rounded-xl bg-black/5 object-contain" />
            {view! > 0 && <button aria-label="Anterior" onClick={() => setView(view! - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white"><ChevronLeft className="h-5 w-5" /></button>}
            {view! < list.length - 1 && <button aria-label="Siguiente" onClick={() => setView(view! + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white"><ChevronRight className="h-5 w-5" /></button>}
          </div>
          <div className="mt-3 space-y-1 text-sm">
            {cur.description && <p className="whitespace-pre-wrap">{cur.description}</p>}
            <p className="text-xs text-muted-foreground">Por {people.data?.[cur.author_id] ?? "—"} · {new Date(cur.created_at).toLocaleDateString("es")} · {VIS[cur.visibility]}{cur.credits ? ` · Créditos: ${cur.credits}` : ""}</p>
            <div className="flex flex-wrap gap-1">{cur.tags.map((t) => <span key={t} className="rounded-full bg-primary-soft px-2 py-0.5 text-xs">{t}</span>)}{cur.project_id && <Link className="text-xs text-primary hover:underline" to={`/projects/${cur.project_id}`}>Proyecto relacionado →</Link>}</div>
            {(((cur as any).tools?.length ?? 0) > 0 || ((cur as any).dependencies?.length ?? 0) > 0 || (cur as any).license || (cur as any).dimensions || ((cur as any).github_enabled && (cur as any).github_url)) && (
              <div className="space-y-1 pt-1 text-xs text-muted-foreground">
                {((cur as any).tools?.length ?? 0) > 0 && <p><b>Herramientas:</b> {(cur as any).tools.join(", ")}</p>}
                {((cur as any).dependencies?.length ?? 0) > 0 && <p><b>Dependencias:</b> {(cur as any).dependencies.join(", ")}</p>}
                {(cur as any).dimensions && <p><b>Tamaño:</b> {(cur as any).dimensions}</p>}
                {(cur as any).license && <p><b>Licencia:</b> {(cur as any).license}</p>}
                {(cur as any).github_enabled && <GithubLink url={(cur as any).github_url} />}
              </div>
            )}
            {canEdit(cur) && <div className="flex gap-2 pt-2"><Button size="sm" variant="outline" className="gap-1" onClick={() => { setEdit(cur); setView(null); }}><Pencil className="h-3.5 w-3.5" /> Editar</Button><Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => remove(cur)}><Trash2 className="h-3.5 w-3.5" /> Eliminar</Button></div>}
          </div>
        </Modal>
      )}
      {edit && <ArtForm item={edit === "new" ? null : edit} projects={projects.data ?? []} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); qc.invalidateQueries({ queryKey: ["artworks"] }); }} />}
    </div>
  );
}

function ArtForm({ item, projects, onClose, onSaved }: { item: Art | null; projects: { id: string; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ title: item?.title ?? "", description: item?.description ?? "", category: item?.category ?? "", tags: (item?.tags ?? []).join(", "), project_id: item?.project_id ?? "", credits: item?.credits ?? "", visibility: item?.visibility ?? "team" });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(item?.image_url ?? null);
  const [busy, setBusy] = useState(false);
  const [x, setX] = useState({ tools: ((item as any)?.tools ?? []).join(", "), deps: ((item as any)?.dependencies ?? []).join(", "), license: (item as any)?.license ?? "", dimensions: (item as any)?.dimensions ?? "", gh: !!(item as any)?.github_enabled, ghUrl: (item as any)?.github_url ?? "" });
  const setx = (k: string, v: string) => setX((p) => ({ ...p, [k]: v }));
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  function pick(x: File | undefined) {
    if (!x) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(x.type)) return toast.error("Formato no permitido (PNG, JPG, WebP o GIF).");
    if (x.size > 10 * 1024 * 1024) return toast.error("Máximo 10 MB.");
    setFile(x); setPreview(URL.createObjectURL(x));
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) return toast.error("Pon un título.");
    if (!item && !file) return toast.error("Elige una imagen.");
    if (x.gh && x.ghUrl.trim() && !/^https:\/\/(www\.)?github\.com\//i.test(x.ghUrl.trim())) return toast.error("El enlace de GitHub debe empezar por https://github.com/");
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      let image_url = item?.image_url;
      if (file) { image_url = await uploadAndSign("art", file, u.user!.id); const old = pathFromSigned(item?.image_url, "art"); if (old) await supabase.storage.from("art").remove([old]); }
      const row = { tools: parseList(x.tools), dependencies: parseList(x.deps), license: x.license || null, dimensions: x.dimensions || null, github_enabled: x.gh, github_url: x.gh ? (x.ghUrl.trim() || null) : null, title: f.title.trim(), description: f.description || null, category: f.category || null, tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 12), project_id: f.project_id || null, credits: f.credits || null, visibility: f.visibility, image_url };
      const { error } = item ? await db.from("artworks").update(row).eq("id", item.id) : await db.from("artworks").insert(row);
      if (error) throw error;
      toast.success(item ? "Obra actualizada" : "Obra publicada"); onSaved();
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }
  return (
    <Modal onClose={onClose} title={item ? "Editar obra" : "Subir arte"}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Imagen {item ? "(opcional: reemplazar)" : "*"}</span>
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => pick(e.target.files?.[0])} className="input" /></label>
        {preview && <img src={preview} alt="Vista previa" className="max-h-56 w-full rounded-xl object-contain" />}
        <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Título *</span><input className="input" maxLength={100} value={f.title} onChange={(e) => set("title", e.target.value)} /></label>
        <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Descripción</span><textarea className="input" rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Categoría</span><select className="input" value={f.category} onChange={(e) => set("category", e.target.value)}><option value="">—</option>{CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Visibilidad</span><select className="input" value={f.visibility} onChange={(e) => set("visibility", e.target.value)}>{Object.entries(VIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Proyecto relacionado</span><select className="input" value={f.project_id} onChange={(e) => set("project_id", e.target.value)}><option value="">Ninguno</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Créditos</span><input className="input" value={f.credits} onChange={(e) => set("credits", e.target.value)} placeholder="Autor original, colaboradores…" /></label>
        </div>
        <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Etiquetas (coma)</span><input className="input" value={f.tags} onChange={(e) => set("tags", e.target.value)} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Herramientas (coma)</span><input className="input" value={x.tools} onChange={(e) => setx("tools", e.target.value)} placeholder="Photoshop, Krita, Blender…" /></label>
          <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Dependencias (coma)</span><input className="input" value={x.deps} onChange={(e) => setx("deps", e.target.value)} placeholder="Fuentes, brushes, plugins…" /></label>
          <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Resolución / tamaño</span><input className="input" value={x.dimensions} onChange={(e) => setx("dimensions", e.target.value)} placeholder="1920×1080" /></label>
          <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Licencia</span><input className="input" value={x.license} onChange={(e) => setx("license", e.target.value)} placeholder="CC BY, uso interno…" /></label>
        </div>
        <GithubField enabled={x.gh} url={x.ghUrl} onChange={(v) => setX((p) => ({ ...p, gh: v.enabled, ghUrl: v.url }))} />
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button disabled={busy} className="gap-1.5">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{item ? "Guardar cambios" : "Publicar"}</Button></div>
      </form>
    </Modal>
  );
}
