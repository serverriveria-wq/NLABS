import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PROJECT_STATUSES, PROJECT_TYPES } from "@/lib/nlab-constants";
import { toast } from "sonner";
import { MediaInput } from "@/spa/components/MediaInput";
import { DifficultySelect } from "@/spa/components/DifficultySelect";
import { useMe } from "@/spa/hooks/useMe";
import {
  ArrowLeft, Loader2, Save, Users, Wrench, Link2, ListChecks, Images,
  Inbox, Trash2, Plus, Check, X, Info, Sliders, Music, ImageIcon,
} from "lucide-react";

type Tab =
  | "basic" | "progress" | "images" | "media"
  | "members" | "deps" | "links" | "tasks" | "gallery" | "requests" | "notes";

export default function EditProject() {
  const { id } = useParams();
  const navigate = useNavigate();
  const me = useMe();

  const q = useQuery({
    queryKey: ["project-edit", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const [f, setF] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("basic");

  useEffect(() => { if (q.data && !f) setF({ ...q.data }); }, [q.data, f]);

  if (q.isLoading || !f) {
    return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (q.isError) return <div className="p-8 text-sm text-destructive">No se pudo cargar el proyecto.</div>;

  function up<K extends string>(k: K, v: any) { setF((s: any) => ({ ...s, [k]: v })); }

  async function save() {
    setSaving(true);
    try {
      const patch = {
        name: f.name,
        description: f.description || null,
        type: f.type,
        status: f.status,
        difficulty: f.difficulty || null,
        progress: Number(f.progress) || 0,
        layout_pct: Number(f.layout_pct) || 0,
        gameplay_pct: Number(f.gameplay_pct) || 0,
        decoration_pct: Number(f.decoration_pct) || 0,
        verification_pct: Number(f.verification_pct) || 0,
        banner_url: f.banner_url || null,
        thumbnail_url: f.thumbnail_url || null,
        preview_video_url: f.preview_video_url || null,
        preview_button_image_url: f.preview_button_image_url || null,
        song_name: f.song_name || null,
        song_url: f.song_url || null,
        style: f.style || null,
        duration_seconds: f.duration_seconds ? Number(f.duration_seconds) : null,
        credits: f.credits || null,
        notes: f.notes || null,
        visibility: f.visibility || "team",
        deadline: f.deadline || null,
        track_progress_history: !!f.track_progress_history,
      };
      const { error } = await supabase.from("projects").update(patch).eq("id", id!);
      if (error) throw error;
      toast.success("Proyecto actualizado");
    } catch (e: any) { toast.error(e.message ?? "Error al guardar"); }
    finally { setSaving(false); }
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "basic", label: "Info", icon: <Info className="h-4 w-4" /> },
    { key: "progress", label: "Progreso", icon: <Sliders className="h-4 w-4" /> },
    { key: "images", label: "Imágenes", icon: <ImageIcon className="h-4 w-4" /> },
    { key: "media", label: "Música & video", icon: <Music className="h-4 w-4" /> },
    { key: "members", label: "Integrantes", icon: <Users className="h-4 w-4" /> },
    { key: "deps", label: "Dependencias", icon: <Wrench className="h-4 w-4" /> },
    { key: "links", label: "Enlaces", icon: <Link2 className="h-4 w-4" /> },
    { key: "tasks", label: "Tareas", icon: <ListChecks className="h-4 w-4" /> },
    { key: "gallery", label: "Galería", icon: <Images className="h-4 w-4" /> },
    { key: "requests", label: "Solicitudes", icon: <Inbox className="h-4 w-4" /> },
    { key: "notes", label: "Notas", icon: <Info className="h-4 w-4" /> },
  ];

  const canSaveBasics = ["basic", "progress", "images", "media", "notes"].includes(tab);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <Helmet><title>Editar {f.name} — NLab</title></Helmet>

      <div className="mb-4 flex items-center justify-between gap-3">
        <Link to={`/projects/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Volver al proyecto
        </Link>
        {canSaveBasics && (
          <button disabled={saving} onClick={save}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar cambios
          </button>
        )}
      </div>

      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Editar proyecto</h1>
      <p className="mt-1 text-sm text-muted-foreground">{f.name}</p>

      <div className="mt-6 flex flex-wrap gap-1 rounded-xl border bg-card p-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}>
            {t.icon} <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-6">
        {tab === "basic" && <BasicSection f={f} up={up} />}
        {tab === "progress" && <ProgressSection f={f} up={up} />}
        {tab === "images" && <ImagesSection f={f} up={up} />}
        {tab === "media" && <MediaSection f={f} up={up} />}
        {tab === "members" && <MembersSection projectId={id!} isOwner={f.created_by === me.data?.profile?.id || f.host_id === me.data?.profile?.id} />}
        {tab === "deps" && <DependenciesSection projectId={id!} />}
        {tab === "links" && <LinksSection projectId={id!} />}
        {tab === "tasks" && <TasksSection projectId={id!} />}
        {tab === "gallery" && <GallerySection projectId={id!} />}
        {tab === "requests" && <RequestsSection projectId={id!} />}
        {tab === "notes" && <NotesSection f={f} up={up} />}
      </div>

      <style>{`.input{width:100%;border:1px solid var(--color-border);background:var(--color-background);border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem;outline:none}.input:focus{border-color:var(--color-primary)}.btn{border-radius:.5rem;padding:.375rem .625rem;font-size:.75rem;border:1px solid var(--color-border);display:inline-flex;align-items:center;gap:.25rem}.btn:hover{background:var(--color-accent)}`}</style>
    </div>
  );
}

/* ============================================================
   Layout helpers
============================================================ */
function Section({ title, children, subtitle }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-soft">
      <div className="mb-4">
        <h2 className="font-semibold">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium">{label}</span>
      {children}
    </label>
  );
}

/* ============================================================
   Basic
============================================================ */
function BasicSection({ f, up }: any) {
  return (
    <Section title="Información básica">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre"><input className="input" value={f.name ?? ""} onChange={(e) => up("name", e.target.value)} /></Field>
        <Field label="Dificultad"><DifficultySelect value={f.difficulty ?? ""} onChange={(v: string) => up("difficulty", v)} /></Field>
        <Field label="Tipo">
          <select className="input" value={f.type} onChange={(e) => up("type", e.target.value)}>
            {PROJECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Estado">
          <select className="input" value={f.status} onChange={(e) => up("status", e.target.value)}>
            {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Estilo"><input className="input" value={f.style ?? ""} onChange={(e) => up("style", e.target.value)} /></Field>
        <Field label="Duración (segundos)"><input type="number" min={0} className="input" value={f.duration_seconds ?? ""} onChange={(e) => up("duration_seconds", e.target.value)} /></Field>
        <Field label="Deadline"><input type="date" className="input" value={f.deadline ?? ""} onChange={(e) => up("deadline", e.target.value)} /></Field>
        <Field label="Visibilidad">
          <select className="input" value={f.visibility ?? "team"} onChange={(e) => up("visibility", e.target.value)}>
            <option value="team">Equipo</option><option value="private">Privado</option><option value="public">Público</option>
          </select>
        </Field>
      </div>
      <Field label="Descripción">
        <textarea rows={5} className="input" value={f.description ?? ""} onChange={(e) => up("description", e.target.value)} />
      </Field>
    </Section>
  );
}

/* ============================================================
   Progress
============================================================ */
function ProgressSection({ f, up }: any) {
  const fields = [
    ["progress", "General %"],
    ["layout_pct", "Layout %"],
    ["gameplay_pct", "Gameplay %"],
    ["decoration_pct", "Decoración %"],
    ["verification_pct", "Verificación %"],
  ] as const;
  return (
    <Section title="Progreso" subtitle="Porcentajes visibles en la ficha del proyecto.">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
        {fields.map(([k, label]) => (
          <Field key={k} label={label}>
            <input type="number" min={0} max={100} className="input" value={f[k] ?? 0} onChange={(e) => up(k, e.target.value)} />
          </Field>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!f.track_progress_history} onChange={(e) => up("track_progress_history", e.target.checked)} />
        Guardar historial de progreso
      </label>
    </Section>
  );
}

/* ============================================================
   Images (banner, thumbnail, preview button image)
============================================================ */
function ImagesSection({ f, up }: any) {
  return (
    <Section title="Imágenes" subtitle="Puedes pegar una URL o subir la imagen desde tu dispositivo.">
      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Miniatura">
          <MediaInput value={f.thumbnail_url} onChange={(v) => up("thumbnail_url", v)} folder="thumbnails" accept="image/*" preview="image" />
        </Field>
        <Field label="Banner">
          <MediaInput value={f.banner_url} onChange={(v) => up("banner_url", v)} folder="banners" accept="image/*" preview="image" />
        </Field>
        <Field label="Imagen del botón de vista previa (música)">
          <MediaInput value={f.preview_button_image_url} onChange={(v) => up("preview_button_image_url", v)} folder="preview-buttons" accept="image/*" preview="image" />
        </Field>
      </div>
    </Section>
  );
}

/* ============================================================
   Media (music + video)
============================================================ */
function MediaSection({ f, up }: any) {
  return (
    <Section title="Música y vista previa">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nombre de la canción"><input className="input" value={f.song_name ?? ""} onChange={(e) => up("song_name", e.target.value)} /></Field>
        <div />
        <Field label="Canción (URL o archivo)">
          <MediaInput value={f.song_url} onChange={(v) => up("song_url", v)} folder="songs" accept="audio/*" preview="audio" />
        </Field>
        <Field label="Vídeo de vista previa (URL o archivo)">
          <MediaInput value={f.preview_video_url} onChange={(v) => up("preview_video_url", v)} folder="videos" accept="video/*" preview="video" />
        </Field>
      </div>
    </Section>
  );
}

/* ============================================================
   Members
============================================================ */
function MembersSection({ projectId, isOwner }: { projectId: string; isOwner: boolean }) {
  const qc = useQueryClient();
  const members = useQuery({
    queryKey: ["edit-members", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("project_members")
        .select("id, user_id, role_label, status, contribution_pct, modality_id, created_at, profiles:user_id(username,display_name,avatar_url), modalities:modality_id(name)")
        .eq("project_id", projectId).order("created_at");
      return data ?? [];
    },
  });
  const modalities = useQuery({
    queryKey: ["modalities"],
    queryFn: async () => (await supabase.from("modalities").select("id,name").order("name")).data ?? [],
  });
  const profiles = useQuery({
    queryKey: ["profiles-lite"],
    queryFn: async () => (await supabase.from("profiles").select("id,username,display_name,avatar_url").order("username")).data ?? [],
  });

  const [addUser, setAddUser] = useState("");
  const [addRole, setAddRole] = useState("");
  const [addModality, setAddModality] = useState<string>("");

  const candidates = useMemo(() => {
    if (!profiles.data || !members.data) return [];
    const taken = new Set(members.data.map((m: any) => m.user_id));
    const query = addUser.toLowerCase().trim();
    return (profiles.data as any[])
      .filter((p) => !taken.has(p.id))
      .filter((p) => !query || p.username.toLowerCase().includes(query) || (p.display_name ?? "").toLowerCase().includes(query))
      .slice(0, 8);
  }, [profiles.data, members.data, addUser]);

  async function addMember(userId: string) {
    const { error } = await supabase.from("project_members").insert({
      project_id: projectId,
      user_id: userId,
      role_label: addRole || null,
      modality_id: addModality || null,
      status: "approved",
    });
    if (error) return toast.error(error.message);
    toast.success("Integrante añadido");
    setAddUser(""); setAddRole(""); setAddModality("");
    qc.invalidateQueries({ queryKey: ["edit-members", projectId] });
  }

  async function update(id: string, patch: any) {
    const { error } = await supabase.from("project_members").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["edit-members", projectId] });
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar integrante?")) return;
    const { error } = await supabase.from("project_members").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Integrante eliminado");
    qc.invalidateQueries({ queryKey: ["edit-members", projectId] });
  }

  return (
    <Section title="Integrantes" subtitle="Añade colaboradores y define su rol, modalidad y contribución.">
      {isOwner && (
        <div className="rounded-xl border bg-secondary/30 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Añadir integrante</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <Field label="Buscar usuario">
              <input className="input" placeholder="Nombre o @usuario" value={addUser} onChange={(e) => setAddUser(e.target.value)} />
            </Field>
            <Field label="Rol">
              <input className="input" placeholder="Ej. Deco" value={addRole} onChange={(e) => setAddRole(e.target.value)} />
            </Field>
            <Field label="Modalidad">
              <select className="input" value={addModality} onChange={(e) => setAddModality(e.target.value)}>
                <option value="">—</option>
                {(modalities.data as any[])?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
          </div>
          {addUser && candidates.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {candidates.map((c: any) => (
                <button key={c.id} onClick={() => addMember(c.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-2 py-1 text-xs hover:border-primary">
                  {c.avatar_url ? <img src={c.avatar_url} className="h-4 w-4 rounded-full object-cover" /> : <span className="h-4 w-4 rounded-full bg-secondary" />}
                  @{c.username}
                  <Plus className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {members.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : !members.data?.length ? (
        <p className="text-sm text-muted-foreground">Sin integrantes todavía.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {members.data.map((m: any) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 p-3">
              {m.profiles?.avatar_url ? (
                <img src={m.profiles.avatar_url} className="h-9 w-9 rounded-full object-cover" />
              ) : <div className="h-9 w-9 rounded-full bg-secondary" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.profiles?.display_name ?? m.profiles?.username ?? "—"}</p>
                <p className="truncate text-xs text-muted-foreground">@{m.profiles?.username} · {m.modalities?.name ?? "sin modalidad"}</p>
              </div>
              <input defaultValue={m.role_label ?? ""} placeholder="Rol"
                onBlur={(e) => e.target.value !== (m.role_label ?? "") && update(m.id, { role_label: e.target.value || null })}
                className="input max-w-[140px]" />
              <input type="number" min={0} max={100} defaultValue={m.contribution_pct ?? 0} title="Contribución %"
                onBlur={(e) => Number(e.target.value) !== (m.contribution_pct ?? 0) && update(m.id, { contribution_pct: Number(e.target.value) || 0 })}
                className="input w-20" />
              <select value={m.status} onChange={(e) => update(m.id, { status: e.target.value })} className="input max-w-[130px]">
                <option value="approved">Aprobado</option>
                <option value="pending">Pendiente</option>
                <option value="rejected">Rechazado</option>
              </select>
              <button onClick={() => remove(m.id)} className="btn hover:bg-destructive hover:text-destructive-foreground">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/* ============================================================
   Dependencies
============================================================ */
function DependenciesSection({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const deps = useQuery({
    queryKey: ["edit-deps", projectId],
    queryFn: async () => (await supabase.from("project_dependencies" as any)
      .select("project_id, dependency_id, created_at")
      .eq("project_id", projectId)).data ?? [],
  });
  const types = useQuery({
    queryKey: ["dependency_types"],
    queryFn: async () => (await supabase.from("dependency_types").select("id,slug,label,icon_url").order("order_index")).data ?? [],
  });


  const active = new Set(((deps.data as any[]) ?? []).map((d) => d.dependency_id));

  async function toggle(id: string, on: boolean) {
    if (on) {
      const { error } = await supabase.from("project_dependencies" as any).insert({ project_id: projectId, dependency_id: id });
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("project_dependencies" as any).delete().eq("project_id", projectId).eq("dependency_id", id);
      if (error) return toast.error(error.message);
    }
    qc.invalidateQueries({ queryKey: ["edit-deps", projectId] });
  }

  return (
    <Section title="Dependencias" subtitle="Marca las herramientas, mods o recursos que necesita este proyecto.">
      {types.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {(types.data as any[])?.map((t) => {
            const on = active.has(t.id);
            return (
              <button key={t.id} onClick={() => toggle(t.id, !on)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${
                  on ? "border-primary bg-primary-soft text-primary" : "hover:border-primary/50"
                }`}>
                {t.icon_url ? <img src={t.icon_url} className="h-6 w-6 rounded object-cover" /> :
                  <span className="grid h-6 w-6 place-items-center rounded bg-secondary text-xs">{t.label[0]}</span>}
                <span className="flex-1 truncate">{t.label}</span>
                {on && <Check className="h-4 w-4" />}
              </button>
            );
          })}
          {!(types.data as any[])?.length && <p className="text-sm text-muted-foreground">Aún no hay tipos de dependencia. Créalos desde Shell.</p>}
        </div>
      )}
    </Section>
  );
}

