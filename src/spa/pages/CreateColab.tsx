import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PROJECT_STATUSES, PROJECT_TYPES } from "@/lib/nlab-constants";
import { toast } from "sonner";
import { DifficultySelect } from "@/spa/components/DifficultySelect";
import { uploadAndSign } from "@/lib/storage";
import { gradientStyle, useSiteSettings, type Gradient } from "@/lib/site-branding";
import {
  Save, Loader2, ImageIcon, Sparkles, Users, Music, Tag as TagIcon,
  Calendar, Eye, History, StickyNote, X, Plus, Upload, Play, FileDown, Palette,
  Pencil, FolderKanban, ArrowRight,
} from "lucide-react";

export default function CreateColab() {
  const [mode, setMode] = useState<"choose" | "new" | "edit">("choose");

  if (mode === "new") {
    return (
      <div>
        <Helmet><title>Crear collab — NLab</title></Helmet>
        <div className="mx-auto mb-2 max-w-4xl px-4 pt-6 md:px-8">
          <button onClick={() => setMode("choose")} className="text-sm text-muted-foreground hover:text-foreground">← Volver</button>
        </div>
        <CreateColabForm />
      </div>
    );
  }
  if (mode === "edit") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        <Helmet><title>Editar proyecto — NLab</title></Helmet>
        <button onClick={() => setMode("choose")} className="mb-4 text-sm text-muted-foreground hover:text-foreground">← Volver</button>
        <MyProjectsToEdit />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-8">
      <Helmet><title>Crear — NLab</title></Helmet>
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Crear</h1>
      <p className="mt-1 text-sm text-muted-foreground">¿Qué quieres hacer?</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link to="/studio"
          className="group rounded-2xl border-2 border-primary bg-card p-6 text-left shadow-soft transition hover:shadow-elevated sm:col-span-2">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="h-6 w-6" /></div>
          <h2 className="mt-4 text-lg font-semibold">Crear Collab / Level · editor avanzado</h2>
          <p className="mt-1 text-sm text-muted-foreground">Partes con línea de tiempo y arrastrar y soltar, equipo y solicitudes, configuración de Geometry Dash (BPM, IDs, paleta), recursos, vista previa y publicación con avisos al team.</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">Abrir el editor <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
        </Link>
        <Link to="/studio/arte" className="group rounded-2xl border bg-card p-6 text-left shadow-soft transition hover:shadow-elevated">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary-soft text-primary"><ImageIcon className="h-6 w-6" /></div>
          <h2 className="mt-4 text-lg font-semibold">Arte</h2>
          <p className="mt-1 text-sm text-muted-foreground">Galería con visor ampliado, categorías, etiquetas, créditos, visibilidad y proyecto relacionado.</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">Abrir galería <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
        </Link>
        <Link to="/studio/musica" className="group rounded-2xl border bg-card p-6 text-left shadow-soft transition hover:shadow-elevated">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary-soft text-primary"><Music className="h-6 w-6" /></div>
          <h2 className="mt-4 text-lg font-semibold">Música</h2>
          <p className="mt-1 text-sm text-muted-foreground">Biblioteca con reproductor, BPM, género, licencia, créditos, portada y enlaces externos.</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">Abrir biblioteca <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
        </Link>
        <button onClick={() => setMode("new")}
          className="group rounded-2xl border bg-card p-6 text-left shadow-soft transition hover:border-primary hover:shadow-elevated">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground"><Plus className="h-6 w-6" /></div>
          <h2 className="mt-4 text-lg font-semibold">Crear proyecto rápido</h2>
          <p className="mt-1 text-sm text-muted-foreground">Formulario clásico con nombre con degradado, participantes y modalidades.</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">Comenzar <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
        </button>
        <button onClick={() => setMode("edit")}
          className="group rounded-2xl border bg-card p-6 text-left shadow-soft transition hover:border-primary hover:shadow-elevated">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary-soft text-primary"><Pencil className="h-6 w-6" /></div>
          <h2 className="mt-4 text-lg font-semibold">Editar proyecto</h2>
          <p className="mt-1 text-sm text-muted-foreground">Elige uno de tus proyectos y edítalo: info, galería, progreso, participantes y más.</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">Elegir <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
        </button>
      </div>
    </div>
  );
}

