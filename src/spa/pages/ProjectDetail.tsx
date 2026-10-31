import { Link, useParams } from "react-router-dom";
import { GdLevelPreview } from "@/spa/components/GdLevelPreview";
import { GithubLink } from "@/spa/components/GithubField";
import { Helmet } from "react-helmet-async";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { statusMeta, typeMeta } from "@/lib/nlab-constants";
import {
  ArrowLeft, MessageCircle, Users as UsersIcon, Calendar, Send, Play, FileDown,
  History, Pencil, Image as ImageIcon, Heart, Eye, UserPlus, MessageSquare,
  Activity, FileText, Link as LinkIcon, ListChecks, Music, Sparkles, X, Search,
  Pin, Reply, Paperclip, Download, Wrench,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DifficultyBadge } from "@/spa/components/DifficultySelect";
import { gradientStyle, useSiteSettings } from "@/lib/site-branding";
import { uploadAndSign } from "@/lib/storage";

import { AdSlot } from "@/spa/components/AdSense";

export function ProjectBySlugPage() {
  const { slug } = useParams();
  const proj = useQuery({
    queryKey: ["project-slug", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("slug", slug!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (proj.isLoading) return <div className="p-8 text-sm text-muted-foreground">Cargando…</div>;
  if (!proj.data) return <div className="p-8">Proyecto no encontrado</div>;
  return <ProjectDetailView project={proj.data} />;
}

export function ProjectByIdPage() {
  const { id } = useParams();
  const proj = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });
  if (proj.isLoading) return <div className="p-8 text-sm text-muted-foreground">Cargando…</div>;
  if (!proj.data) return <div className="p-8">No encontrado</div>;
  return <ProjectDetailView project={proj.data} />;
}

export function ProjectDetailView({ project: p }: { project: any }) {
  const id = p.id;
  const qc = useQueryClient();
  const [chatOpen, setChatOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const me = useQuery({
    queryKey: ["me-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });
  const isAdmin = useQuery({
    queryKey: ["me-is-admin", me.data],
    enabled: !!me.data,
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin", { _user_id: me.data as string });
      return !!data;
    },
  });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      await supabase.from("project_views" as any).insert({ project_id: id, viewer_id: u.user.id } as any);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const s = statusMeta(p.status);
  const t = typeMeta(p.type);
  const canEdit = !!(me.data && (me.data === p.created_by || me.data === p.host_id || me.data === p.cohost_id || isAdmin.data));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <Helmet><title>{p.name} — NLab</title></Helmet>
      <AdSlot placement="project" position="top" className="mb-6" />
      <Link to="/projects" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Proyectos
      </Link>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FavoriteButton projectId={id} />
        <span className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground">
          <Eye className="h-3.5 w-3.5" /> {p.views_count ?? 0} vistas
        </span>
        <JoinButton projectId={id} createdBy={p.created_by} />
        <button onClick={() => setChatOpen(true)} className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1.5 text-xs hover:bg-accent">
          <MessageSquare className="h-3.5 w-3.5" /> Abrir chat
        </button>
        {canEdit && (
          <Link to={`/projects/${id}/edit`} className="ml-auto inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <Pencil className="h-4 w-4" /> Editar
          </Link>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        <div className="h-40 bg-gradient-to-br from-primary/40 to-primary/10"
          style={p.banner_url ? { backgroundImage: `url(${p.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
        <div className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">{t.label}</span>
            <span className="rounded-full border px-2 py-0.5 text-xs">{s.label}</span>
            {p.difficulty && <DifficultyBadge value={p.difficulty} />}
            {p.style && <span className="rounded-full border px-2 py-0.5 text-xs">{p.style}</span>}
            {p.duration_seconds ? <span className="rounded-full border px-2 py-0.5 text-xs">{Math.floor(p.duration_seconds/60)}:{String(p.duration_seconds%60).padStart(2,"0")}</span> : null}
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            {Array.isArray(p.name_segments) && p.name_segments.length > 0
              ? p.name_segments.map((seg: any, i: number) => <span key={i} style={seg.gradient ? gradientStyle(seg.gradient) : undefined}>{seg.text}</span>)
              : p.name}
          </h1>
          {p.description && <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>}
          {p.song_name && (
            <p className="mt-2 inline-flex items-center gap-1 text-sm text-muted-foreground"><Music className="h-3.5 w-3.5" /> {p.song_url ? <a href={p.song_url} target="_blank" rel="noreferrer" className="hover:text-primary">{p.song_name}</a> : p.song_name}</p>
          )}
          {p.preview_video_url && <PreviewVideoButton url={p.preview_video_url} />}
          {((p.github_enabled && p.github_url) || (Array.isArray(p.tools) && p.tools.length > 0)) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {p.github_enabled && <GithubLink url={p.github_url} />}
              {Array.isArray(p.tools) && p.tools.map((t: string) => <span key={t} className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs"><Wrench className="h-3 w-3" /> {t}</span>)}
            </div>
          )}
          <ProgressBars project={p} />
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(p.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <Gallery projectId={id} onPreview={setPreview} />

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Comments projectId={id} qc={qc} canModerate={!!canEdit} meId={me.data ?? null} />
          <Tools projectId={id} />
          <ActivityFeed projectId={id} />
          <ProgressHistory projectId={id} enabled={!!p.track_progress_history} />
          {p.song_url && (
            <section className="rounded-2xl border bg-card p-5">
              <h2 className="mb-2 flex items-center gap-2 font-semibold">🎵 {p.song_name || "Canción"}</h2>
              <MusicPreviewPlayer url={p.song_url} title={p.song_name || "Canción"} />
            </section>
          )}
          <DependenciesView projectId={id} />
          {p.credits && (
            <section className="rounded-2xl border bg-card p-5">
              <h2 className="mb-2 flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4" /> Créditos</h2>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{p.credits}</p>
            </section>
          )}
        </div>
        <div className="space-y-6">
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold"><UsersIcon className="h-4 w-4" /> Participantes</h2>
            <Participants projectId={id} ownerId={p.created_by} />
          </div>
        </div>
      </div>

      {p.level_id && <GdLevelPreview levelId={p.level_id} className="mt-6" />}

      <AdSlot placement="project" position="bottom" className="mt-8" />

      {chatOpen && <ChatDrawer projectId={id} onClose={() => setChatOpen(false)} />}
      {preview && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" onClick={() => setPreview(null)}>
          <img src={preview} alt="" className="max-h-[90vh] max-w-full rounded-xl" />
        </div>
      )}
    </div>
  );
}

/* ==================== ACTIONS ==================== */

function FavoriteButton({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["fav", projectId],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data } = await supabase.from("project_favorites" as any).select("project_id").eq("user_id", u.user.id).eq("project_id", projectId).maybeSingle();
      return !!data;
    },
  });
  async function toggle() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    if (q.data) await supabase.from("project_favorites" as any).delete().eq("user_id", u.user.id).eq("project_id", projectId);
    else await supabase.from("project_favorites" as any).insert({ user_id: u.user.id, project_id: projectId } as any);
    qc.invalidateQueries({ queryKey: ["fav", projectId] });
  }
  return (
    <button onClick={toggle} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition ${q.data ? "border-primary bg-primary-soft text-primary" : "bg-card hover:bg-accent"}`}>
      <Heart className={`h-3.5 w-3.5 ${q.data ? "fill-current" : ""}`} /> Favorito
    </button>
  );
}

function JoinButton({ projectId, createdBy }: { projectId: string; createdBy: string }) {
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);
  const me = useQuery({ queryKey: ["me-id"], queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null });
  const q = useQuery({
    queryKey: ["join-req", projectId],
    queryFn: async () => {
      if (!me.data) return null;
      const { data } = await supabase.from("project_join_requests" as any).select("status").eq("project_id", projectId).eq("user_id", me.data).maybeSingle();
      return data;
    },
    enabled: !!me.data,
  });
  if (me.data === createdBy) return null;
  const status = (q.data as any)?.status;
  async function submit() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("project_join_requests" as any).insert({ project_id: projectId, user_id: u.user.id, message: msg || null } as any);
    if (error) toast.error(error.message); else toast.success("Solicitud enviada");
    setOpen(false); setMsg("");
    qc.invalidateQueries({ queryKey: ["join-req", projectId] });
  }
  if (status === "pending") return <span className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground">Solicitud pendiente</span>;
  if (status === "approved") return <span className="inline-flex items-center gap-1 rounded-full border bg-primary-soft px-3 py-1.5 text-xs text-primary">Aprobado</span>;
  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1.5 text-xs hover:bg-accent"><UserPlus className="h-3.5 w-3.5" /> Solicitar unirse</button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border bg-card p-5">
            <h3 className="mb-2 font-semibold">Solicitar unirse</h3>
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} placeholder="Cuéntale al host qué puedes aportar…" className="w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-lg border px-3 py-1.5 text-sm">Cancelar</button>
              <button onClick={submit} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">Enviar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ==================== SECTIONS ==================== */

function ProgressBars({ project }: { project: any }) {
  const rows: [string, number][] = [
    ["General", project.progress ?? 0],
    ["Layout", project.layout_pct ?? 0],
    ["Gameplay", project.gameplay_pct ?? 0],
    ["Decoración", project.decoration_pct ?? 0],
    ["Verificación", project.verification_pct ?? 0],
  ];
  return (
    <div className="mt-4 space-y-2">
      {rows.map(([l, v]) => (
        <div key={l}>
          <div className="flex items-center justify-between text-xs"><span>{l}</span><span className="text-muted-foreground">{v}%</span></div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${v}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Gallery({ projectId, onPreview }: { projectId: string; onPreview: (url: string) => void }) {
  const q = useQuery({
    queryKey: ["gallery-view", projectId],
    queryFn: async () => (await supabase.from("project_gallery" as any).select("*").eq("project_id", projectId).order("order_index").order("created_at")).data ?? [],
  });
  if (!q.data || q.data.length === 0) return null;
  return (
    <div className="mt-6 rounded-2xl border bg-card p-5">
      <h2 className="mb-4 flex items-center gap-2 font-semibold"><ImageIcon className="h-4 w-4" /> Galería</h2>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {q.data.map((g: any) => (
          <div key={g.id} className="overflow-hidden rounded-xl border bg-background">
            <button type="button" onClick={() => onPreview(g.url)} className="block w-full">
              <img src={g.url} alt={g.description ?? ""} className="aspect-video w-full object-cover" />
            </button>
            <div className="p-2">
              {g.description && <p className="line-clamp-2 text-xs">{g.description}</p>}
              <p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(g.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Comments({ projectId, qc, canModerate, meId }: { projectId: string; qc: any; canModerate: boolean; meId: string | null }) {
  const [comment, setComment] = useState("");
  const [search, setSearch] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);

  const q = useQuery({
    queryKey: ["project-comments", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_comments")
        .select("id, content, created_at, user_id, parent_id")
        .eq("project_id", projectId).order("created_at", { ascending: false });
      if (error) { toast.error(error.message); return []; }
      const rows = (data ?? []) as any[];
      const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
      let byId: Record<string, any> = {};
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", userIds);
        byId = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
      }
      return rows.map((r) => ({ ...r, profiles: byId[r.user_id] ?? null }));
    },
  });
  const atts = useQuery({
    queryKey: ["comment-attachments", projectId],
    queryFn: async () => (await supabase.from("project_comment_attachments" as any).select("*, project_comments!inner(project_id)").eq("project_comments.project_id", projectId)).data ?? [],
  });

  const myTodayCount = useMemo(() => {
    if (!meId) return 0;
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return (q.data ?? []).filter((c: any) => c.user_id === meId && new Date(c.created_at).getTime() >= cutoff).length;
  }, [q.data, meId]);
  const remaining = canModerate ? Infinity : Math.max(0, 2 - myTodayCount);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim() && !attachment) return;
    if (!canModerate && remaining <= 0) { toast.error("Has alcanzado el límite de 2 comentarios en 24 horas."); return; }
    setPosting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: inserted, error } = await supabase.from("project_comments").insert({
        project_id: projectId, user_id: u.user.id, content: comment.trim(), parent_id: replyTo as any,
      } as any).select("id").single();
      if (error) { toast.error(error.message); return; }
      if (attachment) {
        try {
          const url = await uploadAndSign("project-media", attachment, `comments/${projectId}`);
          await supabase.from("project_comment_attachments" as any).insert({ comment_id: (inserted as any).id, url } as any);
        } catch (e: any) { toast.error(e.message); }
      }
      setComment(""); setReplyTo(null); setAttachment(null);
      qc.invalidateQueries({ queryKey: ["project-comments", projectId] });
      qc.invalidateQueries({ queryKey: ["comment-attachments", projectId] });
    } finally { setPosting(false); }
  }

  async function moderate(id: string) {
    if (!confirm("¿Eliminar este comentario?")) return;
    const { error } = await supabase.from("project_comments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Comentario eliminado");
    qc.invalidateQueries({ queryKey: ["project-comments", projectId] });
  }

  const filtered = useMemo(() => {
    const all = q.data ?? [];
    if (!search) return all;
    return all.filter((c: any) => (c.content || "").toLowerCase().includes(search.toLowerCase()));
  }, [q.data, search]);

  const roots = filtered.filter((c: any) => !c.parent_id);
  const attsByComment: Record<string, any[]> = {};
  (atts.data ?? []).forEach((a: any) => { (attsByComment[a.comment_id] ??= []).push(a); });

  const [preview, setPreview] = useState<string | null>(null);

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold"><MessageCircle className="h-4 w-4" /> Comentarios</h2>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…" className="w-48 rounded-lg border bg-background py-1.5 pl-7 pr-2 text-xs" />
        </div>
      </div>
      {meId ? (
        <form onSubmit={post} className="mb-4 space-y-2">
          {replyTo && <p className="text-xs text-muted-foreground">Respondiendo… <button type="button" onClick={() => setReplyTo(null)} className="text-primary underline">cancelar</button></p>}
          <div className="flex gap-2">
            <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Escribe un comentario…" className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm" />
            <label className="inline-flex cursor-pointer items-center rounded-lg border px-2 hover:bg-accent" title="Adjuntar archivo"><Paperclip className="h-4 w-4" /><input type="file" className="hidden" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} /></label>
            <button disabled={posting || (!canModerate && remaining <= 0)} className="rounded-lg bg-primary px-3 py-2 text-primary-foreground disabled:opacity-50"><Send className="h-4 w-4" /></button>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {attachment ? <span>📎 {attachment.name} <button type="button" onClick={() => setAttachment(null)} className="ml-1 text-primary underline">quitar</button></span> : <span />}
            {!canModerate && <span>{remaining} de 2 restantes hoy</span>}
          </div>
        </form>
      ) : (
        <p className="mb-4 text-xs text-muted-foreground">Inicia sesión para comentar.</p>
      )}
      <div className="space-y-3">
        {roots.length === 0 && <p className="text-sm text-muted-foreground">Sin comentarios.</p>}
        {roots.map((c: any) => (
          <CommentItem key={c.id} c={c} atts={attsByComment[c.id] ?? []} replies={filtered.filter((r: any) => r.parent_id === c.id)} attsAll={attsByComment} onReply={setReplyTo} onModerate={moderate} canModerate={canModerate} meId={meId} onPreview={setPreview} />
        ))}
      </div>
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreview(null)}>
          <button onClick={(e) => { e.stopPropagation(); setPreview(null); }} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><X className="h-5 w-5" /></button>
          <a href={preview} download onClick={(e) => e.stopPropagation()} className="absolute right-16 top-4 inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/20"><Download className="h-4 w-4" /> Descargar</a>
          <img src={preview} alt="" className="max-h-full max-w-full rounded object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </section>
  );
}

function fileNameFromUrl(url: string) {
  try {
    const path = new URL(url).pathname;
    const name = decodeURIComponent(path.split("/").pop() || "archivo");
    return name.length > 40 ? name.slice(0, 37) + "…" : name;
  } catch { return "archivo"; }
}

function AttachmentChip({ a, size = "md", onPreview }: { a: any; size?: "sm" | "md"; onPreview: (url: string) => void }) {
  const isImg = /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(a.url);
  const dim = size === "sm" ? "h-14 w-14" : "h-20 w-20";
  const pad = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2 py-1 text-xs";
  if (isImg) {
    return (
      <div className="group relative">
        <button type="button" onClick={() => onPreview(a.url)} className={`${dim} block overflow-hidden rounded border`}>
          <img src={a.url} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
        </button>
        <a href={a.url} download onClick={(e) => e.stopPropagation()} title="Descargar" className="absolute bottom-0.5 right-0.5 rounded bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"><Download className="h-3 w-3" /></a>
      </div>
    );
  }
  return (
    <div className={`inline-flex items-center gap-1 rounded border bg-background ${pad}`}>
      <FileText className="h-3 w-3 shrink-0" />
      <a href={a.url} target="_blank" rel="noreferrer" className="max-w-[160px] truncate hover:text-primary">{fileNameFromUrl(a.url)}</a>
      <a href={a.url} download title="Descargar" className="ml-1 text-muted-foreground hover:text-primary"><Download className="h-3 w-3" /></a>
    </div>
  );
}

function CommentItem({ c, atts, replies, attsAll, onReply, onModerate, canModerate, meId, onPreview }: any) {
  const canDel = canModerate || meId === c.user_id;
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{c.profiles?.display_name ?? c.profiles?.username ?? "Usuario"}</span>
        <div className="flex items-center gap-2">
          <span>{new Date(c.created_at).toLocaleString()}</span>
          {canDel && <button onClick={() => onModerate(c.id)} className="rounded p-1 hover:bg-destructive hover:text-destructive-foreground" title="Eliminar"><X className="h-3 w-3" /></button>}
        </div>
      </div>
      <p className="mt-1 text-sm whitespace-pre-wrap">{c.content}</p>
      {atts.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {atts.map((a: any) => <AttachmentChip key={a.id} a={a} onPreview={onPreview} />)}
        </div>
      )}
      <button onClick={() => onReply(c.id)} className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><Reply className="h-3 w-3" /> Responder</button>
      {replies.length > 0 && (
        <div className="mt-3 space-y-2 border-l-2 border-muted pl-3">
          {replies.map((r: any) => {
            const canDelR = canModerate || meId === r.user_id;
            return (
              <div key={r.id} className="rounded border bg-card p-2 text-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{r.profiles?.display_name ?? r.profiles?.username}</span>
                  <div className="flex items-center gap-2">
                    <span>{new Date(r.created_at).toLocaleString()}</span>
                    {canDelR && <button onClick={() => onModerate(r.id)} className="rounded p-1 hover:bg-destructive hover:text-destructive-foreground" title="Eliminar"><X className="h-3 w-3" /></button>}
                  </div>
                </div>
                <p className="mt-1 whitespace-pre-wrap">{r.content}</p>
                {(attsAll[r.id] ?? []).length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {attsAll[r.id].map((a: any) => <AttachmentChip key={a.id} a={a} size="sm" onPreview={onPreview} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Tools({ projectId }: { projectId: string }) {
  const tasks = useQuery({ queryKey: ["tasks-v", projectId], queryFn: async () => (await supabase.from("project_tasks" as any).select("*").eq("project_id", projectId).order("done").order("created_at", { ascending: false })).data ?? [] });
  const files = useQuery({ queryKey: ["files-v", projectId], queryFn: async () => (await supabase.from("project_files" as any).select("*").eq("project_id", projectId).order("created_at", { ascending: false })).data ?? [] });
  const links = useQuery({ queryKey: ["links-v", projectId], queryFn: async () => (await supabase.from("project_links" as any).select("*, link_types:link_type_id(slug,label,icon_url)").eq("project_id", projectId).order("created_at", { ascending: false })).data ?? [] });
  const hasAny = (tasks.data?.length || 0) + (files.data?.length || 0) + (links.data?.length || 0) > 0;
  if (!hasAny) return null;
  return (
    <section className="rounded-2xl border bg-card p-5 space-y-4">
      <h2 className="flex items-center gap-2 font-semibold">Herramientas</h2>
      {tasks.data && tasks.data.length > 0 && (
        <div><h3 className="mb-2 flex items-center gap-1 text-sm font-medium"><ListChecks className="h-3.5 w-3.5" /> Tareas</h3>
          <ul className="space-y-1 text-sm">
            {tasks.data.map((t: any) => <li key={t.id} className={t.done ? "text-muted-foreground line-through" : ""}>• {t.title}</li>)}
          </ul>
        </div>
      )}
      {links.data && links.data.length > 0 && (
        <div><h3 className="mb-2 flex items-center gap-1 text-sm font-medium"><LinkIcon className="h-3.5 w-3.5" /> Enlaces</h3>
          <div className="flex flex-wrap gap-2">
            {links.data.map((l: any) => {
              const t = l.link_types;
              return (
                <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs hover:bg-accent">
                  {t?.icon_url
                    ? <img src={t.icon_url} alt="" className="h-4 w-4 rounded object-cover" />
                    : <span className="rounded-full bg-primary-soft px-1.5 text-[10px] uppercase text-primary">{t?.label || l.kind}</span>}
                  {l.label || l.url}
                </a>
              );
            })}
          </div>
        </div>
      )}
      {files.data && files.data.length > 0 && (
        <div><h3 className="mb-2 flex items-center gap-1 text-sm font-medium"><FileText className="h-3.5 w-3.5" /> Archivos</h3>
          <ul className="space-y-1 text-sm">
            {files.data.map((f: any) => <li key={f.id}><a href={f.url} target="_blank" rel="noreferrer" className="hover:text-primary">{f.name}</a></li>)}
          </ul>
        </div>
      )}
    </section>
  );
}

function ActivityFeed({ projectId }: { projectId: string }) {
  const q = useQuery({
    queryKey: ["activity", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("project_activity" as any).select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(30);
      const rows = (data ?? []) as any[];
      const ids = Array.from(new Set(rows.map((r) => r.actor_id).filter(Boolean)));
      let byId: Record<string, any> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, username, display_name").in("id", ids);
        byId = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
      }
      return rows.map((r) => ({ ...r, profiles: byId[r.actor_id] ?? null }));
    },
  });
  if (!q.data || q.data.length === 0) return null;
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="mb-3 flex items-center gap-2 font-semibold"><Activity className="h-4 w-4" /> Actividad</h2>
      <div className="space-y-1 text-sm">
        {q.data.map((a: any) => (
          <div key={a.id} className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
            <span className="font-medium">{a.profiles?.display_name ?? a.profiles?.username ?? "Sistema"}</span>
            <span className="text-muted-foreground">{a.action}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Participants({ projectId, ownerId }: { projectId: string; ownerId: string }) {
  const [search, setSearch] = useState("");
  const q = useQuery({
    queryKey: ["project-members-v", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("project_members")
        .select("id, role_label, user_id, modality_id, status, contribution_pct, modalities:modality_id(name)" as any)
        .eq("project_id", projectId);
      const rows = (data ?? []) as any[];
      const ids = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
      let byId: Record<string, any> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", ids);
        byId = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
      }
      return rows.map((r) => ({ ...r, profiles: byId[r.user_id] ?? null }));
    },
  });
  const owner = useQuery({
    queryKey: ["project-owner", ownerId],
    queryFn: async () => (await supabase.from("profiles").select("username, display_name, avatar_url").eq("id", ownerId).maybeSingle()).data,
  });
  const filtered = (q.data ?? []).filter((m: any) => {
    if (!search) return true;
    const name = (m.profiles?.display_name || m.profiles?.username || "").toLowerCase();
    return name.includes(search.toLowerCase());
  });
  return (
    <div className="space-y-2">
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar participante…" className="w-full rounded-lg border bg-background py-1.5 pl-7 pr-2 text-xs" />
      </div>
      {owner.data && (
        <div className="flex items-center gap-2 rounded-lg border bg-background p-2">
          {owner.data.avatar_url
            ? <img src={owner.data.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
            : <div className="grid h-8 w-8 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">{(owner.data.display_name ?? owner.data.username ?? "?").slice(0,1).toUpperCase()}</div>}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{owner.data.display_name ?? owner.data.username}</p>
            <p className="text-xs text-muted-foreground">Creador / Host</p>
          </div>
        </div>
      )}
      {filtered.map((m: any) => (
        <div key={m.id} className="flex items-center gap-2 rounded-lg border bg-background p-2">
          {m.profiles?.avatar_url
            ? <img src={m.profiles.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
            : <div className="grid h-8 w-8 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">{(m.profiles?.display_name ?? m.profiles?.username ?? "?").slice(0,1).toUpperCase()}</div>}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{m.profiles?.display_name ?? m.profiles?.username ?? "Usuario"}</p>
            <p className="truncate text-xs text-muted-foreground">{m.role_label ?? m.modalities?.name ?? "Miembro"} · {m.contribution_pct ?? 0}%</p>
          </div>
          {m.status && m.status !== "approved" && <span className="rounded-full border px-2 py-0.5 text-[10px]">{m.status}</span>}
        </div>
      ))}
      {filtered.length === 0 && <p className="text-xs text-muted-foreground">Sin resultados.</p>}
    </div>
  );
}

function ChatDrawer({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [presence, setPresence] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = useQuery({
    queryKey: ["chat", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_chat_messages" as any)
        .select("*").eq("project_id", projectId).order("created_at");
      if (error) { toast.error(error.message); return []; }
      const msgs = (data ?? []) as any[];
      const userIds = Array.from(new Set(msgs.map((m) => m.user_id).filter(Boolean)));
      let profilesById: Record<string, any> = {};
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", userIds);
        profilesById = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
      }
      return msgs.map((m) => ({ ...m, profiles: profilesById[m.user_id] ?? null }));
    },
  });
  const attachments = useQuery({
    queryKey: ["chat-atts", projectId, (messages.data ?? []).length],
    queryFn: async () => {
      const ids = (messages.data ?? []).map((m: any) => m.id);
      if (!ids.length) return [];
      return (await supabase.from("project_chat_attachments" as any).select("*").in("message_id", ids)).data ?? [];
    },
    enabled: !!messages.data,
  });

  useEffect(() => {
    const ch = supabase.channel(`chat-${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_chat_messages", filter: `project_id=eq.${projectId}` }, () => {
        qc.invalidateQueries({ queryKey: ["chat", projectId] });
        qc.invalidateQueries({ queryKey: ["chat-atts", projectId] });
      })
      .on("presence", { event: "sync" }, () => {
        const state = ch.presenceState();
        setPresence(Object.values(state).flat().map((p: any) => p.name || p.user_id).filter(Boolean));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const { data: u } = await supabase.auth.getUser();
          const { data: prof } = await supabase.from("profiles").select("display_name, username").eq("id", u.user?.id ?? "").maybeSingle();
          await ch.track({ user_id: u.user?.id, name: prof?.display_name || prof?.username || "Usuario" });
        }
      });
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages.data]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && !file) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: msg, error } = await supabase.from("project_chat_messages" as any).insert({ project_id: projectId, user_id: u.user.id, body: text.trim() || null } as any).select("id").single();
    if (error) return toast.error(error.message);
    if (file) {
      try {
        const url = await uploadAndSign("project-media", file, `chat/${projectId}`);
        await supabase.from("project_chat_attachments" as any).insert({ message_id: (msg as any).id, url, kind: file.type.startsWith("image/") ? "image" : "file", name: file.name } as any);
      } catch (e: any) { toast.error(e.message); }
    }
    setText(""); setFile(null);
  }

  async function togglePin(id: string, pinned: boolean) {
    await supabase.from("project_chat_messages" as any).update({ pinned: !pinned } as any).eq("id", id);
  }

  const attsByMsg: Record<string, any[]> = {};
  (attachments.data ?? []).forEach((a: any) => { (attsByMsg[a.message_id] ??= []).push(a); });

  const filtered = (messages.data ?? []).filter((m: any) => !search || (m.body || "").toLowerCase().includes(search.toLowerCase()));
  const pinned = (messages.data ?? []).filter((m: any) => m.pinned);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-md flex-col bg-card border-l">
        <div className="flex items-center justify-between border-b p-3">
          <div>
            <h3 className="font-semibold">Chat del proyecto</h3>
            <p className="text-[10px] text-muted-foreground">{presence.length} conectado{presence.length === 1 ? "" : "s"}: {presence.join(", ") || "—"}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="border-b p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar mensajes…" className="w-full rounded-lg border bg-background py-1.5 pl-7 pr-2 text-xs" />
          </div>
          {pinned.length > 0 && (
            <div className="mt-2 space-y-1">
              {pinned.map((m: any) => (
                <div key={m.id} className="flex items-center gap-1 rounded border bg-primary-soft/50 p-1.5 text-[11px]">
                  <Pin className="h-3 w-3 text-primary" />
                  <span className="truncate flex-1">{m.body}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.map((m: any) => (
            <div key={m.id} className="rounded-lg border bg-background p-2 text-sm">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="font-medium text-foreground">{m.profiles?.display_name || m.profiles?.username || "?"}</span>
                <span className="flex items-center gap-1">
                  {new Date(m.created_at).toLocaleTimeString()}
                  <button onClick={() => togglePin(m.id, m.pinned)} className={`rounded p-0.5 ${m.pinned ? "text-primary" : "hover:text-primary"}`}><Pin className="h-3 w-3" /></button>
                </span>
              </div>
              {m.body && <p className="mt-1 whitespace-pre-wrap">{renderMentions(m.body)}</p>}
              {(attsByMsg[m.id] ?? []).map((a: any) => (
                a.kind === "image"
                  ? <a key={a.id} href={a.url} target="_blank" rel="noreferrer"><img src={a.url} className="mt-1 max-h-40 rounded border object-cover" /></a>
                  : <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 text-xs hover:text-primary"><FileText className="h-3 w-3" />{a.name}</a>
              ))}
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-xs text-muted-foreground">Sin mensajes.</p>}
        </div>
        <form onSubmit={send} className="border-t p-2 space-y-1">
          <div className="flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe… usa @nombre para mencionar" className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm" />
            <label className="inline-flex cursor-pointer items-center rounded-lg border px-2 hover:bg-accent"><Paperclip className="h-4 w-4" /><input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
            <button className="rounded-lg bg-primary px-3 text-primary-foreground"><Send className="h-4 w-4" /></button>
          </div>
          {file && <p className="text-xs text-muted-foreground">📎 {file.name}</p>}
        </form>
      </div>
    </div>
  );
}

function renderMentions(text: string) {
  const parts = text.split(/(@\w+)/g);
  return parts.map((p, i) => p.startsWith("@") ? <span key={i} className="rounded bg-primary-soft px-1 text-primary">{p}</span> : <span key={i}>{p}</span>);
}

function PreviewVideoButton({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  const site = useSiteSettings();
  const isYT = /youtube\.com|youtu\.be/.test(url);
  const ytId = isYT ? (url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/)?.[1]) : null;
  return (
    <div className="mt-4">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border-2 border-primary bg-background px-4 py-2 text-sm font-semibold text-primary shadow-soft hover:bg-primary hover:text-primary-foreground transition">
        {site.data?.preview_button_image_url ? <img src={site.data.preview_button_image_url} alt="" className="h-5 w-5 rounded object-cover" /> : <Play className="h-4 w-4" />}
        {open ? "Ocultar vista previa" : "Ver vista previa"}
      </button>
      {open && (
        <div className="mt-3 overflow-hidden rounded-xl border bg-black">
          {ytId ? <iframe className="aspect-video w-full" src={`https://www.youtube.com/embed/${ytId}`} allow="autoplay; encrypted-media" allowFullScreen />
                : <video className="aspect-video w-full" src={url} controls />}
        </div>
      )}
    </div>
  );
}

function MusicPreviewPlayer({ url, title }: { url: string; title: string }) {
  const site = useSiteSettings();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const btnImg = site.data?.preview_button_image_url;

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) { a.play(); } else { a.pause(); }
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <div className="flex items-center gap-4 rounded-xl border bg-background p-3">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pausar" : "Reproducir"}
        className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-primary bg-primary-soft shadow-soft transition hover:scale-105"
      >
        {btnImg ? (
          <img src={btnImg} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground">
            <Music className="h-6 w-6" />
          </div>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition group-hover:opacity-100">
          {playing ? (
            <span className="flex gap-0.5"><span className="h-4 w-1 bg-white" /><span className="h-4 w-1 bg-white" /></span>
          ) : (
            <Play className="h-6 w-6 fill-white" />
          )}
        </span>
        {playing && (
          <span className="absolute inset-0 rounded-full ring-2 ring-primary animate-pulse" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <div
          className="mt-2 h-1.5 cursor-pointer overflow-hidden rounded-full bg-muted"
          onClick={(e) => {
            const a = audioRef.current;
            if (!a || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            a.currentTime = pct * duration;
          }}
        >
          <div className="h-full bg-primary transition-all" style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>{fmt(progress)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />
    </div>
  );
}

function ProgressHistory({ projectId, enabled }: { projectId: string; enabled: boolean }) {
  const history = useQuery({
    queryKey: ["project-history", projectId], enabled,
    queryFn: async () => (await supabase.from("project_progress_history" as any).select("id, progress, note, created_at, gd_share_url, version_label").eq("project_id", projectId).order("created_at", { ascending: false })).data ?? [],
  });
  if (!enabled) return null;
  return (
    <div className="rounded-2xl border bg-card p-5">
      <h2 className="mb-4 flex items-center gap-2 font-semibold"><History className="h-4 w-4" /> Historial de progreso</h2>
      {history.data && history.data.length > 0 ? (
        <div className="space-y-2">
          {history.data.map((h: any) => (
            <div key={h.id} className="flex flex-wrap items-center gap-3 rounded-lg border bg-background p-3 text-sm">
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">{h.progress}%</span>
              {h.version_label && <span className="rounded-full border px-2 py-0.5 text-xs">{h.version_label}</span>}
              <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span>
              <div className="ml-auto">
                {h.gd_share_url && <a href={h.gd_share_url} download className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium hover:bg-accent"><FileDown className="h-3.5 w-3.5" /> GD Share</a>}
              </div>
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-muted-foreground">Aún no hay versiones registradas.</p>}
    </div>
  );
}

function DependenciesView({ projectId }: { projectId: string }) {
  const q = useQuery({
    queryKey: ["project-deps-view", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("project_dependencies" as any)
        .select("dependency_id, dependency_types(id,label,icon_url,order_index)")
        .eq("project_id", projectId);
      return (data ?? []).map((r: any) => r.dependency_types).filter(Boolean)
        .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0));
    },
  });
  if (!q.data?.length) return null;
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="mb-3 flex items-center gap-2 font-semibold"><Wrench className="h-4 w-4" /> Dependencias</h2>
      <div className="flex flex-wrap gap-2">
        {q.data.map((d: any) => (
          <span key={d.id} className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs">
            {d.icon_url ? <img src={d.icon_url} alt="" className="h-4 w-4 rounded object-cover" /> : <Wrench className="h-3.5 w-3.5" />}
            {d.label}
          </span>
        ))}
      </div>
    </section>
  );
}