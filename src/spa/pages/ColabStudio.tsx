import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import {
  Save, Loader2, Plus, Trash2, ArrowUp, ArrowDown, GripVertical, Eye, Rocket, Copy, Archive, Users, Palette, Music,
  Layers, Link2, Settings2, FileText, Upload, Check, X, Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadAndSign } from "@/lib/storage";
import { PROJECT_STATUSES, PROJECT_TYPES } from "@/lib/nlab-constants";
import { Button } from "@/components/ui/button";

// Tablas/columnas nuevas (aún no están en types.ts): cliente sin tipado estricto.
const db = supabase as unknown as { from: (t: string) => any };

const PART_STATUS: Record<string, { label: string; w: number; cls: string }> = {
  available: { label: "Disponible", w: 0, cls: "bg-secondary text-foreground" },
  reserved: { label: "Reservada", w: 0.1, cls: "bg-amber-100 text-amber-800" },
  developing: { label: "En desarrollo", w: 0.5, cls: "bg-blue-100 text-blue-800" },
  review: { label: "Revisión", w: 0.75, cls: "bg-purple-100 text-purple-800" },
  done: { label: "Completada", w: 1, cls: "bg-green-100 text-green-800" },
};
const TABS = [
  { k: "general", label: "General", icon: FileText },
  { k: "gd", label: "Geometry Dash", icon: Music },
  { k: "parts", label: "Partes", icon: Layers },
  { k: "team", label: "Equipo y reglas", icon: Users },
  { k: "res", label: "Recursos", icon: Link2 },
  { k: "preview", label: "Vista previa", icon: Eye },
] as const;
type Tab = (typeof TABS)[number]["k"];
type Part = { id: string; project_id: string; position: number; name: string; assigned_to: string | null; percent_range: string | null; style: string | null; status: string; deadline: string | null; demo_url: string | null };
type Person = { id: string; username: string; display_name: string | null };

const EMPTY = {
  name: "", description: "", type: "collab", status: "active", difficulty: "", visibility: "team", tags: [] as string[], deadline: "", start_date: "",
  banner_url: "", thumbnail_url: "", preview_video_url: "", song_name: "", song_url: "", song_id: "", bpm: "", level_id: "", gd_version: "", level_length: "",
  theme: "", style: "", duration_seconds: "", palette: [] as string[], slots: "", requirements: "", rules: "", applications_close_at: "", comments_enabled: true,
  progress: 0, is_draft: true,
};