function MyProjectsToEdit() {
  const q = useQuery({
    queryKey: ["my-projects"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return [];
      const { data, error } = await supabase.from("projects")
        .select("id, name, name_segments, thumbnail_url, status, type, progress, slug, created_at")
        .eq("created_by", uid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <div>
      <h2 className="text-xl font-bold tracking-tight">Tus proyectos</h2>
      <p className="mt-1 text-sm text-muted-foreground">Elige uno para editar toda su información.</p>
      {q.isLoading && <p className="mt-6 text-sm text-muted-foreground">Cargando…</p>}
      {q.data && q.data.length === 0 && (
        <div className="mt-6 rounded-2xl border bg-card p-10 text-center">
          <FolderKanban className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Aún no has creado proyectos</p>
        </div>
      )}
      <div className="mt-6 grid gap-3">
        {q.data?.map((p: any) => {
          const segs = Array.isArray(p.name_segments) ? p.name_segments : null;
          return (
            <div key={p.id} className="flex items-center gap-2"><Link to={`/projects/${p.id}/edit`}
              className="flex flex-1 items-center gap-3 rounded-xl border bg-card p-3 transition hover:border-primary hover:shadow-soft">
              <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg border bg-gradient-to-br from-primary/20 to-primary/5"
                style={p.thumbnail_url ? { backgroundImage: `url(${p.thumbnail_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {segs ? segs.map((s: any, i: number) => <span key={i} style={s.gradient ? gradientStyle(s.gradient) : undefined}>{s.text}</span>) : p.name}
                </p>
                <p className="text-xs text-muted-foreground">{p.progress}% • {new Date(p.created_at).toLocaleDateString()}</p>
              </div>
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </Link><Link to={`/projects/${p.id}/studio`} className="btn shrink-0">Editor avanzado</Link></div>
          );
        })}
      </div>
    </div>
  );
}

const VISIBILITIES = [
  { value: "team", label: "Equipo (todos los miembros)" },
  { value: "private", label: "Privado (sólo host y participantes)" },
  { value: "public", label: "Público (lectura general)" },
];

type Participant = { user_id: string; modality_id: string | null; role_label: string };
type NameSegment = { text: string; gradient?: Gradient | null };

function CreateColabForm() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [gdFile, setGdFile] = useState<File | null>(null);
  const site = useSiteSettings();

  const [form, setForm] = useState({
    name: "", description: "", banner_url: "", thumbnail_url: "", preview_video_url: "",
    type: "collab", status: "active", difficulty: "", progress: 0, deadline: "",
    visibility: "team", track_progress_history: true, song_name: "", song_url: "",
    notes: "", tags: [] as string[], required_modalities: [] as string[],
    cohost_id: "" as string, participants: [] as Participant[], version_label: "v0",
    duration_seconds: 0, style: "",
  });

  const [nameSegments, setNameSegments] = useState<NameSegment[]>([]);

  const mods = useQuery({
    queryKey: ["modalities"],
    queryFn: async () => (await supabase.from("modalities").select("id,name,slug,icon_url" as string).order("name")).data ?? [],
  });
  const members = useQuery({
    queryKey: ["members-lite"],
    queryFn: async () => (await supabase.from("profiles").select("id, username, display_name, avatar_url").order("display_name")).data ?? [],
  });

  function up<K extends keyof typeof form>(k: K, v: (typeof form)[K]) { setForm((f) => ({ ...f, [k]: v })); }
  function addTag() { const t = tagInput.trim(); if (!t || form.tags.includes(t)) return; up("tags", [...form.tags, t]); setTagInput(""); }
  function addSegment() { setNameSegments((s) => [...s, { text: "", gradient: null }]); }
  function updateSegment(i: number, patch: Partial<NameSegment>) { setNameSegments((s) => s.map((seg, idx) => (idx === i ? { ...seg, ...patch } : seg))); }
  function removeSegment(i: number) { setNameSegments((s) => s.filter((_, idx) => idx !== i)); }
  function addParticipant() { up("participants", [...form.participants, { user_id: "", modality_id: null, role_label: "" }]); }
  function updateParticipant(i: number, patch: Partial<Participant>) { up("participants", form.participants.map((p, idx) => (idx === i ? { ...p, ...patch } : p))); }
  function removeParticipant(i: number) { up("participants", form.participants.filter((_, idx) => idx !== i)); }

  async function onThumbSelect(f: File | null) {
    setThumbFile(f);
    if (!f) return;
    try { const url = await uploadAndSign("project-media", f, "thumbnails"); up("thumbnail_url", url); toast.success("Miniatura subida"); }
    catch (e: any) { toast.error(e.message ?? "Error"); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("No auth");
      const finalName = nameSegments.length ? nameSegments.map((s) => s.text).join("") : form.name;
      if (!finalName.trim()) throw new Error("El proyecto necesita un nombre");

      let gdShareUrl: string | null = null;
      if (gdFile) gdShareUrl = await uploadAndSign("gd-shares", gdFile, `initial/${uid}`);

      const payload: any = {
        name: finalName, name_segments: nameSegments.length ? nameSegments : null,
        description: form.description || null, banner_url: form.banner_url || null,
        thumbnail_url: form.thumbnail_url || null, preview_video_url: form.preview_video_url || null,
        type: form.type, status: form.status, difficulty: form.difficulty || null,
        progress: form.progress, deadline: form.deadline || null, visibility: form.visibility,
        track_progress_history: form.track_progress_history, song_name: form.song_name || null,
        song_url: form.song_url || null, notes: form.notes || null, tags: form.tags,
        required_modalities: form.required_modalities, cohost_id: form.cohost_id || null,
        created_by: uid, host_id: uid,
        duration_seconds: form.duration_seconds || null, style: form.style || null,
      };

      const { data: project, error } = await supabase.from("projects").insert(payload).select().single();
      if (error) throw error;

      if ((gdShareUrl || form.version_label) && form.track_progress_history) {
        await supabase.from("project_progress_history" as any)
          .update({ gd_share_url: gdShareUrl, version_label: form.version_label || "v0" } as any)
          .eq("project_id", project.id).order("created_at", { ascending: false }).limit(1);
      }

      const valid = form.participants.filter((p) => p.user_id);
      if (valid.length) {
        const rows = valid.map((p) => ({ project_id: project.id, user_id: p.user_id, modality_id: p.modality_id || null, role_label: p.role_label || null }));
        await supabase.from("project_members").insert(rows as any);
      }

      toast.success("Proyecto creado");
      navigate(`/p/${(project as any).slug ?? project.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally { setSaving(false); }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Crear collab</h1>
        <p className="text-sm text-muted-foreground">Todas las herramientas para lanzar un proyecto. Límite: 2 por día (admins exentos).</p>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <Section icon={Sparkles} title="Información básica">
          <Field label="Nombre">
            <input value={form.name} onChange={(e) => up("name", e.target.value)} className="input" placeholder="Nombre del proyecto" disabled={nameSegments.length > 0} />
          </Field>
          <div className="rounded-lg border bg-secondary/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium"><Palette className="h-4 w-4" /> Nombre con degradados parciales</div>
              <button type="button" onClick={addSegment} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-accent"><Plus className="h-3 w-3" /> Añadir</button>
            </div>
            <div className="space-y-2">
              {nameSegments.map((seg, i) => (
                <div key={i} className="rounded-md border bg-background p-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <input value={seg.text} onChange={(e) => updateSegment(i, { text: e.target.value })} className="input flex-1 min-w-40" placeholder={`Fragmento ${i + 1}`} />
                    <label className="flex items-center gap-1 text-xs">
                      <input type="checkbox" checked={!!seg.gradient}
                        onChange={(e) => updateSegment(i, { gradient: e.target.checked ? { from: "#6366f1", to: "#ec4899", direction: "to right" } : null })} />
                      Degradado
                    </label>
                    {seg.gradient && (<>
                      <input type="color" value={seg.gradient.from} onChange={(e) => updateSegment(i, { gradient: { ...seg.gradient!, from: e.target.value } })} className="h-8 w-10 rounded border" />
                      <input type="color" value={seg.gradient.to} onChange={(e) => updateSegment(i, { gradient: { ...seg.gradient!, to: e.target.value } })} className="h-8 w-10 rounded border" />
                    </>)}
                    <button type="button" onClick={() => removeSegment(i)} className="rounded-md border p-1.5 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"><X className="h-3 w-3" /></button>
                  </div>
                </div>
              ))}
            </div>
            {nameSegments.length > 0 && (
              <div className="mt-3 rounded-md bg-background p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Vista previa</p>
                <p className="text-xl font-bold">
                  {nameSegments.map((s, i) => (<span key={i} style={s.gradient ? gradientStyle(s.gradient) : undefined}>{s.text}</span>))}
                </p>
              </div>
            )}
          </div>
          <Field label="Descripción"><textarea rows={4} value={form.description} onChange={(e) => up("description", e.target.value)} className="input min-h-[100px]" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo"><select value={form.type} onChange={(e) => up("type", e.target.value)} className="input">{PROJECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
            <Field label="Estado"><select value={form.status} onChange={(e) => up("status", e.target.value)} className="input">{PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Field>
            <Field label="Dificultad"><DifficultySelect value={form.difficulty} onChange={(v) => up("difficulty", v)} /></Field>
            <Field label="Progreso (%)"><input type="number" min={0} max={100} value={form.progress} onChange={(e) => up("progress", Number(e.target.value))} className="input" /></Field>
            <Field label="Duración (segundos)"><input type="number" min={0} value={form.duration_seconds} onChange={(e) => up("duration_seconds", Number(e.target.value))} className="input" /></Field>
            <Field label="Estilo"><input value={form.style} onChange={(e) => up("style", e.target.value)} className="input" placeholder="Cyberpunk, dual, effect..." /></Field>
          </div>
        </Section>

        <Section icon={ImageIcon} title="Miniatura y banner">
          <Field label="Miniatura">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-3 text-sm hover:bg-accent">
              <Upload className="h-4 w-4" /><span>{thumbFile ? thumbFile.name : "Subir imagen"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onThumbSelect(e.target.files?.[0] ?? null)} />
            </label>
            {form.thumbnail_url && <img src={form.thumbnail_url} alt="thumb" className="mt-2 aspect-video w-full rounded-lg border object-cover" />}
          </Field>
          <Field label="URL del banner (opcional)">
            <input type="url" value={form.banner_url} onChange={(e) => up("banner_url", e.target.value)} className="input" placeholder="https://…" />
            {form.banner_url && <img src={form.banner_url} alt="banner" className="mt-2 h-24 w-full rounded-lg border object-cover" />}
          </Field>
        </Section>

        <Section icon={Play} title="Vista previa (video)">
          <Field label="URL"><input type="url" value={form.preview_video_url} onChange={(e) => up("preview_video_url", e.target.value)} className="input" placeholder="https://youtu.be/…" /></Field>
          {form.preview_video_url && (
            <div className="rounded-lg border bg-secondary/40 p-3">
              <button type="button" className="inline-flex items-center gap-2 rounded-full border-2 border-primary bg-background px-4 py-2 text-sm font-semibold text-primary">
                {site.data?.preview_button_image_url ? <img src={site.data.preview_button_image_url} alt="" className="h-5 w-5 rounded object-cover" /> : <Play className="h-4 w-4" />}
                Ver vista previa
              </button>
            </div>
          )}
        </Section>

        <Section icon={Music} title="Canción">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre"><input value={form.song_name} onChange={(e) => up("song_name", e.target.value)} className="input" /></Field>
            <Field label="Enlace"><input type="url" value={form.song_url} onChange={(e) => up("song_url", e.target.value)} className="input" /></Field>
          </div>
        </Section>

        <Section icon={Eye} title="Configuración">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Visibilidad"><select value={form.visibility} onChange={(e) => up("visibility", e.target.value)} className="input">{VISIBILITIES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}</select></Field>
            <Field label={<span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Fecha límite</span>}><input type="date" value={form.deadline} onChange={(e) => up("deadline", e.target.value)} className="input" /></Field>
          </div>
          <label className="mt-2 flex items-start gap-3 rounded-lg border bg-secondary/40 p-3">
            <input type="checkbox" checked={form.track_progress_history} onChange={(e) => up("track_progress_history", e.target.checked)} className="mt-1 h-4 w-4" />
            <div><div className="flex items-center gap-2 text-sm font-medium"><History className="h-4 w-4" /> Historial de progreso</div>
              <p className="text-xs text-muted-foreground">Registra cada cambio de porcentaje.</p></div>
          </label>
        </Section>

        <Section icon={FileDown} title="Versión inicial + GD Share (opcional)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Etiqueta"><input value={form.version_label} onChange={(e) => up("version_label", e.target.value)} className="input" placeholder="v0" /></Field>
            <Field label="Archivo GD Share"><label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-3 text-sm hover:bg-accent">
              <Upload className="h-4 w-4" /><span>{gdFile ? gdFile.name : "Subir"}</span>
              <input type="file" className="hidden" accept=".gmd,.dat,.gmd2,.zip,application/octet-stream" onChange={(e) => setGdFile(e.target.files?.[0] ?? null)} />
            </label></Field>
          </div>
        </Section>

        <Section icon={TagIcon} title="Etiquetas">
          <div className="flex gap-2">
            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} className="input" placeholder="Enter para añadir" />
            <button type="button" onClick={addTag} className="rounded-lg border px-3 text-sm hover:bg-accent">Añadir</button>
          </div>
          {form.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {form.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
                  {t}<button type="button" onClick={() => up("tags", form.tags.filter((x) => x !== t))}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
        </Section>

        <Section icon={Sparkles} title="Modalidades requeridas">
          <div className="flex flex-wrap gap-2">
            {mods.data?.map((m: any) => {
              const active = form.required_modalities.includes(m.id);
              return (
                <button type="button" key={m.id}
                  onClick={() => up("required_modalities", active ? form.required_modalities.filter((x) => x !== m.id) : [...form.required_modalities, m.id])}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
                  {m.icon_url && <img src={m.icon_url} alt="" className="h-4 w-4 rounded-sm object-cover" />}{m.name}
                </button>
              );
            })}
          </div>
        </Section>

        <Section icon={Users} title="Participantes">
          <Field label="Co-host">
            <select value={form.cohost_id} onChange={(e) => up("cohost_id", e.target.value)} className="input">
              <option value="">— Ninguno —</option>
              {members.data?.map((m: any) => <option key={m.id} value={m.id}>{m.display_name || m.username}</option>)}
            </select>
          </Field>
          <div className="space-y-2">
            {form.participants.map((p, i) => (
              <div key={i} className="grid gap-2 rounded-lg border bg-secondary/30 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <select value={p.user_id} onChange={(e) => updateParticipant(i, { user_id: e.target.value })} className="input">
                  <option value="">Miembro…</option>
                  {members.data?.map((m: any) => <option key={m.id} value={m.id}>{m.display_name || m.username}</option>)}
                </select>
                <select value={p.modality_id ?? ""} onChange={(e) => updateParticipant(i, { modality_id: e.target.value || null })} className="input">
                  <option value="">Modalidad…</option>
                  {mods.data?.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <input value={p.role_label} onChange={(e) => updateParticipant(i, { role_label: e.target.value })} className="input" placeholder="Rol" />
                <button type="button" onClick={() => removeParticipant(i)} className="inline-flex items-center justify-center rounded-lg border px-3 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"><X className="h-4 w-4" /></button>
              </div>
            ))}
            <button type="button" onClick={addParticipant} className="inline-flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"><Plus className="h-4 w-4" /> Añadir</button>
          </div>
        </Section>

        <Section icon={StickyNote} title="Notas internas">
          <textarea rows={4} value={form.notes} onChange={(e) => up("notes", e.target.value)} className="input min-h-[100px]" />
        </Section>

        <div className="sticky bottom-4 flex justify-end gap-2 rounded-xl border bg-card/95 p-3 shadow-elevated backdrop-blur">
          <Link to="/projects" className="rounded-lg border px-4 py-2 text-sm">Cancelar</Link>
          <button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Crear proyecto
          </button>
        </div>
      </form>

      <style>{`.input{width:100%;border:1px solid var(--color-border);background:var(--color-background);border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem;outline:none;transition:border-color .15s}.input:focus{border-color:var(--color-primary)}.input:disabled{opacity:.5}`}</style>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-soft md:p-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary"><Icon className="h-4 w-4" /></div>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-medium">{label}</span>{children}</label>;
}