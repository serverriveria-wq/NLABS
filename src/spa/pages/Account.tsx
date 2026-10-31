import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, KeyRound, FolderKanban, Pencil, Upload, Loader2, Inbox, Check, X, Link2 } from "lucide-react";
import { useSocialTypes } from "@/spa/components/UserSocials";
import { uploadAndSign } from "@/lib/storage";
import { useMe } from "@/spa/hooks/useMe";
import { ThemeToggle } from "@/spa/components/ThemeToggle";
import { DeleteAccountCard } from "@/spa/components/DeleteAccountCard";

export default function Account() {
  const qc = useQueryClient();
  const me = useMe();

  const mods = useQuery({
    queryKey: ["all-modalities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("modalities").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const myProjects = useQuery({
    queryKey: ["my-projects", me.data?.profile?.id],
    enabled: !!me.data?.profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects")
        .select("id, name, thumbnail_url, status, progress, updated_at")
        .eq("created_by", me.data!.profile!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const joinRequests = useQuery({
    queryKey: ["my-join-requests", me.data?.profile?.id],
    enabled: !!me.data?.profile?.id,
    queryFn: async () => {
      const uid = me.data!.profile!.id;
      const { data: projs } = await supabase
        .from("projects")
        .select("id, name")
        .or(`created_by.eq.${uid},host_id.eq.${uid},cohost_id.eq.${uid}`);
      const ids = (projs ?? []).map((p: any) => p.id);
      if (ids.length === 0) return [];
      const { data: reqs, error } = await supabase
        .from("project_join_requests")
        .select("id, project_id, user_id, message, status, created_at")
        .in("project_id", ids)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const userIds = Array.from(new Set((reqs ?? []).map((r: any) => r.user_id)));
      const { data: profs } = userIds.length
        ? await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", userIds)
        : { data: [] as any[] };
      const pMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      const projMap = new Map((projs ?? []).map((p: any) => [p.id, p]));
      return (reqs ?? []).map((r: any) => ({ ...r, profile: pMap.get(r.user_id), project: projMap.get(r.project_id) }));
    },
  });

  async function respondRequest(r: any, accept: boolean) {
    try {
      if (accept) {
        const { error: memErr } = await supabase.from("project_members").insert({
          project_id: r.project_id, user_id: r.user_id, status: "approved",
        });
        if (memErr && !String(memErr.message).toLowerCase().includes("duplicate")) throw memErr;
      }
      const { error } = await supabase
        .from("project_join_requests")
        .update({ status: accept ? "accepted" : "rejected" })
        .eq("id", r.id);
      if (error) throw error;
      toast.success(accept ? "Solicitud aceptada" : "Solicitud rechazada");
      qc.invalidateQueries({ queryKey: ["my-join-requests"] });
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    }
  }

  const [form, setForm] = useState({ display_name: "", bio: "", avatar_url: "", banner_url: "" });
  const [pw, setPw] = useState("");
  const [uploading, setUploading] = useState<"avatar" | "banner" | null>(null);

  useEffect(() => {
    if (me.data?.profile) setForm({
      display_name: me.data.profile.display_name ?? "",
      bio: me.data.profile.bio ?? "",
      avatar_url: me.data.profile.avatar_url ?? "",
      banner_url: me.data.profile.banner_url ?? "",
    });
  }, [me.data]);

  async function persist(next: typeof form) {
    const uid = me.data?.profile?.id;
    if (!uid) return;
    const { error } = await supabase.from("profiles").update({
      display_name: next.display_name,
      bio: next.bio,
      avatar_url: next.avatar_url || null,
      banner_url: next.banner_url || null,
    }).eq("id", uid);
    if (error) throw new Error(error.message);
  }

  async function onImage(kind: "avatar" | "banner", file: File | null) {
    if (!file) return;
    setUploading(kind);
    try {
      const url = await uploadAndSign("project-media", file, kind === "avatar" ? "avatars" : "banners");
      const next = { ...form, [kind === "avatar" ? "avatar_url" : "banner_url"]: url };
      setForm(next);
      await persist(next);
      toast.success(kind === "avatar" ? "Foto actualizada" : "Banner actualizado");
      qc.invalidateQueries({ queryKey: ["me"] });
    } catch (e: any) {
      toast.error(e.message ?? "Error al subir");
    } finally {
      setUploading(null);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await persist(form);
      toast.success("Perfil actualizado");
      qc.invalidateQueries({ queryKey: ["me"] });
    } catch (err: any) { toast.error(err.message ?? "Error"); }
  }

  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 6) return toast.error("Mínimo 6 caracteres");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) toast.error(error.message);
    else { toast.success("Contraseña actualizada"); setPw(""); }
  }

  async function toggleMod(modalityId: string, enabled: boolean) {
    const uid = me.data?.profile?.id;
    if (!uid) return;
    try {
      if (enabled) {
        const { error } = await supabase.from("user_modalities").insert({ user_id: uid, modality_id: modalityId });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_modalities").delete().eq("user_id", uid).eq("modality_id", modalityId);
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["me"] });
    } catch (e: any) { toast.error(e.message); }
  }

  const myMods = new Set((me.data?.modalities ?? []).map((m: any) => m?.name).filter(Boolean));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <Helmet><title>Mi cuenta — NLab</title></Helmet>
      <h1 className="text-2xl font-bold tracking-tight">Mi cuenta</h1>
      <p className="text-sm text-muted-foreground">Gestiona tu perfil, modalidades y contraseña.</p>

      <div className="mt-6 overflow-hidden rounded-2xl border bg-card">
        <div className="h-32 bg-gradient-to-br from-primary/30 to-primary/5"
          style={form.banner_url ? { backgroundImage: `url(${form.banner_url})`, backgroundSize: "cover" } : undefined} />
        <div className="flex items-center gap-4 p-5">
          {form.avatar_url ? (
            <img src={form.avatar_url} alt="" className="-mt-14 h-20 w-20 shrink-0 rounded-2xl border-4 border-card object-cover" />
          ) : (
            <div className="-mt-14 grid h-20 w-20 shrink-0 place-items-center rounded-2xl border-4 border-card bg-primary-soft text-2xl font-bold text-primary">
              {(me.data?.profile?.display_name ?? me.data?.profile?.username ?? "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{me.data?.profile?.display_name ?? me.data?.profile?.username}</p>
            <p className="truncate text-sm text-muted-foreground">@{me.data?.profile?.username}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {me.data?.roles.map((r) => <span key={r} className="rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary">{r}</span>)}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={save} className="mt-6 space-y-4 rounded-2xl border bg-card p-6">
        <h2 className="font-semibold">Editar perfil</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-sm font-medium">Nombre a mostrar</span>
            <input className="input" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></label>
          <div className="block">
            <span className="mb-1 block text-sm font-medium">Foto de perfil</span>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-accent">
              {uploading === "avatar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {form.avatar_url ? "Cambiar foto" : "Subir foto"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onImage("avatar", e.target.files?.[0] ?? null)} />
            </label>
            {form.avatar_url && <img src={form.avatar_url} alt="" className="mt-2 h-16 w-16 rounded-lg border object-cover" />}
          </div>
          <div className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium">Banner</span>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-accent">
              {uploading === "banner" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {form.banner_url ? "Cambiar banner" : "Subir banner"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onImage("banner", e.target.files?.[0] ?? null)} />
            </label>
            {form.banner_url && <img src={form.banner_url} alt="" className="mt-2 h-24 w-full rounded-lg border object-cover" />}
          </div>
          <label className="block sm:col-span-2"><span className="mb-1 block text-sm font-medium">Biografía</span>
            <textarea rows={3} className="input" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></label>
        </div>
        <div className="flex justify-end">
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Save className="h-4 w-4" /> Guardar</button>
        </div>
      </form>

      <div className="mt-6 rounded-2xl border bg-card p-6">
        <h2 className="font-semibold">Mis modalidades</h2>
        <p className="text-sm text-muted-foreground">Selecciona las que dominas.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {mods.data?.map((m: any) => {
            const active = myMods.has(m.name);
            return (
              <button key={m.id} type="button" onClick={() => toggleMod(m.id, !active)}
                className={`rounded-full border px-3 py-1 text-xs ${active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
                {m.name}
              </button>
            );
          })}
        </div>
      </div>

      <MySocials uid={me.data?.profile?.id} />

      <div className="mt-6 rounded-2xl border bg-card p-6">
        <h2 className="font-semibold">Ajustes</h2>
        <p className="mb-3 text-sm text-muted-foreground">Apariencia de la web.</p>
        <ThemeToggle />
      </div>

      <form onSubmit={changePw} className="mt-6 rounded-2xl border bg-card p-6">
        <h2 className="flex items-center gap-2 font-semibold"><KeyRound className="h-4 w-4" /> Cambiar contraseña</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <input type="password" className="input flex-1 min-w-[220px]" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Nueva contraseña" />
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Actualizar</button>
        </div>
      </form>

      <div className="mt-6 rounded-2xl border bg-card p-6">
        <h2 className="flex items-center gap-2 font-semibold"><FolderKanban className="h-4 w-4" /> Tus proyectos</h2>
        <p className="text-sm text-muted-foreground">Toca un proyecto para editarlo.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {myProjects.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">Todavía no has creado ningún proyecto.</p>
          )}
          {myProjects.data?.map((p: any) => (
            <Link key={p.id} to={`/projects/${p.id}/edit`}
              className="group flex items-center gap-3 rounded-xl border bg-background p-3 transition hover:border-primary hover:shadow-soft">
              <div className="h-12 w-16 shrink-0 rounded-lg bg-gradient-to-br from-primary/30 to-primary/5"
                style={p.thumbnail_url ? { backgroundImage: `url(${p.thumbnail_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="truncate text-xs text-muted-foreground">{p.status} · {p.progress}%</p>
              </div>
              <Pencil className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border bg-card p-6">
        <h2 className="flex items-center gap-2 font-semibold"><Inbox className="h-4 w-4" /> Solicitudes de entrada</h2>
        <p className="text-sm text-muted-foreground">Acepta o rechaza a quienes quieren unirse a tus proyectos.</p>
        <div className="mt-4 space-y-2">
          {joinRequests.isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
          {!joinRequests.isLoading && (joinRequests.data?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">No hay solicitudes pendientes.</p>
          )}
          {joinRequests.data?.map((r: any) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border bg-background p-3">
              {r.profile?.avatar_url ? (
                <img src={r.profile.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-sm font-bold text-primary">
                  {(r.profile?.display_name ?? r.profile?.username ?? "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {r.profile?.display_name ?? r.profile?.username ?? "Usuario"}
                  <span className="text-muted-foreground"> → {r.project?.name ?? "Proyecto"}</span>
                </p>
                {r.message && <p className="truncate text-xs text-muted-foreground">"{r.message}"</p>}
              </div>
              <button onClick={() => respondRequest(r, true)}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                <Check className="h-3.5 w-3.5" /> Aceptar
              </button>
              <button onClick={() => respondRequest(r, false)}
                className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-accent">
                <X className="h-3.5 w-3.5" /> Rechazar
              </button>
            </div>
          ))}
        </div>
      </div>

      <style>{`.input{width:100%;border:1px solid var(--color-border);background:var(--color-background);border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem;outline:none}.input:focus{border-color:var(--color-primary)}`}</style>

      <DeleteAccountCard />
    </div>
  );
}

/* ---------------- MIS REDES SOCIALES ---------------- */
function MySocials({ uid }: { uid: string | undefined }) {
  const qc = useQueryClient();
  const types = useSocialTypes();
  const mine = useQuery({
    queryKey: ["my-socials", uid],
    enabled: !!uid,
    queryFn: async () =>
      ((await supabase.from("user_socials" as never).select("id,social_type_id,value").eq("user_id", uid!)).data ?? []) as any[],
  });
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const current: Record<string, string> = {};
  (mine.data ?? []).forEach((s: any) => (current[s.social_type_id] = s.value));

  async function saveOne(typeId: string) {
    if (!uid) return;
    const value = (drafts[typeId] ?? current[typeId] ?? "").trim();
    try {
      if (!value) {
        const { error } = await supabase.from("user_socials" as never).delete().eq("user_id", uid).eq("social_type_id", typeId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_socials" as never)
          .upsert({ user_id: uid, social_type_id: typeId, value } as never, { onConflict: "user_id,social_type_id" });
        if (error) throw error;
      }
      toast.success("Red guardada");
      qc.invalidateQueries({ queryKey: ["my-socials", uid] });
      qc.invalidateQueries({ queryKey: ["members-all"] });
    } catch (e: any) { toast.error(e.message ?? "Error"); }
  }

  return (
    <div className="mt-6 rounded-2xl border bg-card p-6">
      <h2 className="flex items-center gap-2 font-semibold"><Link2 className="h-4 w-4" /> Mis redes sociales</h2>
      <p className="text-sm text-muted-foreground">Se muestran en tu tarjeta de miembro. Deja vacío para quitarla.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {(types.data ?? []).map((t) => (
          <div key={t.id} className="flex items-center gap-2 rounded-xl border bg-background p-2">
            {t.icon_url ? (
              <img src={t.icon_url} alt="" className="h-6 w-6 shrink-0 rounded object-contain" />
            ) : (
              <div className="grid h-6 w-6 shrink-0 place-items-center rounded bg-secondary text-[10px]">{t.label[0]}</div>
            )}
            <input
              className="input flex-1"
              placeholder={t.url_prefix ? `usuario o URL (${t.label})` : `URL de ${t.label}`}
              value={drafts[t.id] ?? current[t.id] ?? ""}
              onChange={(e) => setDrafts({ ...drafts, [t.id]: e.target.value })}
            />
            <button type="button" onClick={() => saveOne(t.id)} className="rounded-lg border px-2 py-1.5 text-xs hover:bg-accent">
              <Save className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {!(types.data ?? []).length && <p className="text-sm text-muted-foreground">Aún no hay redes configuradas por el admin.</p>}
      </div>
    </div>
  );
}
