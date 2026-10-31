import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_ROLES, PROJECT_TYPES, PROJECT_STATUSES } from "@/lib/nlab-constants";
import { useState } from "react";
import { toast } from "sonner";
import { uploadAndSign } from "@/lib/storage";
import { gradientStyle, useSiteSettings, useTextOverrides } from "@/lib/site-branding";
import { useMe } from "@/spa/hooks/useMe";
import { callAdmin } from "@/spa/lib/adminApi";
import { MediaInput } from "@/spa/components/MediaInput";
import { MemberBadge, BADGE_PRESETS, DEFAULT_BADGE_GRADIENT } from "@/spa/components/MemberBadge";
import { AdminGate } from "@/spa/components/AdminGate";
import { DashboardVideoCard } from "@/spa/components/DashboardVideoCard";
import { RoomReportsCard } from "@/spa/components/RoomReportsCard";
import { KeepAliveCard } from "@/spa/components/KeepAliveCard";
import { AuthPageTab } from "@/spa/components/AuthPageTab";
import { AnnouncementsTab } from "@/spa/components/AnnouncementsTab";
import { StickersTab } from "@/spa/components/StickersTab";
import { BrandingExtras } from "@/spa/components/BrandingExtras";
import { useAdUnits, AdCodeFrame, AD_PLACEMENTS, AD_POSITIONS, type AdUnit } from "@/spa/components/AdSense";

import {
  UserPlus, KeyRound, Trash2, Shield, Dice5, Users, FolderKanban,
  Tags, Pencil, Save, X, Plus, Palette, Type, Upload, ImageIcon, Wrench, Link2, History, Sparkles, Heart, Trophy,
} from "lucide-react";

function randomPassword(len = 12) {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

type Tab = "users" | "projects" | "modalities" | "linktypes" | "deps" | "branding" | "texts" | "versions" | "credits" | "dedications" | "honors" | "difficulties" | "socials" | "texticons" | "sitelinks" | "requests" | "trophies" | "docs" | "authpage" | "announcements" | "stickers";

export default function Admin() {
  const me = useMe();
  const isAdmin = me.data?.roles.some((r) => ["founder", "owner", "administrator"].includes(r));
  const [tab, setTab] = useState<Tab>("users");


  if (!me.isLoading && !isAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 md:px-8">
        <Helmet><title>Shell — NLabs</title></Helmet>
        <div className="rounded-2xl border bg-card p-6">
          <h1 className="text-lg font-semibold">Shell está en construcción</h1>
          <p className="mt-1 text-sm text-muted-foreground">Este espacio está reservado para el administrador de NLabs, nevulex.</p>
        </div>
      </div>
    );
  }

  return (
    <AdminGate>
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <Helmet><title>Shell — NLabs</title></Helmet>

      <div className="mb-6 flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Shell · panel de administración</h1>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 rounded-xl border bg-card p-1">
        <TabBtn active={tab === "users"} onClick={() => setTab("users")} icon={<Users className="h-4 w-4" />}>Usuarios</TabBtn>
        <TabBtn active={tab === "projects"} onClick={() => setTab("projects")} icon={<FolderKanban className="h-4 w-4" />}>Proyectos</TabBtn>
        <TabBtn active={tab === "modalities"} onClick={() => setTab("modalities")} icon={<Tags className="h-4 w-4" />}>Modalidades</TabBtn>
        <TabBtn active={tab === "linktypes"} onClick={() => setTab("linktypes")} icon={<Link2 className="h-4 w-4" />}>Tipos de enlace</TabBtn>
        <TabBtn active={tab === "deps"} onClick={() => setTab("deps")} icon={<Wrench className="h-4 w-4" />}>Dependencias</TabBtn>
        <TabBtn active={tab === "branding"} onClick={() => setTab("branding")} icon={<ImageIcon className="h-4 w-4" />}>Branding</TabBtn>
        <TabBtn active={tab === "texts"} onClick={() => setTab("texts")} icon={<Type className="h-4 w-4" />}>Textos</TabBtn>
        <TabBtn active={tab === "versions"} onClick={() => setTab("versions")} icon={<History className="h-4 w-4" />}>Versiones</TabBtn>
        <TabBtn active={tab === "credits"} onClick={() => setTab("credits")} icon={<Sparkles className="h-4 w-4" />}>Créditos</TabBtn>
        <TabBtn active={tab === "difficulties"} onClick={() => setTab("difficulties")} icon={<Dice5 className="h-4 w-4" />}>Dificultades</TabBtn>
        <TabBtn active={tab === "socials"} onClick={() => setTab("socials")} icon={<Link2 className="h-4 w-4" />}>Redes sociales</TabBtn>
        <TabBtn active={tab === "texticons"} onClick={() => setTab("texticons")} icon={<ImageIcon className="h-4 w-4" />}>Iconos de texto</TabBtn>
        <TabBtn active={tab === "dedications"} onClick={() => setTab("dedications")} icon={<Heart className="h-4 w-4" />}>Dedicaciones</TabBtn>
        <TabBtn active={tab === "sitelinks"} onClick={() => setTab("sitelinks")} icon={<Link2 className="h-4 w-4" />}>LINKED</TabBtn>
        <TabBtn active={tab === "honors"} onClick={() => setTab("honors")} icon={<Trophy className="h-4 w-4" />}>Cuadro de honor</TabBtn>
        <TabBtn active={tab === "requests"} onClick={() => setTab("requests")} icon={<UserPlus className="h-4 w-4" />}>Solicitudes</TabBtn>
        <TabBtn active={tab === "announcements"} onClick={() => setTab("announcements")} icon={<Sparkles className="h-4 w-4" />}>Noticias</TabBtn>
        <TabBtn active={tab === "stickers"} onClick={() => setTab("stickers")} icon={<ImageIcon className="h-4 w-4" />}>Stickers</TabBtn>
        <TabBtn active={tab === "trophies"} onClick={() => setTab("trophies")} icon={<Trophy className="h-4 w-4" />}>Trofeos</TabBtn>
        <TabBtn active={tab === "docs"} onClick={() => setTab("docs")} icon={<Type className="h-4 w-4" />}>Documentos</TabBtn>
        <TabBtn active={tab === "authpage"} onClick={() => setTab("authpage")} icon={<KeyRound className="h-4 w-4" />}>Login</TabBtn>
      </div>

      {tab === "users" && <UsersTab />}
      {tab === "projects" && <ProjectsTab />}
      {tab === "modalities" && <ModalitiesTab />}
      {tab === "linktypes" && <LinkTypesTab />}
      {tab === "deps" && <DependencyTypesTab />}
      {tab === "branding" && <BrandingTab />}
      {tab === "texts" && <TextsTab />}
      {tab === "versions" && <VersionsTab />}
      {tab === "credits" && <CreditsTab />}
      {tab === "dedications" && <DedicationsTab />}
      {tab === "honors" && <HonorsTab />}
      {tab === "sitelinks" && <SiteLinksTab />}
      {tab === "difficulties" && <DifficultiesTab />}
      {tab === "socials" && <SocialTypesTab />}
      {tab === "texticons" && <TextIconsTab />}
      {tab === "requests" && <TeamRequestsTab />}
      {tab === "announcements" && <AnnouncementsTab />}
      {tab === "stickers" && <StickersTab />}
      {tab === "trophies" && <TrophiesTab />}
      {tab === "docs" && <DocsTab />}
      {tab === "authpage" && <AuthPageTab />}

      <style>{`.input{width:100%;border:1px solid var(--color-border);background:var(--color-background);border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem;outline:none}.input:focus{border-color:var(--color-primary)}.btn{border-radius:.5rem;padding:.375rem .625rem;font-size:.75rem;border:1px solid var(--color-border);display:inline-flex;align-items:center;gap:.25rem}.btn:hover{background:var(--color-accent)}`}</style>
    </div>
    </AdminGate>
  );
}