/* ============================================================
   Links
============================================================ */
function LinksSection({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const links = useQuery({
    queryKey: ["edit-links", projectId],
    queryFn: async () => (await supabase.from("project_links" as any)
      .select("id,url,label,kind,link_type_id,link_types:link_type_id(label,slug,icon_url)")
      .eq("project_id", projectId).order("created_at")).data ?? [],
  });
  const types = useQuery({
    queryKey: ["link_types"],
    queryFn: async () => (await supabase.from("link_types").select("id,slug,label").order("order_index")).data ?? [],
  });
  const [form, setForm] = useState({ url: "", label: "", link_type_id: "" });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.url) return;
    const type = (types.data as any[])?.find((t) => t.id === form.link_type_id);
    const { error } = await supabase.from("project_links" as any).insert({
      project_id: projectId, url: form.url, label: form.label || null,
      link_type_id: form.link_type_id || null, kind: type?.slug ?? "other",
    });
    if (error) return toast.error(error.message);
    setForm({ url: "", label: "", link_type_id: "" });
    qc.invalidateQueries({ queryKey: ["edit-links", projectId] });
  }
  async function remove(id: string) {
    const { error } = await supabase.from("project_links" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["edit-links", projectId] });
  }

  return (
    <Section title="Enlaces">
      <form onSubmit={add} className="grid gap-2 rounded-xl border bg-secondary/30 p-3 sm:grid-cols-4">
        <input required type="url" placeholder="https://…" className="input sm:col-span-2"
          value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
        <input placeholder="Etiqueta (opcional)" className="input"
          value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
        <div className="flex gap-2">
          <select className="input flex-1" value={form.link_type_id} onChange={(e) => setForm({ ...form, link_type_id: e.target.value })}>
            <option value="">Tipo…</option>
            {(types.data as any[])?.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <button className="rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /></button>
        </div>
      </form>
      {links.data?.length ? (
        <ul className="divide-y rounded-xl border">
          {(links.data as any[]).map((l) => (
            <li key={l.id} className="flex items-center gap-3 p-3">
              {l.link_types?.icon_url ? <img src={l.link_types.icon_url} className="h-5 w-5 rounded" /> : <Link2 className="h-4 w-4 text-muted-foreground" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{l.label ?? l.link_types?.label ?? l.kind}</p>
                <p className="truncate text-xs text-muted-foreground">{l.url}</p>
              </div>
              <button onClick={() => remove(l.id)} className="btn hover:bg-destructive hover:text-destructive-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted-foreground">Sin enlaces todavía.</p>}
    </Section>
  );
}

/* ============================================================
   Tasks
============================================================ */
function TasksSection({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const tasks = useQuery({
    queryKey: ["edit-tasks", projectId],
    queryFn: async () => (await supabase.from("project_tasks" as any).select("*").eq("project_id", projectId).order("done").order("created_at", { ascending: false })).data ?? [],
  });
  const [title, setTitle] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const { error } = await supabase.from("project_tasks" as any).insert({ project_id: projectId, title: title.trim() });
    if (error) return toast.error(error.message);
    setTitle("");
    qc.invalidateQueries({ queryKey: ["edit-tasks", projectId] });
  }
  async function toggle(id: string, done: boolean) {
    await supabase.from("project_tasks" as any).update({ done }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["edit-tasks", projectId] });
  }
  async function remove(id: string) {
    await supabase.from("project_tasks" as any).delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["edit-tasks", projectId] });
  }

  return (
    <Section title="Tareas">
      <form onSubmit={add} className="flex gap-2">
        <input className="input flex-1" placeholder="Nueva tarea…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button className="rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /></button>
      </form>
      {tasks.data?.length ? (
        <ul className="divide-y rounded-xl border">
          {(tasks.data as any[]).map((t) => (
            <li key={t.id} className="flex items-center gap-3 p-3">
              <input type="checkbox" checked={!!t.done} onChange={(e) => toggle(t.id, e.target.checked)} />
              <span className={`flex-1 text-sm ${t.done ? "text-muted-foreground line-through" : ""}`}>{t.title}</span>
              <button onClick={() => remove(t.id)} className="btn hover:bg-destructive hover:text-destructive-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted-foreground">Sin tareas.</p>}
    </Section>
  );
}

/* ============================================================
   Gallery
============================================================ */
function GallerySection({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const g = useQuery({
    queryKey: ["edit-gallery", projectId],
    queryFn: async () => (await supabase.from("project_gallery" as any).select("*").eq("project_id", projectId).order("order_index").order("created_at")).data ?? [],
  });
  const [newUrl, setNewUrl] = useState("");
  const [newDesc, setNewDesc] = useState("");

  async function add() {
    if (!newUrl) return;
    const { error } = await supabase.from("project_gallery" as any).insert({
      project_id: projectId, url: newUrl, description: newDesc || null, order_index: (g.data as any[])?.length ?? 0,
    });
    if (error) return toast.error(error.message);
    setNewUrl(""); setNewDesc("");
    qc.invalidateQueries({ queryKey: ["edit-gallery", projectId] });
  }
  async function remove(id: string) {
    await supabase.from("project_gallery" as any).delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["edit-gallery", projectId] });
  }

  return (
    <Section title="Galería" subtitle="Sube o pega URLs de imágenes/videos adicionales del proyecto.">
      <div className="rounded-xl border bg-secondary/30 p-3">
        <Field label="Nueva imagen/video">
          <MediaInput value={newUrl} onChange={setNewUrl} folder="gallery" accept="image/*,video/*" preview="image" />
        </Field>
        <div className="mt-2 flex gap-2">
          <input className="input flex-1" placeholder="Descripción (opcional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          <button onClick={add} disabled={!newUrl} className="rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
      {g.data?.length ? (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {(g.data as any[]).map((item) => (
            <div key={item.id} className="relative overflow-hidden rounded-xl border bg-card">
              <img src={item.url} alt="" className="aspect-video w-full object-cover" />
              {item.description && <p className="px-3 py-2 text-xs text-muted-foreground">{item.description}</p>}
              <button onClick={() => remove(item.id)}
                className="absolute right-2 top-2 rounded-lg bg-background/90 p-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-muted-foreground">Sin ítems.</p>}
    </Section>
  );
}

/* ============================================================
   Join Requests
============================================================ */
function RequestsSection({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["edit-requests", projectId],
    queryFn: async () => (await supabase.from("project_join_requests")
      .select("id,user_id,message,status,created_at, profiles:user_id(username,display_name,avatar_url)")
      .eq("project_id", projectId).eq("status", "pending").order("created_at")).data ?? [],
  });

  async function respond(r: any, accept: boolean) {
    if (accept) {
      const { error: mErr } = await supabase.from("project_members").insert({
        project_id: projectId, user_id: r.user_id, status: "approved",
      });
      if (mErr && !mErr.message.includes("duplicate")) return toast.error(mErr.message);
    }
    const { error } = await supabase.from("project_join_requests")
      .update({ status: accept ? "accepted" : "rejected" }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success(accept ? "Solicitud aceptada" : "Solicitud rechazada");
    qc.invalidateQueries({ queryKey: ["edit-requests", projectId] });
    qc.invalidateQueries({ queryKey: ["edit-members", projectId] });
  }

  return (
    <Section title="Solicitudes de entrada">
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : !q.data?.length ? (
        <p className="text-sm text-muted-foreground">Sin solicitudes pendientes.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {q.data.map((r: any) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 p-3">
              {r.profiles?.avatar_url ? <img src={r.profiles.avatar_url} className="h-9 w-9 rounded-full object-cover" /> : <div className="h-9 w-9 rounded-full bg-secondary" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.profiles?.display_name ?? r.profiles?.username}</p>
                {r.message && <p className="truncate text-xs text-muted-foreground">{r.message}</p>}
              </div>
              <button onClick={() => respond(r, true)} className="btn border-primary text-primary hover:bg-primary hover:text-primary-foreground"><Check className="h-3.5 w-3.5" /> Aceptar</button>
              <button onClick={() => respond(r, false)} className="btn hover:bg-destructive hover:text-destructive-foreground"><X className="h-3.5 w-3.5" /> Rechazar</button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/* ============================================================
   Notes & Credits
============================================================ */
function NotesSection({ f, up }: any) {
  return (
    <Section title="Créditos y notas">
      <Field label="Créditos"><textarea rows={4} className="input" value={f.credits ?? ""} onChange={(e) => up("credits", e.target.value)} /></Field>
      <Field label="Notas privadas"><textarea rows={4} className="input" value={f.notes ?? ""} onChange={(e) => up("notes", e.target.value)} /></Field>
    </Section>
  );
}