export default function ColabStudio() {
  const { id } = useParams();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("general");
  const [f, setF] = useState<typeof EMPTY>(EMPTY);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [members, setMembers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const set = (k: keyof typeof EMPTY, v: unknown) => setF((p) => ({ ...p, [k]: v }));
  const name = (pid: string | null) => { const p = people.find((x) => x.id === pid); return p ? p.display_name || p.username : "Sin asignar"; };

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    setUid(u.user?.id ?? null);
    const { data: pr } = await supabase.from("profiles").select("id, username, display_name").order("username");
    setPeople((pr ?? []) as Person[]);
    if (!id) return;
    const { data: p, error } = await db.from("projects").select("*").eq("id", id).maybeSingle();
    if (error || !p) { toast.error("Proyecto no encontrado o sin permiso."); setLoading(false); return; }
    setF({
      ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, p[k] ?? (EMPTY as any)[k]])),
      tags: p.tags ?? [], palette: Array.isArray(p.palette) ? p.palette : [],
      deadline: p.deadline ?? "", start_date: p.start_date ?? "",
      applications_close_at: p.applications_close_at ? String(p.applications_close_at).slice(0, 16) : "",
    });
    const [pa, mm, rq, ln, fl] = await Promise.all([
      db.from("project_parts").select("*").eq("project_id", id).order("position"),
      db.from("project_members").select("*").eq("project_id", id),
      db.from("project_join_requests").select("*").eq("project_id", id).eq("status", "pending"),
      db.from("project_links").select("*").eq("project_id", id).order("created_at"),
      db.from("project_files").select("*").eq("project_id", id).order("created_at"),
    ]);
    const ps: Part[] = pa.data ?? [];
    setParts(ps); setMembers(mm.data ?? []); setRequests(rq.data ?? []); setLinks(ln.data ?? []); setFiles(fl.data ?? []);
    if (ps.length) {
      const { data: nn } = await db.from("project_part_notes").select("*").in("part_id", ps.map((x) => x.id));
      setNotes(Object.fromEntries((nn ?? []).map((n: any) => [n.part_id, n.notes ?? ""])));
    }
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const progress = useMemo(() => (parts.length ? Math.round((100 * parts.reduce((a, p) => a + (PART_STATUS[p.status]?.w ?? 0), 0)) / parts.length) : 0), [parts]);

  function row(draft: boolean) {
    const n = (v: string) => (v === "" ? null : Number(v));
    return {
      name: f.name.trim(), description: f.description || null, type: f.type, status: f.status, difficulty: f.difficulty || null, visibility: f.visibility,
      tags: f.tags, deadline: f.deadline || null, start_date: f.start_date || null, banner_url: f.banner_url || null, thumbnail_url: f.thumbnail_url || null,
      preview_video_url: f.preview_video_url || null, song_name: f.song_name || null, song_url: f.song_url || null, song_id: f.song_id || null,
      bpm: n(String(f.bpm)), level_id: f.level_id || null, gd_version: f.gd_version || null, level_length: f.level_length || null, theme: f.theme || null,
      style: f.style || null, duration_seconds: n(String(f.duration_seconds)), palette: f.palette, slots: n(String(f.slots)), requirements: f.requirements || null,
      rules: f.rules || null, applications_close_at: f.applications_close_at ? new Date(f.applications_close_at).toISOString() : null,
      comments_enabled: f.comments_enabled, is_draft: draft,
    };
  }
  async function save(draft = f.is_draft, silent = false) {
    if (f.name.trim().length < 2) { toast.error("El nombre necesita al menos 2 caracteres."); setTab("general"); return null; }
    if (!uid) return null;
    setSaving(true);
    try {
      if (id) {
        const { error } = await db.from("projects").update(row(draft)).eq("id", id);
        if (error) throw error;
        set("is_draft", draft);
        if (!silent) toast.success(draft ? "Borrador guardado" : "Proyecto actualizado");
        return id;
      }
      const { data, error } = await db.from("projects").insert({ ...row(true), created_by: uid, host_id: uid }).select("id").single();
      if (error) throw error;
      toast.success("Borrador creado. Ahora añade partes, equipo y recursos.");
      nav(`/projects/${data.id}/studio`, { replace: true });
      return data.id as string;
    } catch (e) {
      toast.error((e as Error).message);
      return null;
    } finally { setSaving(false); }
  }
  async function upload(file: File | undefined, key: "banner_url" | "thumbnail_url") {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) return toast.error("Solo imágenes de hasta 8 MB.");
    try { set(key, await uploadAndSign("project-media", file, "studio")); toast.success("Imagen subida (guarda para aplicar)."); } catch (e) { toast.error((e as Error).message); }
  }

  // ---------- Partes ----------
  async function addPart() {
    if (!id) return;
    const { data, error } = await db.from("project_parts").insert({ project_id: id, position: parts.length, name: `Parte ${parts.length + 1}` }).select("*").single();
    if (error) return toast.error(error.message);
    setParts((p) => [...p, data]);
  }
  async function patchPart(pid: string, patch: Partial<Part>) {
    setParts((p) => p.map((x) => (x.id === pid ? { ...x, ...patch } : x)));
    const { error } = await db.from("project_parts").update(patch).eq("id", pid);
    if (error) { toast.error(error.message); load(); }
  }
  async function saveNote(pid: string, text: string) {
    const { error } = await db.from("project_part_notes").upsert({ part_id: pid, notes: text });
    if (error) toast.error(error.message);
  }
  async function delPart(pid: string) {
    if (!window.confirm("¿Eliminar esta parte?")) return;
    const { error } = await db.from("project_parts").delete().eq("id", pid);
    if (error) return toast.error(error.message);
    setParts((p) => p.filter((x) => x.id !== pid));
  }
  async function reorder(from: number, to: number) {
    if (to < 0 || to >= parts.length || from === to) return;
    const next = [...parts]; const [m] = next.splice(from, 1); next.splice(to, 0, m);
    const renum = next.map((p, i) => ({ ...p, position: i }));
    setParts(renum);
    const res = await Promise.all(renum.map((p) => db.from("project_parts").update({ position: p.position }).eq("id", p.id)));
    if (res.some((r: any) => r.error)) { toast.error("No se pudo reordenar."); load(); }
  }
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  async function applyProgress() {
    const { error } = await db.from("projects").update({ progress }).eq("id", id);
    if (error) return toast.error(error.message);
    set("progress", progress); toast.success(`Progreso del proyecto: ${progress}%`);
  }

  // ---------- Equipo ----------
  const [invite, setInvite] = useState({ user: "", role: "" });
  async function addMember() {
    if (!id || !invite.user) return;
    const { error } = await db.from("project_members").insert({ project_id: id, user_id: invite.user, role_label: invite.role || null, status: "approved" });
    if (error) return toast.error(error.code === "23505" ? "Ya es integrante." : error.message);
    setInvite({ user: "", role: "" }); load();
  }
  async function removeMember(mid: string) {
    if (!window.confirm("¿Quitar a este integrante?")) return;
    const { error } = await db.from("project_members").delete().eq("id", mid);
    if (error) return toast.error(error.message);
    load();
  }
  async function answer(r: any, ok: boolean) {
    if (ok) {
      const { error } = await db.from("project_members").insert({ project_id: id, user_id: r.user_id, status: "approved" });
      if (error && error.code !== "23505") return toast.error(error.message);
    }
    const { error } = await db.from("project_join_requests").update({ status: ok ? "accepted" : "rejected" }).eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  }

  // ---------- Recursos ----------
  const [lnk, setLnk] = useState({ url: "", label: "" });
  async function addLink() {
    if (!id || !/^https:\/\//.test(lnk.url)) return toast.error("El enlace debe empezar por https://");
    const { error } = await db.from("project_links").insert({ project_id: id, url: lnk.url, label: lnk.label || null, kind: "other", created_by: uid });
    if (error) return toast.error(error.message);
    setLnk({ url: "", label: "" }); load();
  }
  async function addFile(file: File | undefined) {
    if (!id || !file) return;
    if (file.size > 25 * 1024 * 1024) return toast.error("Máximo 25 MB por archivo.");
    try {
      const url = await uploadAndSign("project-media", file, `studio/${id}`);
      const { error } = await db.from("project_files").insert({ project_id: id, url, name: file.name, size_bytes: file.size, uploaded_by: uid });
      if (error) throw error;
      load();
    } catch (e) { toast.error((e as Error).message); }
  }

  // ---------- Acciones ----------
  async function duplicate() {
    if (!id || !uid) return;
    const { data, error } = await db.from("projects").insert({ ...row(true), name: `${f.name} (copia)`, created_by: uid, host_id: uid, progress: 0 }).select("id").single();
    if (error) return toast.error(error.message);
    if (parts.length) await db.from("project_parts").insert(parts.map((p) => ({ project_id: data.id, position: p.position, name: p.name, percent_range: p.percent_range, style: p.style, status: "available" })));
    toast.success("Duplicado como borrador."); nav(`/projects/${data.id}/studio`);
  }
  async function archive() {
    const { error } = await db.from("projects").update({ status: "cancelled" }).eq("id", id);
    if (error) return toast.error(error.message);
    set("status", "cancelled"); toast.success("Proyecto archivado (estado: cancelado).");
  }
  async function remove() {
    if (!window.confirm("¿Eliminar este proyecto con todas sus partes? No se puede deshacer.")) return;
    const { error } = await db.from("projects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Proyecto eliminado"); nav("/projects");
  }

  if (loading) return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  const needsSave = !id && tab !== "general" && tab !== "gd";
  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (<label className="block text-sm"><span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>{children}</label>);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <Helmet><title>{f.name || "Nuevo proyecto"} · Editor — NLabs</title></Helmet>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to={id ? `/projects/${id}` : "/createcolab"} className="text-xs text-muted-foreground hover:text-foreground">← {id ? "Ver proyecto" : "Volver"}</Link>
          <h1 className="text-2xl font-bold tracking-tight">{f.name || "Nuevo Collab / Level"}</h1>
          <p className="text-xs text-muted-foreground">{f.is_draft ? "Borrador (solo tú lo ves)" : "Publicado"} · Editor avanzado</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => save(true)} disabled={saving} className="gap-1.5">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {id ? "Guardar" : "Crear borrador"}</Button>
          {id && <Button onClick={async () => { if (await save(false)) toast.success("¡Publicado! Se notificó al equipo."); }} disabled={saving} className="gap-1.5"><Rocket className="h-4 w-4" /> {f.is_draft ? "Publicar" : "Actualizar"}</Button>}
        </div>
      </div>

      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border bg-card p-1" role="tablist">
        {TABS.map(({ k, label, icon: I }) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={"flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition " + (tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}>
            <I className="h-4 w-4" /> {label}{k === "parts" && parts.length > 0 && <span className="rounded-full bg-background/30 px-1.5 text-[10px]">{parts.length}</span>}
          </button>
        ))}
      </div>

      {needsSave && <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">Primero pulsa <b>Crear borrador</b> (arriba) para activar esta sección.</div>}

      {tab === "general" && (
        <div className="grid gap-4 rounded-2xl border bg-card p-5 md:grid-cols-2">
          <div className="md:col-span-2"><Field label="Nombre del collab / level *"><input className="input" value={f.name} maxLength={80} onChange={(e) => set("name", e.target.value)} placeholder="Ej. Nova Eclipse" /></Field></div>
          <div className="md:col-span-2"><Field label="Descripción"><textarea className="input" rows={4} value={f.description} onChange={(e) => set("description", e.target.value)} /></Field></div>
          <Field label="Tipo"><select className="input" value={f.type} onChange={(e) => set("type", e.target.value)}>{PROJECT_TYPES.map((t: any) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
          <Field label="Estado"><select className="input" value={f.status} onChange={(e) => set("status", e.target.value)}>{PROJECT_STATUSES.map((t: any) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
          <Field label="Dificultad objetivo"><input className="input" value={f.difficulty} onChange={(e) => set("difficulty", e.target.value)} placeholder="Insane, Easy Demon, Extreme…" /></Field>
          <Field label="Visibilidad"><select className="input" value={f.visibility} onChange={(e) => set("visibility", e.target.value)}><option value="team">Equipo (todos los miembros)</option><option value="private">Privado (host y participantes)</option><option value="public">Público (lectura general)</option></select></Field>
          <Field label="Fecha de inicio"><input type="date" className="input" value={f.start_date} onChange={(e) => set("start_date", e.target.value)} /></Field>
          <Field label="Fecha prevista de finalización"><input type="date" className="input" value={f.deadline} onChange={(e) => set("deadline", e.target.value)} /></Field>
          <div className="md:col-span-2"><Field label="Etiquetas (separadas por coma)"><input className="input" value={f.tags.join(", ")} onChange={(e) => set("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 12))} /></Field></div>
          <Field label="Portada / banner"><div className="flex items-center gap-2"><label className="btn cursor-pointer"><Upload className="h-3.5 w-3.5" /> Subir<input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0], "banner_url")} /></label>{f.banner_url && <img src={f.banner_url} alt="" className="h-12 rounded-md" />}</div></Field>
          <Field label="Miniatura"><div className="flex items-center gap-2"><label className="btn cursor-pointer"><Upload className="h-3.5 w-3.5" /> Subir<input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0], "thumbnail_url")} /></label>{f.thumbnail_url && <img src={f.thumbnail_url} alt="" className="h-12 rounded-md" />}</div></Field>
        </div>
      )}

      {tab === "gd" && (
        <div className="grid gap-4 rounded-2xl border bg-card p-5 md:grid-cols-3">
          <Field label="Canción"><input className="input" value={f.song_name} onChange={(e) => set("song_name", e.target.value)} /></Field>
          <Field label="ID de canción (Newgrounds)"><input className="input" value={f.song_id} onChange={(e) => set("song_id", e.target.value)} /></Field>
          <Field label="Enlace de la canción"><input className="input" value={f.song_url} onChange={(e) => set("song_url", e.target.value)} placeholder="https://…" /></Field>
          <Field label="BPM"><input type="number" min={1} max={1000} className="input" value={f.bpm} onChange={(e) => set("bpm", e.target.value)} /></Field>
          <Field label="ID del nivel (si ya existe)"><input className="input" value={f.level_id} onChange={(e) => set("level_id", e.target.value)} /></Field>
          <Field label="Versión de GD / requisitos"><input className="input" value={f.gd_version} onChange={(e) => set("gd_version", e.target.value)} placeholder="2.2 · Mega Hack…" /></Field>
          <Field label="Longitud del nivel"><input className="input" value={f.level_length} onChange={(e) => set("level_length", e.target.value)} placeholder="Long, XL, 2:30…" /></Field>
          <Field label="Duración (segundos)"><input type="number" min={0} className="input" value={f.duration_seconds} onChange={(e) => set("duration_seconds", e.target.value)} /></Field>
          <Field label="Estilo visual"><input className="input" value={f.style} onChange={(e) => set("style", e.target.value)} /></Field>
          <div className="md:col-span-3"><Field label="Tema visual"><input className="input" value={f.theme} onChange={(e) => set("theme", e.target.value)} placeholder="Espacio, ciudad neón, orgánico…" /></Field></div>
          <div className="md:col-span-3">
            <span className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground"><Palette className="h-3.5 w-3.5" /> Paleta de colores</span>
            <div className="flex flex-wrap items-center gap-2">
              {f.palette.map((c, i) => (<span key={i} className="flex items-center gap-1 rounded-lg border p-1"><input type="color" value={c} onChange={(e) => set("palette", f.palette.map((x, j) => (j === i ? e.target.value : x)))} className="h-7 w-9 cursor-pointer rounded" /><code className="text-[11px]">{c}</code><button onClick={() => set("palette", f.palette.filter((_, j) => j !== i))} aria-label="Quitar color"><X className="h-3 w-3" /></button></span>))}
              <button className="btn" onClick={() => set("palette", [...f.palette, "#6d5ef5"])}><Plus className="h-3.5 w-3.5" /> Color</button>
            </div>
          </div>
          <div className="md:col-span-3"><Field label="Video de demostración"><input className="input" value={f.preview_video_url} onChange={(e) => set("preview_video_url", e.target.value)} placeholder="https://youtube.com/…" /></Field></div>
        </div>
      )}

      {tab === "parts" && id && (
        <div className="space-y-3">
          <div className="rounded-2xl border bg-card p-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Línea de tiempo de partes</h2>
              <div className="flex gap-2"><Button size="sm" variant="outline" onClick={applyProgress} disabled={!parts.length}>Aplicar {progress}% al proyecto</Button><Button size="sm" onClick={addPart} className="gap-1"><Plus className="h-4 w-4" /> Añadir parte</Button></div>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
            <p className="mt-1 text-xs text-muted-foreground">Progreso calculado: {progress}% · arrastra ⠿ o usa las flechas para reordenar.</p>
            {parts.length > 0 && <div className="mt-3 flex h-6 overflow-hidden rounded-md border">{parts.map((p) => <div key={p.id} title={`${p.name}: ${PART_STATUS[p.status]?.label}`} className={"flex-1 border-r text-center text-[10px] leading-6 " + PART_STATUS[p.status]?.cls}>{p.name.slice(0, 8)}</div>)}</div>}
          </div>
          {parts.length === 0 && <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">Aún no hay partes. Añade tantas como necesites; no hay límite.</div>}
          {parts.map((p, i) => (
            <div key={p.id} draggable onDragStart={() => setDragFrom(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragFrom !== null) reorder(dragFrom, i); setDragFrom(null); }}
              className="rounded-2xl border bg-card p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" aria-hidden />
                <span className="text-xs font-semibold text-muted-foreground">#{i + 1}</span>
                <input className="input !w-auto flex-1 font-medium" value={p.name} maxLength={80} onChange={(e) => setParts((a) => a.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))} onBlur={(e) => patchPart(p.id, { name: e.target.value })} />
                <button className="btn" onClick={() => reorder(i, i - 1)} aria-label="Subir"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button className="btn" onClick={() => reorder(i, i + 1)} aria-label="Bajar"><ArrowDown className="h-3.5 w-3.5" /></button>
                <button className="btn" onClick={() => delPart(p.id)} aria-label="Eliminar"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              <div className="grid gap-2 md:grid-cols-4">
                <Field label="Creador asignado"><select className="input" value={p.assigned_to ?? ""} onChange={(e) => patchPart(p.id, { assigned_to: e.target.value || null, status: e.target.value && p.status === "available" ? "reserved" : p.status })}><option value="">Sin asignar</option>{people.map((x) => <option key={x.id} value={x.id}>{x.display_name || x.username}</option>)}</select></Field>
                <Field label="Estado"><select className="input" value={p.status} onChange={(e) => patchPart(p.id, { status: e.target.value })}>{Object.entries(PART_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
                <Field label="% del nivel"><input className="input" value={p.percent_range ?? ""} placeholder="0–15%" onChange={(e) => setParts((a) => a.map((x) => (x.id === p.id ? { ...x, percent_range: e.target.value } : x)))} onBlur={(e) => patchPart(p.id, { percent_range: e.target.value || null })} /></Field>
                <Field label="Fecha límite"><input type="date" className="input" value={p.deadline ?? ""} onChange={(e) => patchPart(p.id, { deadline: e.target.value || null })} /></Field>
                <Field label="Estilo / colores"><input className="input" value={p.style ?? ""} onChange={(e) => setParts((a) => a.map((x) => (x.id === p.id ? { ...x, style: e.target.value } : x)))} onBlur={(e) => patchPart(p.id, { style: e.target.value || null })} /></Field>
                <div className="md:col-span-3"><Field label="Demo (enlace)"><input className="input" value={p.demo_url ?? ""} placeholder="https://…" onChange={(e) => setParts((a) => a.map((x) => (x.id === p.id ? { ...x, demo_url: e.target.value } : x)))} onBlur={(e) => patchPart(p.id, { demo_url: e.target.value || null })} /></Field></div>
                <div className="md:col-span-4"><Field label="Notas privadas del equipo"><textarea rows={2} className="input" value={notes[p.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [p.id]: e.target.value }))} onBlur={(e) => saveNote(p.id, e.target.value)} /></Field></div>
              </div>
              <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><span className={"rounded-full px-2 py-0.5 " + PART_STATUS[p.status]?.cls}>{PART_STATUS[p.status]?.label}</span> {name(p.assigned_to)}{p.deadline && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{p.deadline}</span>}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "team" && id && (
        <div className="space-y-4">
          <div className="grid gap-4 rounded-2xl border bg-card p-5 md:grid-cols-3">
            <Field label="Plazas disponibles"><input type="number" min={0} className="input" value={f.slots} onChange={(e) => set("slots", e.target.value)} placeholder="Sin límite" /></Field>
            <Field label="Cierre de solicitudes"><input type="datetime-local" className="input" value={f.applications_close_at} onChange={(e) => set("applications_close_at", e.target.value)} /></Field>
            <label className="flex items-center gap-2 pt-5 text-sm"><input type="checkbox" checked={f.comments_enabled} onChange={(e) => set("comments_enabled", e.target.checked)} className="h-4 w-4" /> Permitir comentarios</label>
            <div className="md:col-span-3"><Field label="Requisitos para participar"><textarea rows={2} className="input" value={f.requirements} onChange={(e) => set("requirements", e.target.value)} /></Field></div>
            <div className="md:col-span-3"><Field label="Reglas de participación"><textarea rows={3} className="input" value={f.rules} onChange={(e) => set("rules", e.target.value)} /></Field></div>
            <div className="md:col-span-3"><Button size="sm" variant="outline" onClick={() => save(f.is_draft, true).then((r) => r && toast.success("Reglas guardadas"))}>Guardar reglas</Button></div>
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="mb-1 font-semibold">Integrantes {f.slots !== "" && <span className="text-xs font-normal text-muted-foreground">({members.length}/{f.slots} plazas)</span>}</h2>
            <ul className="divide-y">{members.map((m) => (<li key={m.id} className="flex items-center justify-between py-2 text-sm"><span>{name(m.user_id)} <span className="text-xs text-muted-foreground">{m.role_label ?? ""}</span></span><button className="btn" onClick={() => removeMember(m.id)}><Trash2 className="h-3.5 w-3.5" /></button></li>))}{!members.length && <li className="py-2 text-sm text-muted-foreground">Nadie aún.</li>}</ul>
            <div className="mt-3 flex flex-wrap gap-2"><select className="input !w-auto flex-1" value={invite.user} onChange={(e) => setInvite({ ...invite, user: e.target.value })}><option value="">Elegir miembro…</option>{people.map((x) => <option key={x.id} value={x.id}>{x.display_name || x.username}</option>)}</select><input className="input !w-40" placeholder="Rol (Layout, Deco…)" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })} /><Button size="sm" onClick={addMember}>Añadir</Button></div>
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="mb-1 font-semibold">Solicitudes de participación</h2>
            {!requests.length ? <p className="text-sm text-muted-foreground">No hay solicitudes pendientes.</p> : requests.map((r) => (<div key={r.id} className="flex items-center justify-between border-t py-2 text-sm"><span>{name(r.user_id)}{r.message ? ` — “${r.message}”` : ""}</span><span className="flex gap-1"><button className="btn" onClick={() => answer(r, true)}><Check className="h-3.5 w-3.5" /> Aceptar</button><button className="btn" onClick={() => answer(r, false)}><X className="h-3.5 w-3.5" /> Rechazar</button></span></div>))}
          </div>
        </div>
      )}

      {tab === "res" && id && (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="mb-2 font-semibold">Enlaces (vídeos, demos, referencias)</h2>
            {links.map((l) => (<div key={l.id} className="flex items-center justify-between border-t py-2 text-sm"><a href={l.url} target="_blank" rel="noopener noreferrer" className="truncate text-primary hover:underline">{l.label || l.url}</a><button className="btn" onClick={async () => { await db.from("project_links").delete().eq("id", l.id); load(); }}><Trash2 className="h-3.5 w-3.5" /></button></div>))}
            <div className="mt-3 flex flex-wrap gap-2"><input className="input !w-40" placeholder="Título" value={lnk.label} onChange={(e) => setLnk({ ...lnk, label: e.target.value })} /><input className="input !w-auto flex-1" placeholder="https://…" value={lnk.url} onChange={(e) => setLnk({ ...lnk, url: e.target.value })} /><Button size="sm" onClick={addLink}>Añadir</Button></div>
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="mb-2 flex items-center gap-2 font-semibold"><Settings2 className="h-4 w-4" /> Archivos (imágenes de referencia, audio permitido)</h2>
            {files.map((x) => (<div key={x.id} className="flex items-center justify-between border-t py-2 text-sm"><a href={x.url} target="_blank" rel="noopener noreferrer" className="truncate text-primary hover:underline">{x.name}</a><button className="btn" onClick={async () => { await db.from("project_files").delete().eq("id", x.id); load(); }}><Trash2 className="h-3.5 w-3.5" /></button></div>))}
            <label className="btn mt-3 cursor-pointer"><Upload className="h-3.5 w-3.5" /> Subir archivo (máx. 25 MB)<input type="file" className="hidden" onChange={(e) => addFile(e.target.files?.[0])} /></label>
            <p className="mt-2 text-xs text-muted-foreground">Sube solo audio sobre el que tengas derechos de distribución; si no, usa un enlace externo.</p>
          </div>
        </div>
      )}

      {tab === "preview" && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border bg-card">
            {f.banner_url && <img src={f.banner_url} alt="" className="h-40 w-full object-cover" />}
            <div className="p-5">
              <h2 className="text-xl font-bold">{f.name || "Sin nombre"}</h2>
              <p className="text-sm text-muted-foreground">{PROJECT_TYPES.find((t: any) => t.value === f.type)?.label} · {f.difficulty || "dificultad por definir"} · {f.bpm ? `${f.bpm} BPM` : "BPM —"} · {f.level_id ? `ID ${f.level_id}` : "sin ID"}</p>
              <p className="mt-3 whitespace-pre-wrap text-sm">{f.description || "Sin descripción."}</p>
              <div className="mt-3 flex flex-wrap gap-1">{f.tags.map((t) => <span key={t} className="rounded-full bg-primary-soft px-2 py-0.5 text-xs">{t}</span>)}{f.palette.map((c) => <span key={c} className="h-5 w-5 rounded-full border" style={{ background: c }} title={c} />)}</div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{ width: `${progress}%` }} /></div>
              <p className="mt-1 text-xs text-muted-foreground">{parts.length} partes · {progress}% · {members.length} integrantes · plazas: {f.slots || "sin límite"} · visibilidad: {f.visibility}</p>
            </div>
          </div>
          {id && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={async () => { if (await save(false)) toast.success("¡Publicado! Se notificó al equipo."); }} className="gap-1.5"><Rocket className="h-4 w-4" /> {f.is_draft ? "Publicar" : "Actualizar"}</Button>
              <Button variant="outline" onClick={() => save(true)} className="gap-1.5"><Save className="h-4 w-4" /> Volver a borrador</Button>
              <Button variant="outline" onClick={duplicate} className="gap-1.5"><Copy className="h-4 w-4" /> Duplicar</Button>
              <Button variant="outline" onClick={archive} className="gap-1.5"><Archive className="h-4 w-4" /> Archivar</Button>
              <Button variant="outline" onClick={remove} className="gap-1.5 text-destructive"><Trash2 className="h-4 w-4" /> Eliminar</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