/* ---------------- LINKED (site_links) ---------------- */
function SiteLinksTab() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-site-links"],
    queryFn: async () => (await supabase.from("site_links" as never).select("*").order("order_index").order("created_at")).data ?? [],
  });
  const empty = { title: "", description: "", url: "", logo_url: "", banner_url: "", order_index: 100 };
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<any>(null);

  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-site-links"] }); qc.invalidateQueries({ queryKey: ["site-links"] }); };

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try { await callAdmin("createSiteLink", { ...form, order_index: Number(form.order_index) || 100 }); toast.success("Tarjeta creada"); setForm(empty); refresh(); }
    catch (err: any) { toast.error(err.message); }
  }
  async function save() {
    try {
      await callAdmin("updateSiteLink", {
        id: editing.id, title: editing.title, description: editing.description ?? "", url: editing.url,
        logo_url: editing.logo_url ?? "", banner_url: editing.banner_url ?? "",
        order_index: Number(editing.order_index) || 100,
      });
      toast.success("Guardado"); setEditing(null); refresh();
    } catch (err: any) { toast.error(err.message); }
  }
  async function remove(id: string, title: string) {
    if (!confirm(`Eliminar "${title}"?`)) return;
    try { await callAdmin("deleteSiteLink", { id }); toast.success("Eliminada"); refresh(); }
    catch (err: any) { toast.error(err.message); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <form onSubmit={create} className="h-fit space-y-3 rounded-2xl border bg-card p-5">
        <h2 className="flex items-center gap-2 font-semibold"><Plus className="h-4 w-4" /> Nueva red</h2>
        <Field label="Título"><input required className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Discord oficial" /></Field>
        <Field label="Descripción"><textarea rows={3} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Field label="Link"><input required type="url" className="input" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" /></Field>
        <Field label="Logo">
          <MediaInput value={form.logo_url} onChange={(v) => setForm({ ...form, logo_url: v })} bucket="branding" folder="linked-logos" accept="image/*" preview="image" />
        </Field>
        <Field label="Banner">
          <MediaInput value={form.banner_url} onChange={(v) => setForm({ ...form, banner_url: v })} bucket="branding" folder="linked-banners" accept="image/*" preview="image" />
        </Field>
        <Field label="Orden"><input type="number" className="input" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })} /></Field>
        <button className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground">Crear</button>
      </form>

      <div className="rounded-2xl border bg-card">
        <div className="border-b p-4"><h2 className="font-semibold">LINKED ({(q.data as any[])?.length ?? 0})</h2></div>
        <div className="divide-y">
          {(q.data as any[])?.map((l: any) => (
            <div key={l.id} className="p-4">
              {editing?.id === l.id ? (
                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="Título"><input className="input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
                    <Field label="Link"><input className="input" value={editing.url ?? ""} onChange={(e) => setEditing({ ...editing, url: e.target.value })} /></Field>
                  </div>
                  <Field label="Descripción"><textarea rows={3} className="input" value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
                  <Field label="Logo">
                    <MediaInput value={editing.logo_url ?? ""} onChange={(v) => setEditing({ ...editing, logo_url: v })} bucket="branding" folder="linked-logos" accept="image/*" preview="image" />
                  </Field>
                  <Field label="Banner">
                    <MediaInput value={editing.banner_url ?? ""} onChange={(v) => setEditing({ ...editing, banner_url: v })} bucket="branding" folder="linked-banners" accept="image/*" preview="image" />
                  </Field>
                  <Field label="Orden"><input type="number" className="input" value={editing.order_index ?? 100} onChange={(e) => setEditing({ ...editing, order_index: Number(e.target.value) })} /></Field>
                  <div className="flex gap-2">
                    <button onClick={save} className="btn"><Save className="h-3.5 w-3.5" /> Guardar</button>
                    <button onClick={() => setEditing(null)} className="btn"><X className="h-3.5 w-3.5" /> Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {l.logo_url ? <img src={l.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary"><Link2 className="h-4 w-4" /></div>}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{l.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{l.url}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(l)} className="btn"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => remove(l.id, l.title)} className="btn hover:bg-destructive hover:text-destructive-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!(q.data as any[])?.length && <p className="p-4 text-sm text-muted-foreground">Sin redes.</p>}
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, children }: any) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${active ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
      {icon}{children}
    </button>
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

/* ---------------- USERS ---------------- */
function UsersTab() {
  const qc = useQueryClient();
  const users = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const [pf, rl] = await Promise.all([
        supabase.from("profiles").select("id, username, display_name, avatar_url, bio, status, joined_at" as string).order("joined_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (pf.error || rl.error) throw new Error("load");
      const rolesByUser: Record<string, string[]> = {};
      rl.data?.forEach((r) => { (rolesByUser[r.user_id] ||= []).push(r.role); });
      return pf.data?.map((p: any) => ({ ...p, roles: rolesByUser[p.id] ?? [] }));
    },
  });

  const [form, setForm] = useState({ email: "", username: "", displayName: "", password: "", role: "member" as any });
  const [editing, setEditing] = useState<any>(null);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    try {
      await callAdmin("createUser", form);
      toast.success(`Usuario ${form.username} creado`);
      setForm({ email: "", username: "", displayName: "", password: "", role: "member" });
      qc.invalidateQueries({ queryKey: ["all-users"] });
    } catch (err: any) { toast.error(err.message); }
  }
  async function resetPw(userId: string, username: string) {
    const newPw = randomPassword();
    if (!confirm(`¿Restablecer contraseña de ${username}?\nNueva: ${newPw}`)) return;
    try { await callAdmin("resetPassword", { userId, password: newPw }); toast.success(`Contraseña: ${newPw}`); }
    catch (err: any) { toast.error(err.message); }
  }
  async function delUser(userId: string, username: string) {
    if (!confirm(`Eliminar a ${username}? Irreversible.`)) return;
    try { await callAdmin("deleteUser", { userId }); toast.success("Eliminado"); qc.invalidateQueries({ queryKey: ["all-users"] }); }
    catch (err: any) { toast.error(err.message); }
  }
  async function saveEdit() {
    try {
      await callAdmin("updateUser", {
        userId: editing.id,
        username: editing.username,
        displayName: editing.display_name ?? "",
        bio: editing.bio ?? "",
        avatarUrl: editing.avatar_url ?? "",
        status: editing.status ?? "",
        email: editing.email || undefined,
      });
      await callAdmin("setUserRoles", { userId: editing.id, roles: editing.roles.length ? editing.roles : ["member"] });
      toast.success("Usuario actualizado");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["all-users"] });
    } catch (err: any) { toast.error(err.message); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <form onSubmit={createUser} className="space-y-3 rounded-2xl border bg-card p-5 h-fit">
        <h2 className="flex items-center gap-2 font-semibold"><UserPlus className="h-4 w-4" /> Crear usuario</h2>
        <Field label="Correo"><input required type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Usuario"><input required className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="usuario_gd" /></Field>
        <Field label="Nombre a mostrar"><input className="input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></Field>
        <Field label="Contraseña">
          <div className="flex gap-2">
            <input required className="input flex-1" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button type="button" onClick={() => setForm({ ...form, password: randomPassword() })} className="rounded-lg border px-3 text-xs" title="Generar"><Dice5 className="h-4 w-4" /></button>
          </div>
        </Field>
        <Field label="Rol">
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as any })}>
            {ADMIN_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Field>
        <button className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground">Crear usuario</button>
      </form>

      <div className="rounded-2xl border bg-card">
        <div className="border-b p-4"><h2 className="font-semibold">Miembros ({users.data?.length ?? 0})</h2></div>
        <div className="divide-y">
          {users.data?.map((u) => (
            <div key={u.id} className="p-4">
              {editing?.id === u.id ? (
                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="Usuario"><input className="input" value={editing.username} onChange={(e) => setEditing({ ...editing, username: e.target.value })} /></Field>
                    <Field label="Nombre"><input className="input" value={editing.display_name ?? ""} onChange={(e) => setEditing({ ...editing, display_name: e.target.value })} /></Field>
                    <Field label="Avatar URL"><input className="input" value={editing.avatar_url ?? ""} onChange={(e) => setEditing({ ...editing, avatar_url: e.target.value })} /></Field>
                    <Field label="Estado"><input className="input" value={editing.status ?? ""} onChange={(e) => setEditing({ ...editing, status: e.target.value })} /></Field>
                    <Field label="Nuevo correo (opcional)"><input className="input" type="email" value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
                  </div>
                  <Field label="Bio"><textarea rows={2} className="input" value={editing.bio ?? ""} onChange={(e) => setEditing({ ...editing, bio: e.target.value })} /></Field>
                  <Field label="Roles">
                    <div className="flex flex-wrap gap-1">
                      {ADMIN_ROLES.map((r) => {
                        const checked = editing.roles.includes(r.value);
                        return (
                          <button type="button" key={r.value}
                            onClick={() => setEditing({ ...editing, roles: checked ? editing.roles.filter((x: string) => x !== r.value) : [...editing.roles, r.value] })}
                            className={`rounded-full border px-2 py-0.5 text-xs ${checked ? "bg-primary text-primary-foreground border-primary" : ""}`}>
                            {r.label}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => setEditing(null)} className="btn"><X className="h-3 w-3" /> Cancelar</button>
                    <button onClick={saveEdit} className="btn bg-primary text-primary-foreground border-primary"><Save className="h-3 w-3" /> Guardar</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft font-semibold text-primary">
                    {(u.display_name ?? u.username).slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.display_name ?? u.username}</p>
                    <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {u.roles.map((r: string) => <span key={r} className="rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] text-primary">{r}</span>)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditing({ ...u, email: "" })} className="btn" title="Editar"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => resetPw(u.id, u.username)} className="btn" title="Restablecer"><KeyRound className="h-3.5 w-3.5" /></button>
                    <button onClick={() => delUser(u.id, u.username)} className="btn hover:bg-destructive hover:text-destructive-foreground" title="Eliminar"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- PROJECTS ---------------- */
function ProjectsTab() {
  const qc = useQueryClient();
  const projects = useQuery({
    queryKey: ["admin-projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const [editing, setEditing] = useState<any>(null);

  async function save() {
    try {
      await callAdmin("updateProject", {
        projectId: editing.id,
        name: editing.name,
        description: editing.description ?? "",
        type: editing.type,
        status: editing.status,
        difficulty: editing.difficulty ?? "",
        progress: Number(editing.progress) || 0,
        banner_url: editing.banner_url ?? "",
      });
      toast.success("Proyecto actualizado");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-projects"] });
    } catch (err: any) { toast.error(err.message); }
  }
  async function remove(id: string, name: string) {
    if (!confirm(`Eliminar proyecto "${name}"? Irreversible.`)) return;
    try { await callAdmin("deleteProject", { projectId: id }); toast.success("Eliminado"); qc.invalidateQueries({ queryKey: ["admin-projects"] }); }
    catch (err: any) { toast.error(err.message); }
  }

  return (
    <div className="rounded-2xl border bg-card">
      <div className="border-b p-4"><h2 className="font-semibold">Proyectos ({projects.data?.length ?? 0})</h2></div>
      <div className="divide-y">
        {projects.data?.map((p: any) => (
          <div key={p.id} className="p-4">
            {editing?.id === p.id ? (
              <div className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="Nombre"><input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
                  <Field label="Dificultad"><input className="input" value={editing.difficulty ?? ""} onChange={(e) => setEditing({ ...editing, difficulty: e.target.value })} /></Field>
                  <Field label="Tipo">
                    <select className="input" value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}>
                      {PROJECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Estado">
                    <select className="input" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                      {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Progreso (%)"><input type="number" min={0} max={100} className="input" value={editing.progress} onChange={(e) => setEditing({ ...editing, progress: e.target.value })} /></Field>
                  <Field label="Banner URL"><input className="input" value={editing.banner_url ?? ""} onChange={(e) => setEditing({ ...editing, banner_url: e.target.value })} /></Field>
                </div>
                <Field label="Descripción"><textarea rows={3} className="input" value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setEditing(null)} className="btn"><X className="h-3 w-3" /> Cancelar</button>
                  <button onClick={save} className="btn bg-primary text-primary-foreground border-primary"><Save className="h-3 w-3" /> Guardar</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.type} · {p.status} · {p.progress}%</p>
                </div>
                <div className="flex gap-1">
                  <Link to={`/projects/${p.id}/edit`} className="btn" title="Editar todo"><Pencil className="h-3.5 w-3.5" /></Link>
                  <button onClick={() => setEditing(p)} className="btn" title="Edición rápida"><Wrench className="h-3.5 w-3.5" /></button>
                  <button onClick={() => remove(p.id, p.name)} className="btn hover:bg-destructive hover:text-destructive-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- MODALITIES ---------------- */
function ModalitiesTab() {
  const qc = useQueryClient();
  const mods = useQuery({
    queryKey: ["admin-modalities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("modalities").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [form, setForm] = useState({ name: "", slug: "", description: "" });
  const [editing, setEditing] = useState<any>(null);

  async function createMod(e: React.FormEvent) {
    e.preventDefault();
    try { await callAdmin("createModality", form); toast.success("Modalidad creada"); setForm({ name: "", slug: "", description: "" }); qc.invalidateQueries({ queryKey: ["admin-modalities"] }); }
    catch (err: any) { toast.error(err.message); }
  }
  async function saveMod() {
    try { await callAdmin("updateModality", { id: editing.id, name: editing.name, slug: editing.slug, description: editing.description ?? "" }); toast.success("Actualizada"); setEditing(null); qc.invalidateQueries({ queryKey: ["admin-modalities"] }); }
    catch (err: any) { toast.error(err.message); }
  }
  async function removeMod(id: string, name: string) {
    if (!confirm(`Eliminar "${name}"?`)) return;
    try { await callAdmin("deleteModality", { id }); toast.success("Eliminada"); qc.invalidateQueries({ queryKey: ["admin-modalities"] }); }
    catch (err: any) { toast.error(err.message); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <form onSubmit={createMod} className="space-y-3 rounded-2xl border bg-card p-5 h-fit">
        <h2 className="flex items-center gap-2 font-semibold"><Plus className="h-4 w-4" /> Nueva modalidad</h2>
        <Field label="Nombre"><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Slug"><input required className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} placeholder="layouter" /></Field>
        <Field label="Descripción"><textarea rows={2} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <button className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground">Crear</button>
      </form>

      <div className="rounded-2xl border bg-card">
        <div className="border-b p-4"><h2 className="font-semibold">Modalidades ({mods.data?.length ?? 0})</h2></div>
        <div className="divide-y">
          {mods.data?.map((m: any) => (
            <div key={m.id} className="p-4">
              {editing?.id === m.id ? (
                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="Nombre"><input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
                    <Field label="Slug"><input className="input" value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase() })} /></Field>
                  </div>
                  <Field label="Descripción"><textarea rows={2} className="input" value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => setEditing(null)} className="btn"><X className="h-3 w-3" /> Cancelar</button>
                    <button onClick={saveMod} className="btn bg-primary text-primary-foreground border-primary"><Save className="h-3 w-3" /> Guardar</button>
                  </div>
                </div>
              ) : (
                <ModalityRow m={m} onEdit={() => setEditing(m)} onDelete={() => removeMod(m.id, m.name)} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ModalityRow({ m, onEdit, onDelete }: { m: any; onEdit: () => void; onDelete: () => void }) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  async function onIconFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadAndSign("modality-icons", file, m.slug);
      await callAdmin("setModalityIcon", { id: m.id, icon_url: url });
      toast.success("Icono actualizado");
      qc.invalidateQueries({ queryKey: ["admin-modalities"] });
      qc.invalidateQueries({ queryKey: ["modalities"] });
      qc.invalidateQueries({ queryKey: ["members-grouped"] });
      qc.invalidateQueries({ queryKey: ["members-all"] });
    } catch (e: any) { toast.error(e.message ?? "Error"); }
    finally { setUploading(false); }
  }
  async function clearIcon() {
    try {
      await callAdmin("setModalityIcon", { id: m.id, icon_url: "" });
      toast.success("Icono eliminado");
      qc.invalidateQueries({ queryKey: ["admin-modalities"] });
    } catch (e: any) { toast.error(e.message ?? "Error"); }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {m.icon_url ? (
        <img src={m.icon_url} alt="" className="h-10 w-10 shrink-0 rounded-lg border object-cover" />
      ) : (
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border bg-secondary text-muted-foreground">
          <ImageIcon className="h-4 w-4" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{m.name}</p>
        <p className="truncate text-xs text-muted-foreground">{m.slug}{m.description ? ` · ${m.description}` : ""}</p>
      </div>
      <div className="flex gap-1">
        <label className="btn cursor-pointer" title="Subir icono">
          <Upload className={`h-3.5 w-3.5 ${uploading ? "animate-pulse" : ""}`} />
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onIconFile(e.target.files?.[0] ?? null)} />
        </label>
        {m.icon_url && (
          <button onClick={clearIcon} className="btn" title="Quitar icono"><X className="h-3.5 w-3.5" /></button>
        )}
        <button onClick={onEdit} className="btn"><Pencil className="h-3.5 w-3.5" /></button>
        <button onClick={onDelete} className="btn hover:bg-destructive hover:text-destructive-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

/* ---------------- BRANDING ---------------- */
function BrandingTab() {
  const qc = useQueryClient();
  const site = useSiteSettings();
  const [siteName, setSiteName] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);
  const current = site.data;
  const displayName = siteName || current?.site_name || "";

  async function upload(kind: "logo" | "favicon" | "preview_button", file: File | null) {
    if (!file) return;
    setBusy(kind);
    try {
      const url = await uploadAndSign("branding", file, kind);
      const key = kind === "logo" ? "logo_url" : kind === "favicon" ? "favicon_url" : "preview_button_image_url";
      await callAdmin("updateSiteSettings", { [key]: url });
      toast.success("Actualizado");
      qc.invalidateQueries({ queryKey: ["site-settings"] });
    } catch (e: any) { toast.error(e.message ?? "Error"); }
    finally { setBusy(null); }
  }
  async function clear(kind: "logo" | "favicon" | "preview_button") {
    const key = kind === "logo" ? "logo_url" : kind === "favicon" ? "favicon_url" : "preview_button_image_url";
    try { await callAdmin("updateSiteSettings", { [key]: "" }); toast.success("Eliminado"); qc.invalidateQueries({ queryKey: ["site-settings"] }); }
    catch (e: any) { toast.error(e.message ?? "Error"); }
  }
  async function saveSiteName() {
    try { await callAdmin("updateSiteSettings", { site_name: siteName }); toast.success("Guardado"); qc.invalidateQueries({ queryKey: ["site-settings"] }); }
    catch (e: any) { toast.error(e.message ?? "Error"); }
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <BrandingCard title="Logo" desc="Reemplaza la 'N' del menú lateral por tu propia imagen." url={current?.logo_url ?? null} busy={busy === "logo"} onUpload={(f) => upload("logo", f)} onClear={() => clear("logo")} />
      <BrandingCard title="Favicon" desc="Icono que aparece en la pestaña del navegador." url={current?.favicon_url ?? null} busy={busy === "favicon"} onUpload={(f) => upload("favicon", f)} onClear={() => clear("favicon")} />
      <BrandingCard title="Botón vista previa" desc="Imagen del botón para abrir la preview de video de cada proyecto." url={current?.preview_button_image_url ?? null} busy={busy === "preview_button"} onUpload={(f) => upload("preview_button", f)} onClear={() => clear("preview_button")} />
      <div className="rounded-2xl border bg-card p-5 md:col-span-3">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><Type className="h-4 w-4" /> Nombre del sitio</h2>
        <div className="flex flex-wrap gap-2">
          <input className="input flex-1 min-w-52" placeholder={current?.site_name ?? "NLab"} value={displayName} onChange={(e) => setSiteName(e.target.value)} />
          <button onClick={saveSiteName} className="btn bg-primary text-primary-foreground border-primary"><Save className="h-3.5 w-3.5" /> Guardar</button>
        </div>
      </div>
      <BrandingExtras />
      <KeepAliveCard />
      <DashboardVideoCard />
      <RoomReportsCard />
      <AdsCard />
    </div>
  );
}

/* ---------------- ADSTERRA ---------------- */
function AdsCard() {
  const qc = useQueryClient();
  const units = useAdUnits();
  const [draft, setDraft] = useState<Record<string, Partial<AdUnit>>>({});
  const [newUnit, setNewUnit] = useState<Partial<AdUnit>>({ name: "", code: "", placement: "dashboard", position: "bottom", order_index: 100 });

  const refresh = () => qc.invalidateQueries({ queryKey: ["ad-units"] });

  async function run(action: string, payload: Record<string, unknown>, msg: string) {
    try {
      await callAdmin(action, payload);
      toast.success(msg);
      refresh();
    } catch (e: any) { toast.error(e.message ?? "Error"); }
  }

  const list = units.data ?? [];

  return (
    <div className="rounded-2xl border bg-card p-5 md:col-span-3">
      <h2 className="mb-1 flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4" /> Anuncios (Adsterra)</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        En Adsterra crea un banner (Websites → Add Ad Unit), copia el código que te dan y pégalo aquí. Elige en qué
        página aparece y si va arriba o abajo del contenido. Siempre se muestra con la etiqueta "Publicidad".
      </p>

      {/* nuevo bloque */}
      <div className="rounded-xl border bg-secondary/30 p-4">
        <p className="mb-2 text-sm font-medium">Nuevo bloque</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Field label="Nombre">
            <input className="input" placeholder="Banner 728x90" value={newUnit.name ?? ""} onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })} />
          </Field>
          <Field label="Página">
            <select className="input" value={newUnit.placement} onChange={(e) => setNewUnit({ ...newUnit, placement: e.target.value })}>
              {AD_PLACEMENTS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          </Field>
          <Field label="Posición">
            <select className="input" value={newUnit.position} onChange={(e) => setNewUnit({ ...newUnit, position: e.target.value })}>
              {AD_POSITIONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Código de Adsterra">
          <textarea className="input min-h-24 font-mono text-xs" placeholder="<script ...></script>" value={newUnit.code ?? ""} onChange={(e) => setNewUnit({ ...newUnit, code: e.target.value })} />
        </Field>
        <button
          className="btn mt-2 bg-primary text-primary-foreground border-primary"
          onClick={async () => {
            if (!newUnit.name?.trim() || !newUnit.code?.trim()) return toast.error("Falta nombre o código");
            await run("createAdUnit", { ...newUnit, network: "adsterra", enabled: true }, "Bloque creado");
            setNewUnit({ name: "", code: "", placement: "dashboard", position: "bottom", order_index: 100 });
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Añadir bloque
        </button>
      </div>

      {/* existentes */}
      <div className="mt-4 space-y-3">
        {list.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay bloques de anuncios.</p>}
        {list.map((u) => {
          const d = { ...u, ...draft[u.id] };
          const set = (patch: Partial<AdUnit>) => setDraft({ ...draft, [u.id]: { ...draft[u.id], ...patch } });
          return (
            <div key={u.id} className="rounded-xl border p-4">
              <div className="grid gap-2 sm:grid-cols-4">
                <Field label="Nombre"><input className="input" value={d.name} onChange={(e) => set({ name: e.target.value })} /></Field>
                <Field label="Página">
                  <select className="input" value={d.placement} onChange={(e) => set({ placement: e.target.value })}>
                    {AD_PLACEMENTS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                  </select>
                </Field>
                <Field label="Posición">
                  <select className="input" value={d.position} onChange={(e) => set({ position: e.target.value })}>
                    {AD_POSITIONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                  </select>
                </Field>
                <Field label="Orden"><input type="number" className="input" value={d.order_index} onChange={(e) => set({ order_index: Number(e.target.value) })} /></Field>
              </div>
              <Field label="Código de Adsterra">
                <textarea className="input min-h-24 font-mono text-xs" value={d.code} onChange={(e) => set({ code: e.target.value })} />
              </Field>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button className="btn bg-primary text-primary-foreground border-primary" onClick={() => run("updateAdUnit", { id: u.id, name: d.name, code: d.code, placement: d.placement, position: d.position, order_index: d.order_index }, "Guardado")}>
                  <Save className="h-3.5 w-3.5" /> Guardar
                </button>
                <button className={`btn ${d.enabled ? "bg-emerald-600 text-white border-emerald-600" : ""}`} onClick={() => run("updateAdUnit", { id: u.id, enabled: !d.enabled }, d.enabled ? "Desactivado" : "Activado")}>
                  {d.enabled ? "Activo" : "Inactivo"}
                </button>
                <button className="btn hover:bg-destructive hover:text-destructive-foreground" onClick={() => run("deleteAdUnit", { id: u.id }, "Eliminado")}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {d.code?.trim() && (
                <div className="mt-3 rounded-lg border bg-secondary/30 p-3">
                  <p className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Vista previa</p>
                  <AdCodeFrame code={d.code} className="text-center" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BrandingCard({ title, desc, url, busy, onUpload, onClear }: { title: string; desc: string; url: string | null; busy: boolean; onUpload: (f: File | null) => void; onClear: () => void }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
      <div className="mt-4 grid h-32 place-items-center overflow-hidden rounded-lg border bg-secondary/40">
        {url ? <img src={url} alt={title} className="max-h-full max-w-full object-contain" /> : <ImageIcon className="h-8 w-8 text-muted-foreground" />}
      </div>
      <div className="mt-3 flex gap-2">
        <label className="btn flex-1 cursor-pointer justify-center">
          <Upload className="h-3.5 w-3.5" /> {busy ? "Subiendo…" : url ? "Reemplazar" : "Subir"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onUpload(e.target.files?.[0] ?? null)} />
        </label>
        {url && <button onClick={onClear} className="btn hover:bg-destructive hover:text-destructive-foreground"><Trash2 className="h-3.5 w-3.5" /></button>}
      </div>
    </div>
  );
}

/* ---------------- TEXTS ---------------- */
const KNOWN_TEXT_KEYS: { key: string; label: string; defaultValue: string }[] = [
  { key: "brand.name", label: "Nombre en la barra lateral", defaultValue: "NLab" },
  { key: "brand.tagline", label: "Subtítulo en la barra lateral", defaultValue: "Collab Studio" },
  { key: "dashboard.title", label: "Título del dashboard", defaultValue: "Inicio" },
  { key: "dashboard.subtitle", label: "Subtítulo del dashboard", defaultValue: "Bienvenido a NLab" },
  { key: "auth.title", label: "Título de la página de login", defaultValue: "NLab" },
  { key: "auth.subtitle", label: "Subtítulo del login", defaultValue: "Plataforma privada para equipos GD" },
];

function TextsTab() {
  const qc = useQueryClient();
  const overrides = useTextOverrides();
  const [customKey, setCustomKey] = useState("");

  const allKeys = [
    ...KNOWN_TEXT_KEYS,
    ...Object.keys(overrides.data ?? {})
      .filter((k) => !KNOWN_TEXT_KEYS.find((x) => x.key === k))
      .map((k) => ({ key: k, label: k, defaultValue: "" })),
  ];

  async function save(key: string, value: string, gradient: any) {
    try { await callAdmin("upsertTextOverride", { key, value, gradient }); toast.success("Guardado"); qc.invalidateQueries({ queryKey: ["text-overrides"] }); }
    catch (e: any) { toast.error(e.message ?? "Error"); }
  }
  async function remove(key: string) {
    try { await callAdmin("deleteTextOverride", { key }); toast.success("Restablecido"); qc.invalidateQueries({ queryKey: ["text-overrides"] }); }
    catch (e: any) { toast.error(e.message ?? "Error"); }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-primary-soft/30 p-4 text-sm text-muted-foreground">
        Edita cualquier texto de la web y aplícale un degradado opcional.
      </div>
      <div className="rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          <input className="input flex-1 min-w-52" placeholder="nueva-clave (opcional)" value={customKey} onChange={(e) => setCustomKey(e.target.value)} />
          <button className="btn" onClick={() => { if (customKey) { save(customKey, "Nuevo texto", null); setCustomKey(""); } }}>
            <Plus className="h-3.5 w-3.5" /> Añadir clave
          </button>
        </div>
      </div>
      <div className="grid gap-3">
        {allKeys.map((k) => (
          <TextRow key={k.key} k={k} value={overrides.data?.[k.key]} onSave={save} onRemove={remove} />
        ))}
      </div>
    </div>
  );
}

function TextRow({ k, value, onSave, onRemove }: { k: { key: string; label: string; defaultValue: string }; value: { value: string; gradient: any } | undefined; onSave: (key: string, value: string, gradient: any) => void; onRemove: (key: string) => void; }) {
  const [text, setText] = useState(value?.value ?? k.defaultValue);
  const [grad, setGrad] = useState<{ from: string; to: string; direction: string } | null>(value?.gradient ?? null);

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{k.label}</p>
          <p className="text-[10px] font-mono text-muted-foreground">{k.key}</p>
        </div>
        <div className="text-xs text-muted-foreground">Vista previa: <span className="text-base font-semibold" style={gradientStyle(grad) ?? undefined}>{text || k.defaultValue}</span></div>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto]">
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={k.defaultValue} />
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={!!grad} onChange={(e) => setGrad(e.target.checked ? { from: "#6366f1", to: "#ec4899", direction: "to right" } : null)} />
          <Palette className="h-3.5 w-3.5" /> Degradado
        </label>
        {grad && (
          <>
            <input type="color" value={grad.from} onChange={(e) => setGrad({ ...grad, from: e.target.value })} className="h-9 w-12 rounded border" />
            <input type="color" value={grad.to} onChange={(e) => setGrad({ ...grad, to: e.target.value })} className="h-9 w-12 rounded border" />
          </>
        )}
        <div className="flex gap-1">
          <button onClick={() => onSave(k.key, text, grad)} className="btn bg-primary text-primary-foreground border-primary"><Save className="h-3 w-3" /> Guardar</button>
          {value && <button onClick={() => onRemove(k.key)} className="btn" title="Restablecer"><X className="h-3 w-3" /></button>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- LINK TYPES ---------------- */
function LinkTypesTab() {
  const qc = useQueryClient();
  const types = useQuery({
    queryKey: ["admin-link-types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("link_types" as any).select("*").order("order_index");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const [form, setForm] = useState({ slug: "", label: "", order_index: 100 });

  async function createType(e: React.FormEvent) {
    e.preventDefault();
    try { await callAdmin("createLinkType", form); toast.success("Tipo creado"); setForm({ slug: "", label: "", order_index: 100 }); qc.invalidateQueries({ queryKey: ["admin-link-types"] }); qc.invalidateQueries({ queryKey: ["link-types"] }); }
    catch (err: any) { toast.error(err.message); }
  }
  async function removeType(id: string, label: string) {
    if (!confirm(`Eliminar "${label}"?`)) return;
    try { await callAdmin("deleteLinkType", { id }); toast.success("Eliminado"); qc.invalidateQueries({ queryKey: ["admin-link-types"] }); qc.invalidateQueries({ queryKey: ["link-types"] }); }
    catch (err: any) { toast.error(err.message); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <form onSubmit={createType} className="space-y-3 rounded-2xl border bg-card p-5 h-fit">
        <h2 className="flex items-center gap-2 font-semibold"><Plus className="h-4 w-4" /> Nuevo tipo de enlace</h2>
        <Field label="Etiqueta"><input required className="input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Spotify" /></Field>
        <Field label="Slug"><input required className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} placeholder="spotify" /></Field>
        <Field label="Orden"><input type="number" className="input" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })} /></Field>
        <button className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground">Crear</button>
        <p className="text-xs text-muted-foreground">El icono se sube después de crear el tipo.</p>
      </form>
      <div className="rounded-2xl border bg-card">
        <div className="border-b p-4"><h2 className="font-semibold">Tipos de enlace ({types.data?.length ?? 0})</h2></div>
        <div className="divide-y">
          {types.data?.map((t: any) => (
            <div key={t.id} className="p-4">
              <IconTypeRow t={t} action="updateLinkType" onDelete={() => removeType(t.id, t.label)} onChanged={() => { qc.invalidateQueries({ queryKey: ["admin-link-types"] }); qc.invalidateQueries({ queryKey: ["link-types"] }); }} folder="link-icons" icon={<Link2 className="h-4 w-4" />} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- DEPENDENCY TYPES ---------------- */
function DependencyTypesTab() {
  const qc = useQueryClient();
  const types = useQuery({
    queryKey: ["admin-dep-types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dependency_types" as any).select("*").order("order_index");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const [form, setForm] = useState({ slug: "", label: "", order_index: 100 });

  async function createType(e: React.FormEvent) {
    e.preventDefault();
    try { await callAdmin("createDependencyType", form); toast.success("Dependencia creada"); setForm({ slug: "", label: "", order_index: 100 }); qc.invalidateQueries({ queryKey: ["admin-dep-types"] }); qc.invalidateQueries({ queryKey: ["dep-types"] }); }
    catch (err: any) { toast.error(err.message); }
  }
  async function removeType(id: string, label: string) {
    if (!confirm(`Eliminar "${label}"?`)) return;
    try { await callAdmin("deleteDependencyType", { id }); toast.success("Eliminado"); qc.invalidateQueries({ queryKey: ["admin-dep-types"] }); qc.invalidateQueries({ queryKey: ["dep-types"] }); }
    catch (err: any) { toast.error(err.message); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <form onSubmit={createType} className="space-y-3 rounded-2xl border bg-card p-5 h-fit">
        <h2 className="flex items-center gap-2 font-semibold"><Plus className="h-4 w-4" /> Nueva dependencia</h2>
        <Field label="Etiqueta"><input required className="input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Mega Hitbox" /></Field>
        <Field label="Slug"><input required className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} placeholder="mega-hitbox" /></Field>
        <Field label="Orden"><input type="number" className="input" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })} /></Field>
        <button className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground">Crear</button>
      </form>
      <div className="rounded-2xl border bg-card">
        <div className="border-b p-4"><h2 className="font-semibold">Dependencias ({types.data?.length ?? 0})</h2></div>
        <div className="divide-y">
          {types.data?.map((t: any) => (
            <div key={t.id} className="p-4">
              <IconTypeRow t={t} action="updateDependencyType" onDelete={() => removeType(t.id, t.label)} onChanged={() => { qc.invalidateQueries({ queryKey: ["admin-dep-types"] }); qc.invalidateQueries({ queryKey: ["dep-types"] }); }} folder="dep-icons" icon={<Wrench className="h-4 w-4" />} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IconTypeRow({ t, action, onDelete, onChanged, folder, icon }: { t: any; action: string; onDelete: () => void; onChanged: () => void; folder: string; icon: React.ReactNode }) {
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ label: t.label, slug: t.slug, order_index: t.order_index, icon_url: t.icon_url ?? "" });

  async function onIconFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadAndSign("branding", file, `${folder}/${t.slug}`);
      await callAdmin(action, { id: t.id, icon_url: url });
      toast.success("Icono actualizado"); onChanged();
    } catch (e: any) { toast.error(e.message ?? "Error"); }
    finally { setUploading(false); }
  }
  async function clearIcon() {
    try { await callAdmin(action, { id: t.id, icon_url: "" }); toast.success("Icono eliminado"); onChanged(); }
    catch (e: any) { toast.error(e.message ?? "Error"); }
  }
  async function save() {
    try { await callAdmin(action, { id: t.id, label: draft.label, slug: draft.slug, order_index: draft.order_index, icon_url: draft.icon_url }); toast.success("Guardado"); setEditing(false); onChanged(); }
    catch (e: any) { toast.error(e.message ?? "Error"); }
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <div className="grid gap-2 sm:grid-cols-3">
          <Field label="Etiqueta"><input className="input" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} /></Field>
          <Field label="Slug"><input className="input" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase() })} /></Field>
          <Field label="Orden"><input type="number" className="input" value={draft.order_index} onChange={(e) => setDraft({ ...draft, order_index: Number(e.target.value) })} /></Field>
        </div>
        <Field label="Imagen / icono">
          <MediaInput value={draft.icon_url} onChange={(v) => setDraft({ ...draft, icon_url: v })} bucket="branding" folder={folder} accept="image/*" preview="image" />
        </Field>
        <div className="flex justify-end gap-2">
          <button onClick={() => setEditing(false)} className="btn"><X className="h-3 w-3" /> Cancelar</button>
          <button onClick={save} className="btn bg-primary text-primary-foreground border-primary"><Save className="h-3 w-3" /> Guardar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {t.icon_url ? (
        <img src={t.icon_url} alt="" className="h-10 w-10 shrink-0 rounded-lg border object-cover" />
      ) : (
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border bg-secondary text-muted-foreground">{icon}</div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{t.label}</p>
        <p className="truncate text-xs text-muted-foreground">{t.slug} · orden {t.order_index}</p>
      </div>
      <div className="flex gap-1">
        <label className="btn cursor-pointer" title="Subir icono">
          <Upload className={`h-3.5 w-3.5 ${uploading ? "animate-pulse" : ""}`} />
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onIconFile(e.target.files?.[0] ?? null)} />
        </label>
        {t.icon_url && <button onClick={clearIcon} className="btn" title="Quitar icono"><X className="h-3.5 w-3.5" /></button>}
        <button onClick={() => setEditing(true)} className="btn"><Pencil className="h-3.5 w-3.5" /></button>
        <button onClick={onDelete} className="btn hover:bg-destructive hover:text-destructive-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

/* ---------------- VERSIONS ---------------- */
function VersionsTab() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-versions"],
    queryFn: async () => (await supabase.from("site_versions" as never).select("*").order("order_index").order("released_at", { ascending: false })).data ?? [],
  });
  const [form, setForm] = useState({ version: "", released_at: "", notes: "", order_index: 100 });
  const [editing, setEditing] = useState<any>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try { await callAdmin("createVersion", form); toast.success("Versión añadida"); setForm({ version: "", released_at: "", notes: "", order_index: 100 }); qc.invalidateQueries({ queryKey: ["admin-versions"] }); qc.invalidateQueries({ queryKey: ["site-versions"] }); }
    catch (e: any) { toast.error(e.message); }
  }
  async function save() {
    try { await callAdmin("updateVersion", { id: editing.id, version: editing.version, released_at: editing.released_at ?? "", notes: editing.notes ?? "", order_index: Number(editing.order_index) || 100 }); toast.success("Guardado"); setEditing(null); qc.invalidateQueries({ queryKey: ["admin-versions"] }); qc.invalidateQueries({ queryKey: ["site-versions"] }); }
    catch (e: any) { toast.error(e.message); }
  }
  async function remove(id: string, v: string) {
    if (!confirm(`Eliminar versión "${v}"?`)) return;
    try { await callAdmin("deleteVersion", { id }); toast.success("Eliminada"); qc.invalidateQueries({ queryKey: ["admin-versions"] }); qc.invalidateQueries({ queryKey: ["site-versions"] }); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <form onSubmit={create} className="space-y-3 rounded-2xl border bg-card p-5 h-fit">
        <h2 className="flex items-center gap-2 font-semibold"><Plus className="h-4 w-4" /> Nueva versión</h2>
        <Field label="Versión"><input required className="input" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="v1.2" /></Field>
        <Field label="Fecha"><input type="date" className="input" value={form.released_at} onChange={(e) => setForm({ ...form, released_at: e.target.value })} /></Field>
        <Field label="Notas"><textarea rows={4} className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        <Field label="Orden"><input type="number" className="input" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })} /></Field>
        <button className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground">Crear</button>
      </form>
      <div className="rounded-2xl border bg-card">
        <div className="border-b p-4"><h2 className="font-semibold">Versiones ({(q.data as any[])?.length ?? 0})</h2></div>
        <div className="divide-y">
          {(q.data as any[])?.map((v) => (
            <div key={v.id} className="p-4">
              {editing?.id === v.id ? (
                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Field label="Versión"><input className="input" value={editing.version} onChange={(e) => setEditing({ ...editing, version: e.target.value })} /></Field>
                    <Field label="Fecha"><input type="date" className="input" value={editing.released_at ?? ""} onChange={(e) => setEditing({ ...editing, released_at: e.target.value })} /></Field>
                    <Field label="Orden"><input type="number" className="input" value={editing.order_index ?? 100} onChange={(e) => setEditing({ ...editing, order_index: e.target.value })} /></Field>
                  </div>
                  <Field label="Notas"><textarea rows={4} className="input" value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></Field>
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => setEditing(null)} className="btn"><X className="h-3 w-3" /> Cancelar</button>
                    <button onClick={save} className="btn bg-primary text-primary-foreground border-primary"><Save className="h-3 w-3" /> Guardar</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{v.version} {v.released_at && <span className="ml-2 text-xs font-normal text-muted-foreground">{new Date(v.released_at).toLocaleDateString()}</span>}</p>
                    {v.notes && <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">{v.notes}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(v)} className="btn"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => remove(v.id, v.version)} className="btn hover:bg-destructive hover:text-destructive-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- CREDITS ---------------- */
function CreditsTab() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-credits"],
    queryFn: async () => (await supabase.from("site_credits" as never).select("*").order("order_index").order("name")).data ?? [],
  });
  const [form, setForm] = useState<{ name: string; role: string; url: string; image_url: string; order_index: number }>({ name: "", role: "", url: "", image_url: "", order_index: 100 });
  const [editing, setEditing] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadImage(file: File | null, target: "new" | "edit") {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadAndSign("branding", file, "credits");
      if (target === "new") setForm((s) => ({ ...s, image_url: url }));
      else setEditing((s: any) => ({ ...s, image_url: url }));
      toast.success("Imagen subida");
    } catch (e: any) { toast.error(e.message ?? "Error"); }
    finally { setUploading(false); }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try { await callAdmin("createCredit", form); toast.success("Crédito añadido"); setForm({ name: "", role: "", url: "", image_url: "", order_index: 100 }); qc.invalidateQueries({ queryKey: ["admin-credits"] }); qc.invalidateQueries({ queryKey: ["site-credits"] }); }
    catch (e: any) { toast.error(e.message); }
  }
  async function save() {
    try { await callAdmin("updateCredit", { id: editing.id, name: editing.name, role: editing.role ?? "", url: editing.url ?? "", image_url: editing.image_url ?? "", order_index: Number(editing.order_index) || 100 }); toast.success("Guardado"); setEditing(null); qc.invalidateQueries({ queryKey: ["admin-credits"] }); qc.invalidateQueries({ queryKey: ["site-credits"] }); }
    catch (e: any) { toast.error(e.message); }
  }
  async function remove(id: string, name: string) {
    if (!confirm(`Eliminar crédito "${name}"?`)) return;
    try { await callAdmin("deleteCredit", { id }); toast.success("Eliminado"); qc.invalidateQueries({ queryKey: ["admin-credits"] }); qc.invalidateQueries({ queryKey: ["site-credits"] }); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <form onSubmit={create} className="space-y-3 rounded-2xl border bg-card p-5 h-fit">
        <h2 className="flex items-center gap-2 font-semibold"><Plus className="h-4 w-4" /> Nuevo crédito</h2>
        <Field label="Nombre"><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Rol"><input className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Diseñador, host, etc." /></Field>
        <Field label="URL (opcional)"><input type="url" className="input" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></Field>
        <Field label="Imagen">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-3 text-sm hover:bg-accent">
            <Upload className={`h-4 w-4 ${uploading ? "animate-pulse" : ""}`} /> Subir
            <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(e.target.files?.[0] ?? null, "new")} />
          </label>
          {form.image_url && <img src={form.image_url} alt="" className="mt-2 h-16 w-16 rounded-lg border object-cover" />}
        </Field>
        <Field label="Orden"><input type="number" className="input" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })} /></Field>
        <button className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground">Crear</button>
      </form>
      <div className="rounded-2xl border bg-card">
        <div className="border-b p-4"><h2 className="font-semibold">Créditos ({(q.data as any[])?.length ?? 0})</h2></div>
        <div className="divide-y">
          {(q.data as any[])?.map((c) => (
            <div key={c.id} className="p-4">
              {editing?.id === c.id ? (
                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="Nombre"><input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
                    <Field label="Rol"><input className="input" value={editing.role ?? ""} onChange={(e) => setEditing({ ...editing, role: e.target.value })} /></Field>
                    <Field label="URL"><input className="input" value={editing.url ?? ""} onChange={(e) => setEditing({ ...editing, url: e.target.value })} /></Field>
                    <Field label="Orden"><input type="number" className="input" value={editing.order_index ?? 100} onChange={(e) => setEditing({ ...editing, order_index: e.target.value })} /></Field>
                  </div>
                  <Field label="Imagen">
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-3 text-sm hover:bg-accent">
                      <Upload className={`h-4 w-4 ${uploading ? "animate-pulse" : ""}`} /> Reemplazar
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(e.target.files?.[0] ?? null, "edit")} />
                    </label>
                    {editing.image_url && <img src={editing.image_url} alt="" className="mt-2 h-16 w-16 rounded-lg border object-cover" />}
                  </Field>
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => setEditing(null)} className="btn"><X className="h-3 w-3" /> Cancelar</button>
                    <button onClick={save} className="btn bg-primary text-primary-foreground border-primary"><Save className="h-3 w-3" /> Guardar</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  {c.image_url ? (
                    <img src={c.image_url} alt="" className="h-12 w-12 shrink-0 rounded-lg border object-cover" />
                  ) : (
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border bg-secondary text-muted-foreground"><ImageIcon className="h-4 w-4" /></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.role ?? "—"}{c.url ? ` · ${c.url}` : ""}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(c)} className="btn"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => remove(c.id, c.name)} className="btn hover:bg-destructive hover:text-destructive-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
/* ---------------- DEDICATIONS ---------------- */
function DedicationsTab() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-dedications"],
    queryFn: async () => (await supabase.from("site_dedications" as never).select("*").order("order_index").order("created_at")).data ?? [],
  });
  const empty = { title: "", target_name: "", message: "", url: "", image_url: "", order_index: 100 };
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadImage(file: File | null, target: "new" | "edit") {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadAndSign("branding", file, "dedications");
      if (target === "new") setForm((s: any) => ({ ...s, image_url: url }));
      else setEditing((s: any) => ({ ...s, image_url: url }));
      toast.success("Imagen subida");
    } catch (e: any) { toast.error(e.message ?? "Error"); }
    finally { setUploading(false); }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try { await callAdmin("createDedication", form); toast.success("Dedicación añadida"); setForm(empty); qc.invalidateQueries({ queryKey: ["admin-dedications"] }); qc.invalidateQueries({ queryKey: ["site-dedications"] }); }
    catch (e: any) { toast.error(e.message); }
  }
  async function save() {
    try { await callAdmin("updateDedication", { id: editing.id, title: editing.title, target_name: editing.target_name ?? "", message: editing.message ?? "", url: editing.url ?? "", image_url: editing.image_url ?? "", order_index: Number(editing.order_index) || 100 }); toast.success("Guardado"); setEditing(null); qc.invalidateQueries({ queryKey: ["admin-dedications"] }); qc.invalidateQueries({ queryKey: ["site-dedications"] }); }
    catch (e: any) { toast.error(e.message); }
  }
  async function remove(id: string, name: string) {
    if (!confirm(`Eliminar dedicación "${name}"?`)) return;
    try { await callAdmin("deleteDedication", { id }); toast.success("Eliminada"); qc.invalidateQueries({ queryKey: ["admin-dedications"] }); qc.invalidateQueries({ queryKey: ["site-dedications"] }); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <form onSubmit={create} className="space-y-3 rounded-2xl border bg-card p-5 h-fit">
        <h2 className="flex items-center gap-2 font-semibold"><Plus className="h-4 w-4" /> Nueva dedicación</h2>
        <Field label="Título"><input required className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Dedicada a"><input className="input" value={form.target_name} onChange={(e) => setForm({ ...form, target_name: e.target.value })} placeholder="Nombre o @usuario" /></Field>
        <Field label="Mensaje"><textarea rows={4} className="input" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
        <Field label="URL (opcional)"><input type="url" className="input" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></Field>
        <Field label="Imagen">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-3 text-sm hover:bg-accent">
            <Upload className={`h-4 w-4 ${uploading ? "animate-pulse" : ""}`} /> Subir
            <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(e.target.files?.[0] ?? null, "new")} />
          </label>
          {form.image_url && <img src={form.image_url} alt="" className="mt-2 h-16 w-16 rounded-lg border object-cover" />}
        </Field>
        <Field label="Orden"><input type="number" className="input" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })} /></Field>
        <button className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground">Crear</button>
      </form>
      <div className="rounded-2xl border bg-card">
        <div className="border-b p-4"><h2 className="font-semibold">Dedicaciones ({(q.data as any[])?.length ?? 0})</h2></div>
        <div className="divide-y">
          {(q.data as any[])?.map((d) => (
            <div key={d.id} className="p-4">
              {editing?.id === d.id ? (
                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="Título"><input className="input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
                    <Field label="Dedicada a"><input className="input" value={editing.target_name ?? ""} onChange={(e) => setEditing({ ...editing, target_name: e.target.value })} /></Field>
                    <Field label="URL"><input className="input" value={editing.url ?? ""} onChange={(e) => setEditing({ ...editing, url: e.target.value })} /></Field>
                    <Field label="Orden"><input type="number" className="input" value={editing.order_index ?? 100} onChange={(e) => setEditing({ ...editing, order_index: e.target.value })} /></Field>
                  </div>
                  <Field label="Mensaje"><textarea rows={4} className="input" value={editing.message ?? ""} onChange={(e) => setEditing({ ...editing, message: e.target.value })} /></Field>
                  <Field label="Imagen">
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-3 text-sm hover:bg-accent">
                      <Upload className={`h-4 w-4 ${uploading ? "animate-pulse" : ""}`} /> Reemplazar
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(e.target.files?.[0] ?? null, "edit")} />
                    </label>
                    {editing.image_url && <img src={editing.image_url} alt="" className="mt-2 h-16 w-16 rounded-lg border object-cover" />}
                  </Field>
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => setEditing(null)} className="btn"><X className="h-3 w-3" /> Cancelar</button>
                    <button onClick={save} className="btn bg-primary text-primary-foreground border-primary"><Save className="h-3 w-3" /> Guardar</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-start gap-3">
                  {d.image_url ? (
                    <img src={d.image_url} alt="" className="h-12 w-12 shrink-0 rounded-lg border object-cover" />
                  ) : (
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border bg-secondary text-muted-foreground"><Heart className="h-4 w-4" /></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{d.target_name ? `Para ${d.target_name}` : "—"}</p>
                    {d.message && <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">{d.message}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(d)} className="btn"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => remove(d.id, d.title)} className="btn hover:bg-destructive hover:text-destructive-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- DIFFICULTY LEVELS ---------------- */
function HonorsTab() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-honors"],
    queryFn: async () => (await supabase.from("site_honors" as never).select("*").order("order_index").order("created_at")).data ?? [],
  });
  const empty = { name: "", role: "", reason: "", url: "", image_url: "", kind: "memorable", order_index: 100 };
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<any>(null);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-honors"] });
    qc.invalidateQueries({ queryKey: ["site-honors"] });
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    try { await callAdmin("createHonor", form); toast.success("Añadido al cuadro de honor"); setForm(empty); refresh(); }
    catch (e: any) { toast.error(e.message); }
  }
  async function save() {
    try {
      await callAdmin("updateHonor", {
        id: editing.id, name: editing.name, role: editing.role ?? "", reason: editing.reason ?? "",
        url: editing.url ?? "", image_url: editing.image_url ?? "", kind: editing.kind ?? "memorable",
        order_index: Number(editing.order_index) || 100,
      });
      toast.success("Guardado"); setEditing(null); refresh();
    } catch (e: any) { toast.error(e.message); }
  }
  async function remove(id: string, name: string) {
    if (!confirm(`Quitar a "${name}" del cuadro de honor?`)) return;
    try { await callAdmin("deleteHonor", { id }); toast.success("Eliminado"); refresh(); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <form onSubmit={create} className="space-y-3 rounded-2xl border bg-card p-5 h-fit">
        <h2 className="flex items-center gap-2 font-semibold"><Plus className="h-4 w-4" /> Nuevo jugador</h2>
        <Field label="Nombre"><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Rol / título"><input className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Ej. Ex-host, Layouter" /></Field>
        <Field label="Categoría">
          <select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            <option value="memorable">Jugador memorable</option>
            <option value="retirado">Retirado del team</option>
          </select>
        </Field>
        <Field label="Motivo / mensaje"><textarea rows={4} className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
        <Field label="URL (opcional)"><input type="url" className="input" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></Field>
        <Field label="Imagen">
          <MediaInput value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} bucket="branding" folder="honors" accept="image/*" />
        </Field>
        <Field label="Orden"><input type="number" className="input" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })} /></Field>
        <button className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground">Crear</button>
      </form>
      <div className="rounded-2xl border bg-card">
        <div className="border-b p-4"><h2 className="font-semibold">Cuadro de honor ({(q.data as any[])?.length ?? 0})</h2></div>
        <div className="divide-y">
          {(q.data as any[])?.map((h) => (
            <div key={h.id} className="p-4">
              {editing?.id === h.id ? (
                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="Nombre"><input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
                    <Field label="Rol / título"><input className="input" value={editing.role ?? ""} onChange={(e) => setEditing({ ...editing, role: e.target.value })} /></Field>
                    <Field label="Categoría">
                      <select className="input" value={editing.kind ?? "memorable"} onChange={(e) => setEditing({ ...editing, kind: e.target.value })}>
                        <option value="memorable">Jugador memorable</option>
                        <option value="retirado">Retirado del team</option>
                      </select>
                    </Field>
                    <Field label="URL"><input className="input" value={editing.url ?? ""} onChange={(e) => setEditing({ ...editing, url: e.target.value })} /></Field>
                    <Field label="Orden"><input type="number" className="input" value={editing.order_index ?? 100} onChange={(e) => setEditing({ ...editing, order_index: e.target.value })} /></Field>
                  </div>
                  <Field label="Motivo / mensaje"><textarea rows={4} className="input" value={editing.reason ?? ""} onChange={(e) => setEditing({ ...editing, reason: e.target.value })} /></Field>
                  <Field label="Imagen">
                    <MediaInput value={editing.image_url ?? ""} onChange={(v) => setEditing({ ...editing, image_url: v })} bucket="branding" folder="honors" accept="image/*" />
                  </Field>
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => setEditing(null)} className="btn"><X className="h-3 w-3" /> Cancelar</button>
                    <button onClick={save} className="btn bg-primary text-primary-foreground border-primary"><Save className="h-3 w-3" /> Guardar</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-start gap-3">
                  {h.image_url ? (
                    <img src={h.image_url} alt="" className="h-12 w-12 shrink-0 rounded-lg border object-cover" />
                  ) : (
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border bg-secondary text-muted-foreground"><Trophy className="h-4 w-4" /></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{h.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {h.kind === "retirado" ? "Retirado del team" : "Jugador memorable"}{h.role ? ` · ${h.role}` : ""}
                    </p>
                    {h.reason && <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">{h.reason}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(h)} className="btn"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => remove(h.id, h.name)} className="btn hover:bg-destructive hover:text-destructive-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DifficultiesTab() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-difficulties"],
    queryFn: async () => (await supabase.from("difficulty_levels" as never).select("*").order("order_index")).data ?? [],
  });
  const [form, setForm] = useState({ slug: "", label: "", color: "", icon_url: "", order_index: 100 });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-difficulties"] }); qc.invalidateQueries({ queryKey: ["difficulty-levels"] }); };

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try { await callAdmin("createDifficulty", form); toast.success("Dificultad creada"); setForm({ slug: "", label: "", color: "", icon_url: "", order_index: 100 }); refresh(); }
    catch (err: any) { toast.error(err.message); }
  }
  async function remove(id: string, label: string) {
    if (!confirm(`Eliminar "${label}"?`)) return;
    try { await callAdmin("deleteDifficulty", { id }); toast.success("Eliminada"); refresh(); }
    catch (err: any) { toast.error(err.message); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <form onSubmit={create} className="h-fit space-y-3 rounded-2xl border bg-card p-5">
        <h2 className="flex items-center gap-2 font-semibold"><Plus className="h-4 w-4" /> Nueva dificultad</h2>
        <Field label="Etiqueta"><input required className="input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Extreme Demon" /></Field>
        <Field label="Slug"><input required className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} placeholder="extreme-demon" /></Field>
        <Field label="Color (hex opcional)"><input className="input" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="#ef4444" /></Field>
        <Field label="Imagen / icono">
          <MediaInput value={form.icon_url} onChange={(v) => setForm({ ...form, icon_url: v })} bucket="branding" folder="difficulty-icons" accept="image/*" preview="image" />
        </Field>
        <Field label="Orden"><input type="number" className="input" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })} /></Field>
        <button className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground">Crear</button>
      </form>
      <div className="rounded-2xl border bg-card">
        <div className="border-b p-4"><h2 className="font-semibold">Dificultades ({q.data?.length ?? 0})</h2></div>
        <div className="divide-y">
          {(q.data as any[])?.map((t: any) => (
            <div key={t.id} className="p-4">
              <IconTypeRow t={t} action="updateDifficulty" onDelete={() => remove(t.id, t.label)} onChanged={refresh} folder="difficulty-icons" icon={<Dice5 className="h-4 w-4" />} />
            </div>
          ))}
          {!(q.data as any[])?.length && <p className="p-4 text-sm text-muted-foreground">Sin dificultades.</p>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- SOCIAL TYPES ---------------- */
function SocialTypesTab() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-social-types"],
    queryFn: async () => (await supabase.from("social_types" as never).select("*").order("order_index")).data ?? [],
  });
  const [form, setForm] = useState({ slug: "", label: "", url_prefix: "", order_index: 100 });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-social-types"] }); qc.invalidateQueries({ queryKey: ["social-types"] }); };

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try { await callAdmin("createSocialType", form); toast.success("Red creada"); setForm({ slug: "", label: "", url_prefix: "", order_index: 100 }); refresh(); }
    catch (err: any) { toast.error(err.message); }
  }
  async function remove(id: string, label: string) {
    if (!confirm(`Eliminar "${label}"?`)) return;
    try { await callAdmin("deleteSocialType", { id }); toast.success("Eliminada"); refresh(); }
    catch (err: any) { toast.error(err.message); }
  }
  async function savePrefix(id: string, url_prefix: string) {
    try { await callAdmin("updateSocialType", { id, url_prefix }); toast.success("Guardado"); refresh(); }
    catch (err: any) { toast.error(err.message); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <form onSubmit={create} className="h-fit space-y-3 rounded-2xl border bg-card p-5">
        <h2 className="flex items-center gap-2 font-semibold"><Plus className="h-4 w-4" /> Nueva red social</h2>
        <Field label="Etiqueta"><input required className="input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="YouTube" /></Field>
        <Field label="Slug"><input required className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} placeholder="youtube" /></Field>
        <Field label="Prefijo de URL"><input className="input" value={form.url_prefix} onChange={(e) => setForm({ ...form, url_prefix: e.target.value })} placeholder="https://youtube.com/@" /></Field>
        <Field label="Orden"><input type="number" className="input" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })} /></Field>
        <button className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground">Crear</button>
      </form>
      <div className="rounded-2xl border bg-card">
        <div className="border-b p-4"><h2 className="font-semibold">Redes sociales ({q.data?.length ?? 0})</h2></div>
        <div className="divide-y">
          {(q.data as any[])?.map((t: any) => (
            <div key={t.id} className="space-y-2 p-4">
              <IconTypeRow t={t} action="updateSocialType" onDelete={() => remove(t.id, t.label)} onChanged={refresh} folder="social-icons" icon={<Link2 className="h-4 w-4" />} />
              <PrefixEditor value={t.url_prefix ?? ""} onSave={(v) => savePrefix(t.id, v)} />
            </div>
          ))}
          {!(q.data as any[])?.length && <p className="p-4 text-sm text-muted-foreground">Sin redes sociales.</p>}
        </div>
      </div>
    </div>
  );
}

function PrefixEditor({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  return (
    <div className="flex items-center gap-2">
      <input className="input flex-1" value={v} onChange={(e) => setV(e.target.value)} placeholder="Prefijo de URL, ej. https://youtube.com/@" />
      <button onClick={() => onSave(v)} className="btn"><Save className="h-3.5 w-3.5" /> Guardar</button>
    </div>
  );
}

/* ---------------- TEXT ICONS ---------------- */
function TextIconsTab() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-text-icons"],
    queryFn: async () => (await supabase.from("text_icons" as never).select("*").order("key")).data ?? [],
  });
  const [key, setKey] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-text-icons"] }); qc.invalidateQueries({ queryKey: ["text-icons"] }); };

  async function onFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    try { setImageUrl(await uploadAndSign("branding", file, `text-icons/${key || "icon"}`)); }
    catch (e: any) { toast.error(e.message ?? "Error"); }
    finally { setBusy(false); }
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    const clean = key.replace(/^#/, "").trim().toLowerCase();
    if (!clean || !imageUrl) return toast.error("Falta la clave o la imagen");
    try { await callAdmin("createTextIcon", { key: clean, image_url: imageUrl }); toast.success("Icono creado"); setKey(""); setImageUrl(""); refresh(); }
    catch (err: any) { toast.error(err.message); }
  }
  async function remove(id: string, k: string) {
    if (!confirm(`Eliminar "#${k}"?`)) return;
    try { await callAdmin("deleteTextIcon", { id }); toast.success("Eliminado"); refresh(); }
    catch (err: any) { toast.error(err.message); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <form onSubmit={create} className="h-fit space-y-3 rounded-2xl border bg-card p-5">
        <h2 className="flex items-center gap-2 font-semibold"><Plus className="h-4 w-4" /> Nuevo icono de texto</h2>
        <p className="text-xs text-muted-foreground">Escribe <code>#clave</code> en notas de versiones o dedicaciones y se mostrará la mini imagen.</p>
        <Field label="Clave (sin #)"><input required className="input" value={key} onChange={(e) => setKey(e.target.value.replace(/^#/, "").toLowerCase())} placeholder="geode" /></Field>
        <Field label="Imagen (URL)"><input className="input" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" /></Field>
        <label className="btn w-full cursor-pointer justify-center">
          <Upload className={`h-3.5 w-3.5 ${busy ? "animate-pulse" : ""}`} /> Subir desde el dispositivo
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        </label>
        {imageUrl && <img src={imageUrl} alt="" className="h-12 w-12 rounded border object-contain" />}
        <button className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground">Crear</button>
      </form>
      <div className="rounded-2xl border bg-card">
        <div className="border-b p-4"><h2 className="font-semibold">Iconos de texto ({q.data?.length ?? 0})</h2></div>
        <div className="divide-y">
          {(q.data as any[])?.map((t: any) => (
            <div key={t.id} className="flex items-center gap-3 p-4">
              <img src={t.image_url} alt="" className="h-10 w-10 rounded border object-contain" />
              <p className="flex-1 text-sm font-medium">#{t.key}</p>
              <button onClick={() => remove(t.id, t.key)} className="btn hover:bg-destructive hover:text-destructive-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {!(q.data as any[])?.length && <p className="p-4 text-sm text-muted-foreground">Sin iconos.</p>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- SOLICITUDES DE TEAM ---------------- */
function TeamRequestsTab() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-team-requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_requests" as never)
        .select("*, modalities(name)")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as any[];
      const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
      let profiles: Record<string, any> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles")
          .select("id, username, display_name, badge_label, badge_gradient")
          .in("id", ids);
        profiles = Object.fromEntries(((profs ?? []) as any[]).map((p) => [p.id, p]));
      }
      return rows.map((r) => ({ ...r, profiles: profiles[r.user_id] ?? null }));
    },
  });

  const [badge, setBadge] = useState<Record<string, { label: string; from: string; to: string }>>({});

  const rowsById: Record<string, any> = Object.fromEntries((q.data ?? []).map((r: any) => [r.id, r]));
  function cfg(id: string) {
    const pr = rowsById[id]?.profiles;
    return badge[id] ?? {
      label: pr?.badge_label ?? "Miembro",
      from: pr?.badge_gradient?.from ?? DEFAULT_BADGE_GRADIENT.from,
      to: pr?.badge_gradient?.to ?? DEFAULT_BADGE_GRADIENT.to,
    };
  }
  function setCfg(id: string, patch: any) {
    setBadge((b) => ({ ...b, [id]: { ...cfg(id), ...patch } }));
  }
  async function saveBadge(r: any) {
    const c = cfg(r.id);
    try {
      await callAdmin("setUserBadge", { userId: r.user_id, badge_label: c.label, badge_gradient: { from: c.from, to: c.to } });
      toast.success("Insignia actualizada");
      qc.invalidateQueries({ queryKey: ["admin-team-requests"] });
      qc.invalidateQueries({ queryKey: ["members-all"] });
      qc.invalidateQueries({ queryKey: ["members-grouped"] });
    } catch (e: any) { toast.error(e.message); }
  }

  async function review(r: any, status: "approved" | "rejected") {
    const c = cfg(r.id);
    try {
      await callAdmin("reviewTeamRequest", {
        id: r.id, status,
        badge_label: c.label,
        badge_gradient: { from: c.from, to: c.to },
      });
      toast.success(status === "approved" ? "Solicitud aprobada" : "Solicitud rechazada");
      qc.invalidateQueries({ queryKey: ["admin-team-requests"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="rounded-2xl border bg-card">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="font-semibold">Solicitudes ({(q.data ?? []).length})</h2>
        <button className="btn" onClick={() => q.refetch()}>Recargar</button>
      </div>
      {q.isLoading && <p className="p-4 text-sm text-muted-foreground">Cargando solicitudes…</p>}
      {q.isError && <p className="p-4 text-sm text-destructive">Error al cargar: {(q.error as Error).message}</p>}
      <div className="divide-y">
        {(q.data ?? []).map((r) => {

          const c = cfg(r.id);
          return (
            <div key={r.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{r.username}</p>
                <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">{r.status}</span>
                {r.modalities?.name && <span className="text-xs text-muted-foreground">· {r.modalities.name}</span>}
                {r.playtime && <span className="text-xs text-muted-foreground">· {r.playtime}</span>}
                <MemberBadge label={r.profiles?.badge_label} gradient={r.profiles?.badge_gradient} />
              </div>
              {r.reason && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{r.reason}</p>}
              {(r.status === "pending" || r.status === "approved") && (
                <div className="flex flex-wrap items-end gap-2">
                  <Field label="Insignia"><input className="input" value={c.label} onChange={(e) => setCfg(r.id, { label: e.target.value })} /></Field>
                  <Field label="Degradado">
                    <div className="flex items-center gap-2">
                      <input type="color" className="h-9 w-10 rounded border" value={c.from} onChange={(e) => setCfg(r.id, { from: e.target.value })} />
                      <input type="color" className="h-9 w-10 rounded border" value={c.to} onChange={(e) => setCfg(r.id, { to: e.target.value })} />
                      <select className="input" value="" onChange={(e) => {
                        const p = BADGE_PRESETS.find((x) => x.label === e.target.value);
                        if (p) setCfg(r.id, p.value);
                      }}>
                        <option value="">Presets…</option>
                        {BADGE_PRESETS.map((p) => <option key={p.label} value={p.label}>{p.label}</option>)}
                      </select>
                    </div>
                  </Field>
                  <MemberBadge label={c.label} gradient={{ from: c.from, to: c.to }} />
                  {r.status === "approved" ? (
                    <div className="ml-auto flex gap-2">
                      <button onClick={() => saveBadge(r)} className="btn bg-primary text-primary-foreground border-primary">Guardar insignia</button>
                    </div>
                  ) : (
                  <div className="ml-auto flex gap-2">
                    <button onClick={() => review(r, "rejected")} className="btn hover:bg-destructive hover:text-destructive-foreground">Rechazar</button>
                    <button onClick={() => review(r, "approved")} className="btn bg-primary text-primary-foreground border-primary">Aprobar</button>
                  </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {!q.isLoading && !q.isError && (q.data ?? []).length === 0 && <p className="p-4 text-sm text-muted-foreground">No hay solicitudes.</p>}
      </div>
    </div>
  );
}

/* ---------------- TROFEOS ---------------- */
function TrophiesTab() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-trophies"],
    queryFn: async () => ((await supabase.from("site_trophies" as never).select("*").order("order_index")).data ?? []) as any[],
  });
  const empty = { title: "", description: "", image_url: "", url: "", awarded_to: "", awarded_at: "", order_index: 100 };
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<any>(null);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-trophies"] });
    qc.invalidateQueries({ queryKey: ["site-trophies"] });
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    try { await callAdmin("createTrophy", form); toast.success("Trofeo creado"); setForm(empty); refresh(); }
    catch (e: any) { toast.error(e.message); }
  }
  async function save() {
    try {
      await callAdmin("updateTrophy", {
        id: editing.id, title: editing.title, description: editing.description ?? "",
        image_url: editing.image_url ?? "", url: editing.url ?? "", awarded_to: editing.awarded_to ?? "",
        awarded_at: editing.awarded_at ?? "", order_index: Number(editing.order_index) || 100,
      });
      toast.success("Guardado"); setEditing(null); refresh();
    } catch (e: any) { toast.error(e.message); }
  }
  async function remove(id: string, title: string) {
    if (!confirm(`Eliminar "${title}"?`)) return;
    try { await callAdmin("deleteTrophy", { id }); toast.success("Eliminado"); refresh(); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <form onSubmit={create} className="space-y-3 rounded-2xl border bg-card p-5 h-fit">
        <h2 className="flex items-center gap-2 font-semibold"><Plus className="h-4 w-4" /> Nuevo trofeo</h2>
        <Field label="Título"><input required className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Descripción"><textarea rows={3} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Field label="Otorgado a"><input className="input" value={form.awarded_to} onChange={(e) => setForm({ ...form, awarded_to: e.target.value })} /></Field>
        <Field label="Fecha"><input type="date" className="input" value={form.awarded_at} onChange={(e) => setForm({ ...form, awarded_at: e.target.value })} /></Field>
        <Field label="URL (opcional)"><input type="url" className="input" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></Field>
        <Field label="Imagen"><MediaInput value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} bucket="branding" folder="trophies" accept="image/*" /></Field>
        <Field label="Orden"><input type="number" className="input" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })} /></Field>
        <button className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground">Crear</button>
      </form>
      <div className="rounded-2xl border bg-card">
        <div className="border-b p-4"><h2 className="font-semibold">Trofeos ({(q.data ?? []).length})</h2></div>
        <div className="divide-y">
          {(q.data ?? []).map((t) => (
            <div key={t.id} className="p-4">
              {editing?.id === t.id ? (
                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="Título"><input className="input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
                    <Field label="Otorgado a"><input className="input" value={editing.awarded_to ?? ""} onChange={(e) => setEditing({ ...editing, awarded_to: e.target.value })} /></Field>
                    <Field label="Fecha"><input type="date" className="input" value={editing.awarded_at ?? ""} onChange={(e) => setEditing({ ...editing, awarded_at: e.target.value })} /></Field>
                    <Field label="URL"><input className="input" value={editing.url ?? ""} onChange={(e) => setEditing({ ...editing, url: e.target.value })} /></Field>
                    <Field label="Orden"><input type="number" className="input" value={editing.order_index ?? 100} onChange={(e) => setEditing({ ...editing, order_index: e.target.value })} /></Field>
                  </div>
                  <Field label="Descripción"><textarea rows={3} className="input" value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
                  <Field label="Imagen"><MediaInput value={editing.image_url ?? ""} onChange={(v) => setEditing({ ...editing, image_url: v })} bucket="branding" folder="trophies" accept="image/*" /></Field>
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => setEditing(null)} className="btn"><X className="h-3 w-3" /> Cancelar</button>
                    <button onClick={save} className="btn bg-primary text-primary-foreground border-primary"><Save className="h-3 w-3" /> Guardar</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-start gap-3">
                  {t.image_url ? <img src={t.image_url} alt="" className="h-12 w-12 rounded-lg border object-cover" />
                    : <div className="grid h-12 w-12 place-items-center rounded-lg border bg-secondary text-muted-foreground"><Trophy className="h-4 w-4" /></div>}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{[t.awarded_to, t.awarded_at].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(t)} className="btn"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => remove(t.id, t.title)} className="btn hover:bg-destructive hover:text-destructive-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- DOCUMENTOS (markdown) ---------------- */
function DocsTab() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-docs"],
    queryFn: async () => ((await supabase.from("site_docs" as never).select("*").order("order_index")).data ?? []) as any[],
  });
  const empty = { slug: "", title: "", content_md: "", order_index: 100 };
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<any>(null);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-docs"] });
    qc.invalidateQueries({ queryKey: ["site-docs"] });
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    try { await callAdmin("createDoc", form); toast.success("Documento creado"); setForm(empty); refresh(); }
    catch (e: any) { toast.error(e.message); }
  }
  async function save() {
    try {
      await callAdmin("updateDoc", {
        id: editing.id, slug: editing.slug, title: editing.title,
        content_md: editing.content_md ?? "", order_index: Number(editing.order_index) || 100,
      });
      toast.success("Guardado"); setEditing(null); refresh();
    } catch (e: any) { toast.error(e.message); }
  }
  async function remove(id: string, title: string) {
    if (!confirm(`Eliminar "${title}"?`)) return;
    try { await callAdmin("deleteDoc", { id }); toast.success("Eliminado"); refresh(); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <form onSubmit={create} className="space-y-3 rounded-2xl border bg-card p-5 h-fit">
        <h2 className="flex items-center gap-2 font-semibold"><Plus className="h-4 w-4" /> Nuevo documento</h2>
        <Field label="Slug (URL)"><input required className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="terminos" /></Field>
        <Field label="Título"><input required className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Contenido (markdown)"><textarea rows={10} className="input font-mono text-xs" value={form.content_md} onChange={(e) => setForm({ ...form, content_md: e.target.value })} /></Field>
        <Field label="Orden"><input type="number" className="input" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })} /></Field>
        <button className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground">Crear</button>
      </form>
      <div className="rounded-2xl border bg-card">
        <div className="border-b p-4"><h2 className="font-semibold">Documentos ({(q.data ?? []).length})</h2></div>
        <div className="divide-y">
          {(q.data ?? []).map((d) => (
            <div key={d.id} className="p-4">
              {editing?.id === d.id ? (
                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Field label="Slug"><input className="input" value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></Field>
                    <Field label="Título"><input className="input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
                    <Field label="Orden"><input type="number" className="input" value={editing.order_index ?? 100} onChange={(e) => setEditing({ ...editing, order_index: e.target.value })} /></Field>
                  </div>
                  <Field label="Contenido (markdown)"><textarea rows={14} className="input font-mono text-xs" value={editing.content_md ?? ""} onChange={(e) => setEditing({ ...editing, content_md: e.target.value })} /></Field>
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => setEditing(null)} className="btn"><X className="h-3 w-3" /> Cancelar</button>
                    <button onClick={save} className="btn bg-primary text-primary-foreground border-primary"><Save className="h-3 w-3" /> Guardar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.title}</p>
                    <p className="truncate text-xs text-muted-foreground">/docs/{d.slug}</p>
                  </div>
                  <button onClick={() => setEditing(d)} className="btn"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => remove(d.id, d.title)} className="btn hover:bg-destructive hover:text-destructive-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
